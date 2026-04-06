package manager

import (
	"math/rand"
	"sync"
	"time"

	"github.com/zeus/one-vs-many-chess/game"
	"github.com/zeus/one-vs-many-chess/types"
)

// GameManager is the in-memory room and session registry.
// It mirrors the structure of the omok GameManager.ts.
// All public methods are safe for concurrent use.
type GameManager struct {
	mu            sync.RWMutex
	rooms         map[string]*game.GameRoom
	playerRooms   map[string]string // playerID → roomID
	sessions      map[string]*types.SessionInfo
	socketToSess  map[string]string // socketID → sessionID
	voteTimeoutMs int
}

// New creates a new GameManager.
func New(voteTimeoutMs int) *GameManager {
	if voteTimeoutMs <= 0 {
		voteTimeoutMs = game.DefaultVoteTimeoutMs
	}
	return &GameManager{
		rooms:         make(map[string]*game.GameRoom),
		playerRooms:   make(map[string]string),
		sessions:      make(map[string]*types.SessionInfo),
		socketToSess:  make(map[string]string),
		voteTimeoutMs: voteTimeoutMs,
	}
}

// ── Session management ────────────────────────────────────────────────────────

// RegisterSession registers or re-registers a session.
// Returns (isNew, session). On reconnect, the grace timer is cleared.
func (m *GameManager) RegisterSession(sessionID, socketID string) (bool, *types.SessionInfo) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if sess, ok := m.sessions[sessionID]; ok {
		// Reconnecting — cancel grace period and update socket mapping.
		if sess.GraceTimer != nil {
			sess.GraceTimer.Cancel()
			sess.GraceTimer = nil
		}
		delete(m.socketToSess, sess.SocketID)
		sess.SocketID = socketID
		m.socketToSess[socketID] = sessionID
		return false, sess
	}

	sess := &types.SessionInfo{
		SessionID: sessionID,
		SocketID:  socketID,
	}
	m.sessions[sessionID] = sess
	m.socketToSess[socketID] = sessionID
	return true, sess
}

// GetSessionBySocketID returns the session for the given socket ID.
func (m *GameManager) GetSessionBySocketID(socketID string) *types.SessionInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()
	sessionID, ok := m.socketToSess[socketID]
	if !ok {
		return nil
	}
	return m.sessions[sessionID]
}

// StartGracePeriod starts a grace period timer for the session.
// onExpired is called after ms milliseconds if the session hasn't re-registered.
func (m *GameManager) StartGracePeriod(sessionID string, onExpired func(), ms int) {
	m.mu.Lock()
	sess, ok := m.sessions[sessionID]
	if !ok {
		m.mu.Unlock()
		return
	}
	if sess.GraceTimer != nil {
		sess.GraceTimer.Cancel()
		sess.GraceTimer = nil
	}

	// Create a cancellable timer using a channel.
	done := make(chan struct{})
	cancel := func() { close(done) }
	sess.GraceTimer = types.NewTimerHandle(cancel)
	m.mu.Unlock()

	go func() {
		select {
		case <-time.After(time.Duration(ms) * time.Millisecond):
			onExpired()
		case <-done:
		}
	}()
}

// ClearSessionRoom clears a session's room association.
func (m *GameManager) ClearSessionRoom(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if sess, ok := m.sessions[sessionID]; ok {
		sess.RoomID = ""
	}
}

// DeleteSession removes a session entirely.
func (m *GameManager) DeleteSession(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	sess, ok := m.sessions[sessionID]
	if !ok {
		return
	}
	if sess.GraceTimer != nil {
		sess.GraceTimer.Cancel()
	}
	delete(m.socketToSess, sess.SocketID)
	delete(m.sessions, sessionID)
}

// ── Room management ───────────────────────────────────────────────────────────

// CreateRoom creates a new room with the given host.
func (m *GameManager) CreateRoom(roomName string, host types.Player) *game.GameRoom {
	m.mu.Lock()
	defer m.mu.Unlock()
	roomID := m.generateRoomID()
	room := game.NewGameRoom(roomID, roomName, host, m.voteTimeoutMs)
	m.rooms[roomID] = room
	m.playerRooms[host.ID] = roomID
	return room
}

// GetRoom returns the room with the given ID, or nil.
func (m *GameManager) GetRoom(roomID string) *game.GameRoom {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.rooms[roomID]
}

// GetRoomByPlayerID returns the room the player is in, or nil.
func (m *GameManager) GetRoomByPlayerID(playerID string) *game.GameRoom {
	m.mu.RLock()
	defer m.mu.RUnlock()
	roomID, ok := m.playerRooms[playerID]
	if !ok {
		return nil
	}
	return m.rooms[roomID]
}

// JoinRoom adds a challenger to an existing room.
// Returns the room on success, nil if the room doesn't exist or joining fails.
func (m *GameManager) JoinRoom(roomID string, player types.Player) *game.GameRoom {
	m.mu.Lock()
	defer m.mu.Unlock()
	room, ok := m.rooms[roomID]
	if !ok {
		return nil
	}
	if !room.AddChallenger(player) {
		return nil
	}
	m.playerRooms[player.ID] = roomID
	return room
}

// LeaveRoom removes a player from their room.
// If the host leaves, all challengers are also cleaned up and the room is deleted.
// Returns the (now-modified) room.
func (m *GameManager) LeaveRoom(playerID string) *game.GameRoom {
	m.mu.Lock()
	defer m.mu.Unlock()
	roomID, ok := m.playerRooms[playerID]
	if !ok {
		return nil
	}
	room, ok := m.rooms[roomID]
	if !ok {
		return nil
	}
	delete(m.playerRooms, playerID)

	if room.Host.ID == playerID {
		// Host left — remove all challengers and delete room.
		for _, c := range room.Challengers {
			delete(m.playerRooms, c.ID)
			if sess, ok2 := m.sessions[c.ID]; ok2 {
				sess.RoomID = ""
			}
		}
		delete(m.rooms, roomID)
	} else {
		room.RemoveChallenger(playerID)
	}
	return room
}

// DeleteRoom unconditionally removes a room and cleans up player mappings.
func (m *GameManager) DeleteRoom(roomID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	room, ok := m.rooms[roomID]
	if !ok {
		return
	}
	delete(m.playerRooms, room.Host.ID)
	for _, c := range room.Challengers {
		delete(m.playerRooms, c.ID)
	}
	delete(m.rooms, roomID)
}

// GetWaitingRooms returns all rooms with status "waiting".
func (m *GameManager) GetWaitingRooms() []types.RoomInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make([]types.RoomInfo, 0)
	for _, room := range m.rooms {
		if room.Status == "waiting" {
			result = append(result, room.ToRoomInfo())
		}
	}
	return result
}

// GetAllRooms returns all rooms.
func (m *GameManager) GetAllRooms() []types.RoomInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make([]types.RoomInfo, 0, len(m.rooms))
	for _, room := range m.rooms {
		result = append(result, room.ToRoomInfo())
	}
	return result
}

// generateRoomID returns a 6-char uppercase alphanumeric ID (no lock needed —
// called only from locked methods).
func (m *GameManager) generateRoomID() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}
