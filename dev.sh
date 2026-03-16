#!/usr/bin/env bash

PROJECT="$HOME/Ephemeral-Comms"
SESSION="ephemeral"

# Kill existing session if it exists
tmux kill-session -t "$SESSION" 2>/dev/null

# Create new session, start in project root
tmux new-session -d -s "$SESSION" -c "$PROJECT"

# ── Pane 0: Backend ──────────────────────────────────────────────────────────
tmux send-keys -t "$SESSION:0" "cd $PROJECT && nix develop --command bash -c 'cd backend && npm install && node server.js'" Enter

# ── Pane 1: Frontend ─────────────────────────────────────────────────────────
tmux split-window -h -t "$SESSION:0" -c "$PROJECT"
tmux send-keys -t "$SESSION:0.1" "cd $PROJECT && nix develop --command bash -c 'npm run dev'" Enter

# Attach to session
tmux attach-session -t "$SESSION"
