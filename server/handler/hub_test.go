package handler

import "testing"

// newTestConn creates a Conn with a nil websocket — safe for membership-only tests
// since none of the hub's structural operations (Register, JoinRoom, etc.) call Send.
func newTestConn(id string) *Conn {
	return &Conn{id: id}
}

// ── Register / Unregister ─────────────────────────────────────────────────────

func TestHub_Register(t *testing.T) {
	h := NewHub()
	c := newTestConn("sock1")
	h.Register(c)

	h.mu.RLock()
	_, ok := h.conns["sock1"]
	h.mu.RUnlock()
	if !ok {
		t.Error("expected sock1 to be registered in hub")
	}
}

func TestHub_Unregister(t *testing.T) {
	h := NewHub()
	c := newTestConn("sock1")
	h.Register(c)
	h.Unregister("sock1")

	h.mu.RLock()
	_, ok := h.conns["sock1"]
	h.mu.RUnlock()
	if ok {
		t.Error("expected sock1 to be removed from hub after Unregister")
	}
}

func TestHub_Unregister_RemovesFromRooms(t *testing.T) {
	h := NewHub()
	c := newTestConn("sock1")
	h.Register(c)
	h.JoinRoom("sock1", "room1")

	h.Unregister("sock1")

	h.mu.RLock()
	members := h.rooms["room1"]
	h.mu.RUnlock()
	if members["sock1"] {
		t.Error("Unregister should remove socket from all rooms")
	}
}

// ── JoinRoom / LeaveRoom ──────────────────────────────────────────────────────

func TestHub_JoinRoom(t *testing.T) {
	h := NewHub()
	h.Register(newTestConn("sock1"))
	h.JoinRoom("sock1", "room1")

	h.mu.RLock()
	members, ok := h.rooms["room1"]
	h.mu.RUnlock()
	if !ok {
		t.Fatal("expected room1 to exist after JoinRoom")
	}
	if !members["sock1"] {
		t.Error("expected sock1 to be a member of room1")
	}
}

func TestHub_LeaveRoom(t *testing.T) {
	h := NewHub()
	h.Register(newTestConn("sock1"))
	h.JoinRoom("sock1", "room1")
	h.LeaveRoom("sock1", "room1")

	h.mu.RLock()
	_, ok := h.rooms["room1"]
	h.mu.RUnlock()
	if ok {
		t.Error("expected room1 to be deleted when last member leaves")
	}
}

func TestHub_LeaveRoom_KeepsOtherMembers(t *testing.T) {
	h := NewHub()
	h.Register(newTestConn("sock1"))
	h.Register(newTestConn("sock2"))
	h.JoinRoom("sock1", "room1")
	h.JoinRoom("sock2", "room1")
	h.LeaveRoom("sock1", "room1")

	h.mu.RLock()
	members, ok := h.rooms["room1"]
	h.mu.RUnlock()
	if !ok {
		t.Fatal("room1 should still exist after one of two members leaves")
	}
	if members["sock1"] {
		t.Error("sock1 should no longer be in room1")
	}
	if !members["sock2"] {
		t.Error("sock2 should still be in room1")
	}
}

func TestHub_JoinRoom_MultipleRooms(t *testing.T) {
	h := NewHub()
	h.Register(newTestConn("sock1"))
	h.JoinRoom("sock1", "room1")
	h.JoinRoom("sock1", "room2")

	h.mu.RLock()
	inRoom1 := h.rooms["room1"]["sock1"]
	inRoom2 := h.rooms["room2"]["sock1"]
	h.mu.RUnlock()
	if !inRoom1 {
		t.Error("expected sock1 in room1")
	}
	if !inRoom2 {
		t.Error("expected sock1 in room2")
	}
}

// ── EvictRoom ────────────────────────────────────────────────────────────────

func TestHub_EvictRoom(t *testing.T) {
	h := NewHub()
	h.Register(newTestConn("sock1"))
	h.Register(newTestConn("sock2"))
	h.JoinRoom("sock1", "room1")
	h.JoinRoom("sock2", "room1")

	h.EvictRoom("room1")

	h.mu.RLock()
	_, ok := h.rooms["room1"]
	h.mu.RUnlock()
	if ok {
		t.Error("expected room1 to be gone after EvictRoom")
	}
}

func TestHub_EvictRoom_LeavesConnectionsIntact(t *testing.T) {
	h := NewHub()
	h.Register(newTestConn("sock1"))
	h.JoinRoom("sock1", "room1")

	h.EvictRoom("room1")

	h.mu.RLock()
	_, connOk := h.conns["sock1"]
	h.mu.RUnlock()
	if !connOk {
		t.Error("EvictRoom should not close or remove connections from the hub")
	}
}
