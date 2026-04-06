package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/zeus/one-vs-many-chess/handler"
)

func main() {
	port := envInt("PORT", 3001)
	gracePeriodMs := envInt("GRACE_PERIOD_MS", 30000)
	voteTimeoutMs := envInt("VOTE_TIMEOUT_MS", 30000)

	srv := handler.NewServer(handler.Options{
		GracePeriodMs: gracePeriodMs,
		VoteTimeoutMs: voteTimeoutMs,
	})

	mux := http.NewServeMux()
	mux.Handle("/ws", srv)

	// Serve client build output in production.
	mux.Handle("/", http.FileServer(http.Dir("../client/dist")))

	addr := fmt.Sprintf(":%d", port)
	log.Printf("server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func envInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return defaultVal
}
