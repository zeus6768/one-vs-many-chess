package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/zeus/one-vs-many-chess/game"
	"github.com/zeus/one-vs-many-chess/manager"
	"github.com/zeus/one-vs-many-chess/types"
)

// Options configures the WebSocket server.
type Options struct {
	GracePeriodMs int // default 30000
	VoteTimeoutMs int // default 30000
}

// Server is the composition root for the WebSocket game server.
type Server struct {
	hub      *Hub
	gm       *manager.GameManager
	upgrader websocket.Upgrader
	roomMu   sync.Map // roomID → *sync.Mutex (per-room lock)
	opts     Options
}

// NewServer creates a new WebSocket game server.
func NewServer(opts Options) *Server {
	if opts.GracePeriodMs <= 0 {
		opts.GracePeriodMs = 30000
	}
	if opts.VoteTimeoutMs <= 0 {
		opts.VoteTimeoutMs = 30000
	}
	return &Server{
		hub: NewHub(),
		gm:  manager.New(opts.VoteTimeoutMs),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
		opts: opts,
	}
}

// ServeHTTP upgrades HTTP connections to WebSocket and starts the read loop.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ws, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("websocket upgrade error: %v", err)
		return
	}

	socketID := fmt.Sprintf("%p", ws)
	conn := &Conn{ws: ws, id: socketID}
	s.hub.Register(conn)
	log.Printf("client connected: %s", socketID)

	defer func() {
		s.hub.Unregister(socketID)
		ws.Close()
		s.handleDisconnect(socketID)
	}()

	for {
		_, raw, err := ws.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("read error %s: %v", socketID, err)
			}
			break
		}

		var msg struct {
			Event string          `json:"event"`
			Data  json.RawMessage `json:"data"`
		}
		if err := json.Unmarshal(raw, &msg); err != nil {
			log.Printf("parse error %s: %v", socketID, err)
			continue
		}

		s.dispatch(socketID, msg.Event, msg.Data)
	}
}

// dispatch routes incoming events to their handlers.
func (s *Server) dispatch(socketID, event string, data json.RawMessage) {
	switch event {
	case "register":
		var sessionID string
		if err := json.Unmarshal(data, &sessionID); err != nil {
			return
		}
		s.handleRegister(socketID, sessionID)

	case "getRooms":
		s.handleGetRooms(socketID)

	case "createRoom":
		var payload struct {
			RoomName   string `json:"roomName"`
			PlayerName string `json:"playerName"`
		}
		if err := json.Unmarshal(data, &payload); err != nil {
			return
		}
		s.handleCreateRoom(socketID, payload.RoomName, payload.PlayerName)

	case "joinRoom":
		var payload struct {
			RoomID     string `json:"roomId"`
			PlayerName string `json:"playerName"`
		}
		if err := json.Unmarshal(data, &payload); err != nil {
			return
		}
		s.handleJoinRoom(socketID, payload.RoomID, payload.PlayerName)

	case "leaveRoom":
		s.handleLeaveRoom(socketID)

	case "setHostColor":
		var color types.HostColorPreference
		if err := json.Unmarshal(data, &color); err != nil {
			return
		}
		s.handleSetHostColor(socketID, color)

	case "startGame":
		s.handleStartGame(socketID)

	case "makeMove":
		var move types.ChessMove
		if err := json.Unmarshal(data, &move); err != nil {
			return
		}
		s.handleMakeMove(socketID, move)

	default:
		log.Printf("unknown event %q from %s", event, socketID)
	}
}

// ── Session registration ──────────────────────────────────────────────────────

func (s *Server) handleRegister(socketID, sessionID string) {
	isNew, sess := s.gm.RegisterSession(sessionID, socketID)

	if !isNew && sess.RoomID != "" {
		room := s.gm.GetRoom(sess.RoomID)
		if room != nil && room.Status != "finished" {
			s.hub.JoinRoom(socketID, room.ID)

			player := types.Player{
				ID:     sess.SessionID,
				Name:   sess.PlayerName,
				IsHost: sess.IsHost,
			}

			var voteTally *types.VoteTally
			if room.Game != nil && !room.Game.IsHostTurn && room.Game.Winner == "" {
				t := room.GetVoteTally()
				voteTally = &t
			}

			gameState := gameStateToWire(room.Game)
			s.hub.SendTo(socketID, "reconnected", map[string]interface{}{
				"room":       room.ToRoomInfo(),
				"player":     player,
				"gameState":  gameState,
				"challengers": room.Challengers,
				"voteTally":  voteTally,
			})
			s.hub.BroadcastRoomExcept(room.ID, socketID, "playerReconnected", sess.SessionID)
			log.Printf("player reconnected: %s (%s)", sess.PlayerName, sess.SessionID)
			return
		}
		// Room gone during grace period — treat as fresh.
		sess.RoomID = ""
	}

	s.hub.SendTo(socketID, "sessionRegistered", sessionID)
}

