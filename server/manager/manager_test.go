package manager

import (
	"testing"
	"time"

	"github.com/zeus/one-vs-many-chess/types"
)

func newManager() *GameManager {
	return New(30000)
}

func host(id, name string) types.Player {
	return types.Player{ID: id, Name: name, IsHost: true}
}

func challenger(id, name string) types.Player {
	return types.Player{ID: id, Name: name, IsHost: false}
}

// ── Session management ────────────────────────────────────────────────────────

func TestRegisterSession_New(t *testing.T) {
	m := newManager()
	isNew, sess := m.RegisterSession("sess1", "sock1")
	if !isNew {
		t.Error("expected isNew = true for first registration")
	}
	if sess.SessionID != "sess1" {
		t.Errorf("expected sess1, got %q", sess.SessionID)
	}
	if sess.SocketID != "sock1" {
		t.Errorf("expected sock1, got %q", sess.SocketID)
	}
}

func TestRegisterSession_Reconnect(t *testing.T) {
	m := newManager()
	m.RegisterSession("sess1", "sock1")
	isNew, sess := m.RegisterSession("sess1", "sock2")
	if isNew {
		t.Error("expected isNew = false for reconnection")
	}
	if sess.SocketID != "sock2" {
		t.Errorf("expected updated socketID sock2, got %q", sess.SocketID)
	}
	// Old socket mapping should be gone.
	if m.GetSessionBySocketID("sock1") != nil {
		t.Error("old socket should no longer map to session")
	}
}

func TestGetSessionBySocketID(t *testing.T) {
	m := newManager()
	m.RegisterSession("sess1", "sock1")
	sess := m.GetSessionBySocketID("sock1")
	if sess == nil {
		t.Fatal("expected session, got nil")
	}
	if sess.SessionID != "sess1" {
		t.Errorf("expected sess1, got %q", sess.SessionID)
	}
}

func TestGetSessionBySocketID_Unknown(t *testing.T) {
	m := newManager()
	if m.GetSessionBySocketID("unknown") != nil {
		t.Error("expected nil for unknown socket")
	}
}

func TestDeleteSession(t *testing.T) {
	m := newManager()
	m.RegisterSession("sess1", "sock1")
	m.DeleteSession("sess1")
	if m.GetSessionBySocketID("sock1") != nil {
		t.Error("session should be deleted")
	}
}

func TestGracePeriod_Fires(t *testing.T) {
	m := newManager()
	m.RegisterSession("sess1", "sock1")
	fired := make(chan struct{}, 1)
	m.StartGracePeriod("sess1", func() { fired <- struct{}{} }, 50)

	select {
	case <-fired:
	case <-time.After(500 * time.Millisecond):
		t.Error("grace period timer did not fire")
	}
}

func TestGracePeriod_CancelledOnReconnect(t *testing.T) {
	m := newManager()
	m.RegisterSession("sess1", "sock1")
	fired := false
	m.StartGracePeriod("sess1", func() { fired = true }, 50)
	m.RegisterSession("sess1", "sock2") // reconnect cancels grace timer
	time.Sleep(150 * time.Millisecond)
	if fired {
		t.Error("grace timer should be cancelled on reconnect")
	}
}

// ── Room management ───────────────────────────────────────────────────────────

func TestCreateRoom(t *testing.T) {
	m := newManager()
	h := host("h1", "Alice")
	room := m.CreateRoom("Test Room", h)
	if room == nil {
		t.Fatal("expected room")
	}
	if room.Name != "Test Room" {
		t.Errorf("expected 'Test Room', got %q", room.Name)
	}
	got := m.GetRoom(room.ID)
	if got == nil {
		t.Error("GetRoom should return the created room")
	}
}

func TestGetRoomByPlayerID(t *testing.T) {
	m := newManager()
	h := host("h1", "Alice")
	room := m.CreateRoom("Room", h)
	got := m.GetRoomByPlayerID("h1")
	if got == nil || got.ID != room.ID {
		t.Error("GetRoomByPlayerID failed for host")
	}
}

func TestJoinRoom(t *testing.T) {
	m := newManager()
	room := m.CreateRoom("Room", host("h1", "Alice"))
	c := challenger("c1", "Bob")
	joined := m.JoinRoom(room.ID, c)
	if joined == nil {
		t.Fatal("JoinRoom should succeed")
	}
	if m.GetRoomByPlayerID("c1") == nil {
		t.Error("challenger should be associated with room")
	}
}

