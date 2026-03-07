// internal/ratelimit/ratelimit.go
// Per-IP token bucket rate limiter
package ratelimit

import (
	"net/http"
	"sync"
	"time"
)

type bucket struct {
	tokens    float64
	lastRefil time.Time
}

type Limiter struct {
	mu       sync.Mutex
	buckets  map[string]*bucket
	rate     float64 // tokens per second
	capacity float64 // max tokens
}

// New creates a limiter. e.g. New(2, 10) = 2 req/sec, burst of 10
func New(rate, capacity float64) *Limiter {
	l := &Limiter{
		buckets:  make(map[string]*bucket),
		rate:     rate,
		capacity: capacity,
	}
	// Cleanup old buckets every 5 minutes
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			l.cleanup()
		}
	}()
	return l
}

func (l *Limiter) Allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	b, ok := l.buckets[ip]
	if !ok {
		b = &bucket{tokens: l.capacity, lastRefil: time.Now()}
		l.buckets[ip] = b
	}

	// Refill tokens based on elapsed time
	now := time.Now()
	elapsed := now.Sub(b.lastRefil).Seconds()
	b.tokens = min(l.capacity, b.tokens+elapsed*l.rate)
	b.lastRefil = now

	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}

func (l *Limiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		// Strip port
		for i := len(ip) - 1; i >= 0; i-- {
			if ip[i] == ':' {
				ip = ip[:i]
				break
			}
		}
		if !l.Allow(ip) {
			http.Error(w, `{"error":"rate limit exceeded, slow down"}`, http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (l *Limiter) cleanup() {
	l.mu.Lock()
	defer l.mu.Unlock()
	cutoff := time.Now().Add(-10 * time.Minute)
	for ip, b := range l.buckets {
		if b.lastRefil.Before(cutoff) {
			delete(l.buckets, ip)
		}
	}
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