// ── Room discovery ────────────────────────────────────────────────────────────

func (s *Server) handleGetRooms(socketID string) {
	s.hub.SendTo(socketID, "roomList", s.gm.GetWaitingRooms())
}

// ── Room lifecycle ────────────────────────────────────────────────────────────

func (s *Server) handleCreateRoom(socketID, roomName, playerName string) {
	sess := s.gm.GetSessionBySocketID(socketID)
	if sess == nil {
		s.hub.SendTo(socketID, "error", "세션이 없습니다. 페이지를 새로고침하세요.")
		return
	}

	sess.PlayerName = playerName
	sess.IsHost = true

	host := types.Player{ID: sess.SessionID, Name: playerName, IsHost: true}
	room := s.gm.CreateRoom(roomName, host)
	sess.RoomID = room.ID

	s.hub.JoinRoom(socketID, room.ID)
	s.hub.SendTo(socketID, "roomCreated", map[string]interface{}{
		"room":   room.ToRoomInfo(),
		"player": host,
	})
	s.hub.BroadcastAll("roomList", s.gm.GetWaitingRooms())
	log.Printf("room created: %s by %s", room.ID, playerName)
}

func (s *Server) handleJoinRoom(socketID, roomID, playerName string) {
	sess := s.gm.GetSessionBySocketID(socketID)
	if sess == nil {
		s.hub.SendTo(socketID, "error", "세션이 없습니다. 페이지를 새로고침하세요.")
		return
	}

	sess.PlayerName = playerName
	sess.IsHost = false

	player := types.Player{ID: sess.SessionID, Name: playerName, IsHost: false}
	room := s.gm.JoinRoom(roomID, player)
	if room == nil {
		s.hub.SendTo(socketID, "error", "방에 참가할 수 없습니다.")
		return
	}

	sess.RoomID = room.ID
	s.hub.JoinRoom(socketID, room.ID)
	s.hub.SendTo(socketID, "roomJoined", map[string]interface{}{
		"room":        room.ToRoomInfo(),
		"player":      player,
		"challengers": room.Challengers,
	})
	s.hub.BroadcastRoomExcept(room.ID, socketID, "playerJoined", player)
	s.hub.BroadcastAll("roomList", s.gm.GetWaitingRooms())
	log.Printf("%s joined room %s", playerName, roomID)
}

func (s *Server) handleLeaveRoom(socketID string) {
	sess := s.gm.GetSessionBySocketID(socketID)
	if sess == nil {
		return
	}
	roomID := sess.RoomID
	sess.RoomID = ""

	room := s.gm.LeaveRoom(sess.SessionID)
	if room == nil {
		s.hub.BroadcastAll("roomList", s.gm.GetWaitingRooms())
		return
	}

	s.hub.LeaveRoom(socketID, room.ID)

	if room.Host.ID == sess.SessionID {
		// Host left — disband room.
		room.ClearVoteTimer()
		s.hub.BroadcastRoom(roomID, "error", "호스트가 방을 나갔습니다.")
		s.hub.EvictRoom(roomID)
	} else {
		s.hub.BroadcastRoom(room.ID, "playerLeft", sess.SessionID)
		// If challenger leaves during voting, check for early resolution.
		s.maybeResolveEarly(room)
	}

	s.hub.BroadcastAll("roomList", s.gm.GetWaitingRooms())
	log.Printf("player left room: %s", sess.SessionID)
}

// ── Game lifecycle ────────────────────────────────────────────────────────────

