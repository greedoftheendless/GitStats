# 🐙 gitstats

GitHub profile analytics dashboard — Go backend + vanilla JS frontend, hosted natively on NixOS.

## Stack
- **Backend**: Go (stdlib only, no frameworks)
  - In-memory cache (5 min TTL)
  - Per-IP rate limiter (token bucket)
  - GitHub token injection
- **Frontend**: Vanilla HTML/CSS/JS
- **Hosting**: NixOS systemd service via Nix flake

## Project Structure
```
gitstats/
├── cmd/server/main.go              # HTTP server, routes
├── internal/
│   ├── cache/cache.go              # Thread-safe TTL cache
│   ├── ratelimit/ratelimit.go      # Per-IP token bucket
│   └── github/client.go           # GitHub API client
├── static/index.html               # Frontend
├── flake.nix                       # Nix build + NixOS module
└── go.mod
```

## Dev (local)

```bash
# Enter dev shell (installs Go, gopls, air)
nix develop

# Run with hot reload
export GITHUB_TOKEN=ghp_yourtoken   # optional but recommended
air

# Or just run directly
go run ./cmd/server
# → http://localhost:8080
```

## Deploy on NixOS

Add to your `/etc/nixos/flake.nix`:

```nix
inputs.gitstats.url = "path:/home/you/gitstats";

outputs = { nixpkgs, gitstats, ... }: {
  nixosConfigurations.yourhostname = nixpkgs.lib.nixosSystem {
    modules = [
      gitstats.nixosModules.default
      {
        services.gitstats = {
          enable          = true;
          port            = 8080;
          # Optional: path to file containing GITHUB_TOKEN=ghp_xxx
          githubTokenFile = /run/secrets/github_token;
        };
      }
    ];
  };
};
```

Then:
```bash
sudo nixos-rebuild switch
# Service starts automatically, survives reboots
```

## GitHub Token (recommended)

Without token: 60 req/hr | With token: 5000 req/hr

1. Go to https://github.com/settings/tokens
2. Generate a classic token with `read:user`, `public_repo` scopes
3. Save to a file: `echo "GITHUB_TOKEN=ghp_xxx" > /run/secrets/github_token`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/:username` | Merged user + repos + events |
| GET | `/api/health` | Server health + cache size |