func TestJoinRoom_UnknownRoom(t *testing.T) {
	m := newManager()
	if m.JoinRoom("NOPE", challenger("c1", "Bob")) != nil {
		t.Error("expected nil for unknown room")
	}
}

func TestLeaveRoom_Challenger(t *testing.T) {
	m := newManager()
	room := m.CreateRoom("Room", host("h1", "Alice"))
	m.JoinRoom(room.ID, challenger("c1", "Bob"))
	m.LeaveRoom("c1")
	if m.GetRoomByPlayerID("c1") != nil {
		t.Error("challenger should be removed from room mapping")
	}
	// Room should still exist.
	if m.GetRoom(room.ID) == nil {
		t.Error("room should still exist after challenger leaves")
	}
}

func TestLeaveRoom_Host(t *testing.T) {
	m := newManager()
	room := m.CreateRoom("Room", host("h1", "Alice"))
	m.JoinRoom(room.ID, challenger("c1", "Bob"))
	m.RegisterSession("c1", "csock1")
	m.sessions["c1"].RoomID = room.ID

	m.LeaveRoom("h1")
	// Room should be deleted.
	if m.GetRoom(room.ID) != nil {
		t.Error("room should be deleted when host leaves")
	}
	// Challenger's session room should be cleared.
	sess := m.sessions["c1"]
	if sess != nil && sess.RoomID != "" {
		t.Error("challenger's session roomID should be cleared")
	}
}

func TestGetWaitingRooms(t *testing.T) {
	m := newManager()
	m.CreateRoom("Room1", host("h1", "Alice"))
	m.CreateRoom("Room2", host("h2", "Bob"))
	rooms := m.GetWaitingRooms()
	if len(rooms) != 2 {
		t.Errorf("expected 2 waiting rooms, got %d", len(rooms))
	}
}

func TestGetWaitingRooms_ExcludesPlayingRooms(t *testing.T) {
	m := newManager()
	room1 := m.CreateRoom("Active", host("h1", "Alice"))
	m.JoinRoom(room1.ID, challenger("c1", "Bob"))
	room1.StartGame() // transitions to "playing" directly on the pointer

	m.CreateRoom("Waiting", host("h2", "Carol"))

	rooms := m.GetWaitingRooms()
	if len(rooms) != 1 {
		t.Errorf("expected 1 waiting room, got %d", len(rooms))
	}
	if rooms[0].Status != "waiting" {
		t.Errorf("expected status 'waiting', got %q", rooms[0].Status)
	}
}

func TestGetRoomByPlayerID_Challenger(t *testing.T) {
	m := newManager()
	room := m.CreateRoom("Room", host("h1", "Alice"))
	m.JoinRoom(room.ID, challenger("c1", "Bob"))
	got := m.GetRoomByPlayerID("c1")
	if got == nil {
		t.Fatal("expected room for challenger, got nil")
	}
	if got.ID != room.ID {
		t.Errorf("expected room ID %q, got %q", room.ID, got.ID)
	}
}

func TestDeleteRoom(t *testing.T) {
	m := newManager()
	room := m.CreateRoom("Room", host("h1", "Alice"))
	m.JoinRoom(room.ID, challenger("c1", "Bob"))

	m.DeleteRoom(room.ID)

	if m.GetRoom(room.ID) != nil {
		t.Error("room should be deleted")
	}
	if m.GetRoomByPlayerID("h1") != nil {
		t.Error("host should no longer be mapped to a room")
	}
	if m.GetRoomByPlayerID("c1") != nil {
		t.Error("challenger should no longer be mapped to a room")
	}
}

func TestLeaveRoom_UnknownPlayer(t *testing.T) {
	m := newManager()
	result := m.LeaveRoom("unknown")
	if result != nil {
		t.Error("expected nil when unknown player calls LeaveRoom")
	}
}

func TestGracePeriod_MultipleStart(t *testing.T) {
	m := newManager()
	m.RegisterSession("sess1", "sock1")

	// Start, cancel via reconnect, then start again — second should fire.
	m.StartGracePeriod("sess1", func() {}, 50)
	m.RegisterSession("sess1", "sock2") // reconnect cancels the first grace period

	fired := make(chan struct{}, 1)
	m.StartGracePeriod("sess1", func() { fired <- struct{}{} }, 50)

	select {
	case <-fired:
	case <-time.After(500 * time.Millisecond):
		t.Error("second grace period timer did not fire")
	}
}