func (s *Server) handleSetHostColor(socketID string, color types.HostColorPreference) {
	sess := s.gm.GetSessionBySocketID(socketID)
	if sess == nil {
		return
	}
	room := s.gm.GetRoomByPlayerID(sess.SessionID)
	if room == nil {
		return
	}
	if room.Host.ID != sess.SessionID {
		s.hub.SendTo(socketID, "error", "호스트만 색상을 변경할 수 있습니다.")
		return
	}
	if room.SetHostColor(color) {
		s.hub.BroadcastRoom(room.ID, "hostColorChanged", color)
	}
}

func (s *Server) handleStartGame(socketID string) {
	sess := s.gm.GetSessionBySocketID(socketID)
	if sess == nil {
		return
	}
	room := s.gm.GetRoomByPlayerID(sess.SessionID)
	if room == nil {
		s.hub.SendTo(socketID, "error", "방을 찾을 수 없습니다.")
		return
	}
	if room.Host.ID != sess.SessionID {
		s.hub.SendTo(socketID, "error", "호스트만 게임을 시작할 수 있습니다.")
		return
	}
	if !room.StartGame() {
		s.hub.SendTo(socketID, "error", "게임을 시작할 수 없습니다. 도전자가 필요합니다.")
		return
	}

	s.hub.BroadcastRoom(room.ID, "gameStarted", nil)
	s.hub.BroadcastRoom(room.ID, "gameState", gameStateToWire(room.Game))
	s.hub.BroadcastAll("roomList", s.gm.GetWaitingRooms())
	log.Printf("game started in room %s", room.ID)

	// If challengers go first, start vote timer immediately.
	if !room.Game.IsHostTurn {
		s.startVoteTimer(room)
	}
}

func (s *Server) handleMakeMove(socketID string, move types.ChessMove) {
	sess := s.gm.GetSessionBySocketID(socketID)
	if sess == nil {
		return
	}
	room := s.gm.GetRoomByPlayerID(sess.SessionID)
	if room == nil || room.Status != "playing" {
		s.hub.SendTo(socketID, "error", "게임이 진행 중이 아닙니다.")
		return
	}

	mu := s.getRoomMutex(room.ID)
	mu.Lock()
	defer mu.Unlock()

	isHost := room.Host.ID == sess.SessionID

	if isHost {
		if !room.Game.IsHostTurn {
			s.hub.SendTo(socketID, "error", "아직 당신의 차례가 아닙니다.")
			return
		}
		if err := room.MakeHostMove(move); err != nil {
			s.hub.SendTo(socketID, "error", "잘못된 수입니다.")
			return
		}

		lastMove := room.Game.LastMove
		s.hub.BroadcastRoom(room.ID, "hostMoved", lastMove)
		s.hub.BroadcastRoom(room.ID, "gameState", gameStateToWire(room.Game))

		if room.Game.Winner != "" {
			s.hub.BroadcastRoom(room.ID, "gameOver", map[string]string{
				"winner": room.Game.Winner,
				"reason": room.Game.WinReason,
			})
			room.Status = "finished"
			s.hub.BroadcastAll("roomList", s.gm.GetWaitingRooms())
			return
		}
		s.startVoteTimer(room)
	} else {
		// Challenger casting a vote.
		if room.Game.IsHostTurn || room.Game.Winner != "" {
			s.hub.SendTo(socketID, "error", "지금은 투표 시간이 아닙니다.")
			return
		}
		if !room.CastVote(sess.SessionID, move) {
			s.hub.SendTo(socketID, "error", "잘못된 수입니다.")
			return
		}
		s.hub.BroadcastRoom(room.ID, "voteUpdate", room.GetVoteTally())

		if room.AllVotesIn() {
			room.ClearVoteTimer()
			s.resolveAndBroadcast(room)
		}
	}
}

// ── Disconnect / grace period ─────────────────────────────────────────────────

