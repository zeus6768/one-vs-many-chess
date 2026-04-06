package handler

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// Conn wraps a gorilla WebSocket connection with a write mutex and room memberships.
type Conn struct {
	mu   sync.Mutex
	ws   *websocket.Conn
	id   string // socketID
}

// Send serialises the event + data and writes it to the WebSocket.
// Concurrent calls are serialised via mu.
func (c *Conn) Send(event string, data interface{}) {
	msg, err := json.Marshal(map[string]interface{}{"event": event, "data": data})
	if err != nil {
		log.Printf("marshal error for event %q: %v", event, err)
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if err := c.ws.WriteMessage(websocket.TextMessage, msg); err != nil {
		log.Printf("write error for event %q to %s: %v", event, c.id, err)
	}
}

// Hub manages all WebSocket connections and room memberships.
type Hub struct {
	mu    sync.RWMutex
	conns map[string]*Conn            // socketID → Conn
	rooms map[string]map[string]bool  // roomID → set of socketIDs
}

// NewHub creates a new Hub.
func NewHub() *Hub {
	return &Hub{
		conns: make(map[string]*Conn),
		rooms: make(map[string]map[string]bool),
	}
}

// Register adds a connection to the hub.
func (h *Hub) Register(c *Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.conns[c.id] = c
}

// Unregister removes a connection from the hub and all its rooms.
func (h *Hub) Unregister(socketID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.conns, socketID)
	for _, members := range h.rooms {
		delete(members, socketID)
	}
}

// JoinRoom subscribes a socket to a room.
func (h *Hub) JoinRoom(socketID, roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[roomID] == nil {
		h.rooms[roomID] = make(map[string]bool)
	}
	h.rooms[roomID][socketID] = true
}

// LeaveRoom unsubscribes a socket from a room.
func (h *Hub) LeaveRoom(socketID, roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if members, ok := h.rooms[roomID]; ok {
		delete(members, socketID)
		if len(members) == 0 {
			delete(h.rooms, roomID)
		}
	}
}

// EvictRoom removes all sockets from a room (without closing connections).
func (h *Hub) EvictRoom(roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.rooms, roomID)
}

// SendTo sends a message to a specific socket.
func (h *Hub) SendTo(socketID, event string, data interface{}) {
	h.mu.RLock()
	c, ok := h.conns[socketID]
	h.mu.RUnlock()
	if ok {
		c.Send(event, data)
	}
}

// BroadcastRoom sends a message to all sockets in a room.
func (h *Hub) BroadcastRoom(roomID, event string, data interface{}) {
	h.mu.RLock()
	members := h.rooms[roomID]
	conns := make([]*Conn, 0, len(members))
	for sid := range members {
		if c, ok := h.conns[sid]; ok {
			conns = append(conns, c)
		}
	}
	h.mu.RUnlock()

	for _, c := range conns {
		c.Send(event, data)
	}
}

// BroadcastRoomExcept sends to all room members except one socket.
func (h *Hub) BroadcastRoomExcept(roomID, excludeSocketID, event string, data interface{}) {
	h.mu.RLock()
	members := h.rooms[roomID]
	conns := make([]*Conn, 0, len(members))
	for sid := range members {
		if sid != excludeSocketID {
			if c, ok := h.conns[sid]; ok {
				conns = append(conns, c)
			}
		}
	}
	h.mu.RUnlock()

	for _, c := range conns {
		c.Send(event, data)
	}
}

// BroadcastAll sends a message to every connected socket.
func (h *Hub) BroadcastAll(event string, data interface{}) {
	h.mu.RLock()
	conns := make([]*Conn, 0, len(h.conns))
	for _, c := range h.conns {
		conns = append(conns, c)
	}
	h.mu.RUnlock()

	for _, c := range conns {
		c.Send(event, data)
	}
}
