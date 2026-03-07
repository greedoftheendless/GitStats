// cmd/server/main.go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/yourusername/gitstats/internal/cache"
	"github.com/yourusername/gitstats/internal/github"
	"github.com/yourusername/gitstats/internal/ratelimit"
)

var (
	ghClient  *github.Client
	apiCache  *cache.Cache
	limiter   *ratelimit.Limiter
)

func main() {
	// Config from environment variables
	token := os.Getenv("GITHUB_TOKEN") // optional but recommended
	port  := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Init dependencies
	ghClient = github.NewClient(token)
	apiCache  = cache.New(5 * time.Minute)   // cache responses for 5 min
	limiter   = ratelimit.New(2, 10)          // 2 req/sec per IP, burst of 10

	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/api/user/",   handleUser)
	mux.HandleFunc("/api/health",  handleHealth)

	// Serve static frontend
	mux.Handle("/", http.FileServer(http.Dir("./static")))

	// Apply rate limiter middleware to everything
	handler := limiter.Middleware(corsMiddleware(mux))

	log.Printf("🐙 gitstats server running on :%s", port)
	if token != "" {
		log.Printf("✅ GitHub token loaded — rate limit: 5000 req/hr")
	} else {
		log.Printf("⚠️  No GITHUB_TOKEN set — rate limit: 60 req/hr")
	}

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}

// GET /api/user/:username  — returns merged user+repos+events JSON
func handleUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	username := strings.TrimPrefix(r.URL.Path, "/api/user/")
	username = strings.Trim(username, "/")
	if username == "" {
		jsonError(w, "username required", http.StatusBadRequest)
		return
	}

	cacheKey := "user:" + username

	// Serve from cache if available
	if cached, ok := apiCache.Get(cacheKey); ok {
		log.Printf("cache hit: %s", username)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write(cached)
		return
	}

	log.Printf("cache miss: %s — fetching from GitHub", username)

	// Fetch all three endpoints concurrently
	type result struct {
		data []byte
		code int
		err  error
	}

	userCh   := make(chan result, 1)
	reposCh  := make(chan result, 1)
	eventsCh := make(chan result, 1)

	go func() { d, c, e := ghClient.GetUser(username);   userCh   <- result{d, c, e} }()
	go func() { d, c, e := ghClient.GetRepos(username);  reposCh  <- result{d, c, e} }()
	go func() { d, c, e := ghClient.GetEvents(username); eventsCh <- result{d, c, e} }()

	userRes   := <-userCh
	reposRes  := <-reposCh
	eventsRes := <-eventsCh

	if userRes.err != nil {
		jsonError(w, "failed to reach GitHub API", http.StatusBadGateway)
		return
	}
	if userRes.code == 404 {
		jsonError(w, fmt.Sprintf("user '%s' not found", username), http.StatusNotFound)
		return
	}
	if userRes.code != 200 {
		jsonError(w, "GitHub API error", userRes.code)
		return
	}

	// Merge into a single response object
	merged := map[string]json.RawMessage{
		"user":   json.RawMessage(userRes.data),
		"repos":  json.RawMessage(safeJSON(reposRes)),
		"events": json.RawMessage(safeJSON(eventsRes)),
	}

	out, err := json.Marshal(merged)
	if err != nil {
		jsonError(w, "failed to encode response", http.StatusInternalServerError)
		return
	}

	// Store in cache
	apiCache.Set(cacheKey, out)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cache", "MISS")
	w.Write(out)
}

// GET /api/health
func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"status":     "ok",
		"cache_size": apiCache.Size(),
		"time":       time.Now().UTC(),
	})
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func safeJSON(r struct {
	data []byte
	code int
	err  error
}) []byte {
	if r.err != nil || r.code != 200 || r.data == nil {
		return []byte("[]")
	}
	return r.data
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