func (s *Server) handleDisconnect(socketID string) {
	sess := s.gm.GetSessionBySocketID(socketID)
	if sess == nil {
		log.Printf("disconnected (no session): %s", socketID)
		return
	}
	sessionID := sess.SessionID
	log.Printf("client disconnected: %s — starting grace period (%dms)", sessionID, s.opts.GracePeriodMs)

	s.gm.StartGracePeriod(sessionID, func() {
		log.Printf("grace period expired: %s", sessionID)

		room := s.gm.GetRoomByPlayerID(sessionID)
		if room != nil {
			mu := s.getRoomMutex(room.ID)
			mu.Lock()

			if sess.IsHost {
				if room.Status == "playing" && room.Game != nil && room.Game.Winner == "" {
					room.ClearVoteTimer()
					room.Game.Winner = "challengers"
					room.Game.WinReason = "disconnect"
					room.Status = "finished"
					s.hub.BroadcastRoom(room.ID, "gameOver", map[string]string{
						"winner": "challengers",
						"reason": "disconnect",
					})
				}
				s.hub.BroadcastRoom(room.ID, "error", "호스트가 연결을 끊었습니다.")
				s.hub.EvictRoom(room.ID)
				mu.Unlock()
				s.gm.LeaveRoom(sessionID)
			} else {
				wasPlaying := room.Status == "playing"
				mu.Unlock()
				s.gm.LeaveRoom(sessionID)
				mu.Lock()
				s.hub.BroadcastRoom(room.ID, "playerLeft", sessionID)
				if wasPlaying && room.Game != nil && !room.Game.IsHostTurn && room.Game.Winner == "" {
					s.maybeResolveEarly(room)
				}
				mu.Unlock()
			}
		} else {
			if sess.IsHost {
				s.gm.LeaveRoom(sessionID)
			}
		}

		s.gm.DeleteSession(sessionID)
		s.hub.BroadcastAll("roomList", s.gm.GetWaitingRooms())
	}, s.opts.GracePeriodMs)
}

// ── Internal helpers ──────────────────────────────────────────────────────────

// resolveAndBroadcast tallies votes, applies the winning move, and broadcasts
// the result. Must be called while holding the room mutex.
func (s *Server) resolveAndBroadcast(room *game.GameRoom) {
	if room.Game == nil || room.Game.Winner != "" || room.Game.IsHostTurn {
		return
	}
	move, method := room.ResolveVotes()
	s.hub.BroadcastRoom(room.ID, "voteResolved", map[string]interface{}{
		"move":   move,
		"method": method,
	})
	s.hub.BroadcastRoom(room.ID, "gameState", gameStateToWire(room.Game))

	if room.Game.Winner != "" {
		s.hub.BroadcastRoom(room.ID, "gameOver", map[string]string{
			"winner": room.Game.Winner,
			"reason": room.Game.WinReason,
		})
		room.Status = "finished"
		s.hub.BroadcastAll("roomList", s.gm.GetWaitingRooms())
	}
}

// maybeResolveEarly checks if all remaining challengers have voted and resolves.
// Must be called while the room data is consistent (after challenger removal).
func (s *Server) maybeResolveEarly(room *game.GameRoom) {
	if room.Status == "playing" && room.Game != nil && !room.Game.IsHostTurn && room.Game.Winner == "" {
		if room.AllVotesIn() {
			room.ClearVoteTimer()
			s.resolveAndBroadcast(room)
		}
	}
}

// startVoteTimer starts the vote timer for the given room.
func (s *Server) startVoteTimer(room *game.GameRoom) {
	room.StartVoteTimer(func() {
		mu := s.getRoomMutex(room.ID)
		mu.Lock()
		defer mu.Unlock()
		s.resolveAndBroadcast(room)
	})
}

// getRoomMutex returns (or creates) the per-room mutex.
func (s *Server) getRoomMutex(roomID string) *sync.Mutex {
	mu, _ := s.roomMu.LoadOrStore(roomID, &sync.Mutex{})
	return mu.(*sync.Mutex)
}

// gameStateToWire converts a game.GameState to the wire format sent to clients.
func gameStateToWire(gs *game.GameState) interface{} {
	if gs == nil {
		return nil
	}
	return map[string]interface{}{
		"fen":            gs.FEN,
		"isHostTurn":     gs.IsHostTurn,
		"winner":         gs.Winner,
		"winReason":      gs.WinReason,
		"lastMove":       gs.LastMove,
		"lastMoveSan":    gs.LastMoveSAN,
		"hostColor":      gs.HostColor,
		"moveHistory":    gs.MoveHistory,
		"capturedPieces": gs.CapturedPieces,
		"isCheck":        gs.IsCheck,
		"legalMoves":     gs.LegalMoves,
	}
}
