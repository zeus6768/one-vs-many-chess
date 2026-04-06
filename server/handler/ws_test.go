package handler

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

// wsMsg is the wire envelope used for both sending and receiving.
type wsMsg struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"data"`
}

// testClient dials a test server and provides helpers for sending/receiving.
type testClient struct {
	conn *websocket.Conn
}

func newTestClient(t *testing.T, srv *httptest.Server) *testClient {
	t.Helper()
	url := "ws" + strings.TrimPrefix(srv.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	return &testClient{conn: conn}
}

func (c *testClient) send(t *testing.T, event string, data interface{}) {
	t.Helper()
	raw, err := json.Marshal(data)
	if err != nil {
		t.Fatalf("marshal data: %v", err)
	}
	msg, err := json.Marshal(wsMsg{Event: event, Data: raw})
	if err != nil {
		t.Fatalf("marshal msg: %v", err)
	}
	if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
		t.Fatalf("write: %v", err)
	}
}

// readUntil reads messages until it finds one with the given event, up to a timeout.
func (c *testClient) readUntil(t *testing.T, wantEvent string) json.RawMessage {
	t.Helper()
	c.conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			t.Fatalf("read waiting for %q: %v", wantEvent, err)
		}
		var msg wsMsg
		if err := json.Unmarshal(raw, &msg); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		if msg.Event == wantEvent {
			return msg.Data
		}
	}
}

func (c *testClient) close() { c.conn.Close() }

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	srv := NewServer(Options{GracePeriodMs: 100, VoteTimeoutMs: 30000})
	ts := httptest.NewServer(srv)
	t.Cleanup(ts.Close)
	return ts
}

// ── handleJoinRoom ───────────────────────────────────────────────────────────

// TestHandleJoinRoom_ResponseIncludesChallengers verifies that when a second
// client joins a room, the roomJoined payload contains a non-empty challengers
// array that includes the joining player.
func TestHandleJoinRoom_ResponseIncludesChallengers(t *testing.T) {
	ts := newTestServer(t)

	host := newTestClient(t, ts)
	defer host.close()

	challenger := newTestClient(t, ts)
	defer challenger.close()

	// Register and create room as host.
	host.send(t, "register", "sess-host")
	host.readUntil(t, "sessionRegistered")

	host.send(t, "createRoom", map[string]string{"roomName": "TestRoom", "playerName": "Alice"})
	roomCreatedData := host.readUntil(t, "roomCreated")

	var roomCreatedPayload struct {
		Room struct {
			ID string `json:"id"`
		} `json:"room"`
	}
	if err := json.Unmarshal(roomCreatedData, &roomCreatedPayload); err != nil {
		t.Fatalf("unmarshal roomCreated: %v", err)
	}
	roomID := roomCreatedPayload.Room.ID

	// Register and join as challenger.
	challenger.send(t, "register", "sess-challenger")
	challenger.readUntil(t, "sessionRegistered")

	challenger.send(t, "joinRoom", map[string]string{"roomId": roomID, "playerName": "Bob"})
	roomJoinedData := challenger.readUntil(t, "roomJoined")

	var payload struct {
		Room struct {
			ChallengerCount int `json:"challengerCount"`
		} `json:"room"`
		Player struct {
			Name string `json:"name"`
		} `json:"player"`
		Challengers []struct {
			Name   string `json:"name"`
			IsHost bool   `json:"isHost"`
		} `json:"challengers"`
	}
	if err := json.Unmarshal(roomJoinedData, &payload); err != nil {
		t.Fatalf("unmarshal roomJoined: %v", err)
	}

	if len(payload.Challengers) == 0 {
		t.Fatal("expected challengers in roomJoined payload, got empty slice")
	}
	if payload.Challengers[0].Name != "Bob" {
		t.Errorf("expected challenger name %q, got %q", "Bob", payload.Challengers[0].Name)
	}
	if payload.Challengers[0].IsHost {
		t.Error("joining challenger should have isHost=false")
	}
}

// TestHandleJoinRoom_MultipleChallengersVisible verifies that a third client
// joining a room can see all previously joined challengers in the payload.
func TestHandleJoinRoom_MultipleChallengersVisible(t *testing.T) {
	ts := newTestServer(t)

	host := newTestClient(t, ts)
	defer host.close()
	c1 := newTestClient(t, ts)
	defer c1.close()
	c2 := newTestClient(t, ts)
	defer c2.close()

	// Host creates room.
	host.send(t, "register", "sess-h")
	host.readUntil(t, "sessionRegistered")
	host.send(t, "createRoom", map[string]string{"roomName": "R", "playerName": "Host"})
	roomCreatedData := host.readUntil(t, "roomCreated")

	var rcp struct {
		Room struct {
			ID string `json:"id"`
		} `json:"room"`
	}
	json.Unmarshal(roomCreatedData, &rcp)
	roomID := rcp.Room.ID

	// First challenger joins.
	c1.send(t, "register", "sess-c1")
	c1.readUntil(t, "sessionRegistered")
	c1.send(t, "joinRoom", map[string]string{"roomId": roomID, "playerName": "Carol"})
	c1.readUntil(t, "roomJoined")

	// Second challenger joins — should see Carol in challengers list.
	c2.send(t, "register", "sess-c2")
	c2.readUntil(t, "sessionRegistered")
	c2.send(t, "joinRoom", map[string]string{"roomId": roomID, "playerName": "Dave"})
	data := c2.readUntil(t, "roomJoined")

	var payload struct {
		Challengers []struct {
			Name string `json:"name"`
		} `json:"challengers"`
	}
	if err := json.Unmarshal(data, &payload); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if len(payload.Challengers) != 2 {
		t.Fatalf("expected 2 challengers, got %d", len(payload.Challengers))
	}
	names := map[string]bool{}
	for _, c := range payload.Challengers {
		names[c.Name] = true
	}
	if !names["Carol"] {
		t.Error("expected Carol in challengers list")
	}
	if !names["Dave"] {
		t.Error("expected Dave in challengers list")
	}
}
