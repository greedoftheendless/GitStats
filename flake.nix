{
  description = "GitHub Stats Dashboard — Go backend + static frontend on NixOS";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};

        # Build the Go backend binary via Nix
        gitstats-server = pkgs.buildGoModule {
          pname = "gitstats-server";
          version = "1.0.0";
          src = ./.;

          # Update this hash after first `nix build` by running:
          # nix build 2>&1 | grep "got:" | awk '{print $2}'
          vendorHash = null; # set to null for no vendor deps (stdlib only)

          subPackages = ["cmd/server"];

          # Embed static files into the binary output
          postInstall = ''
            mkdir -p $out/share/gitstats
            cp -r static $out/share/gitstats/
          '';
        };
      in {
        # nix build → builds the Go binary
        packages.default = gitstats-server;

        # nix run → runs the server on :8080
        apps.default = {
          type = "app";
          program = toString (pkgs.writeShellScript "run-gitstats" ''
            export PORT=''${PORT:-8080}
            export GITHUB_TOKEN=''${GITHUB_TOKEN:-}
            cd ${gitstats-server}/share/gitstats
            echo "→ gitstats running at http://localhost:$PORT"
            exec ${gitstats-server}/bin/server
          '');
        };

        # nix develop → dev shell with Go toolchain
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            go
            gopls # Go language server
            gotools # goimports, etc.
            air # hot reload for Go
          ];

          shellHook = ''
            echo ""
            echo "  🐙 gitstats dev shell (Go)"
            echo "  ─────────────────────────────────────────"
            echo "  go run ./cmd/server        → run server"
            echo "  air                        → hot reload"
            echo "  go build ./...             → build"
            echo "  go test ./...              → test"
            echo "  sudo nixos-rebuild switch  → deploy"
            echo ""
            echo "  Tip: export GITHUB_TOKEN=ghp_xxx for 5000 req/hr"
            echo ""
          '';
        };
      }
    )
    # NixOS module — runs gitstats as a proper systemd service
    // {
      nixosModules.default = {
        config,
        lib,
        pkgs,
        ...
      }: let
        cfg = config.services.gitstats;

        gitstats-server = pkgs.buildGoModule {
          pname = "gitstats-server";
          version = "1.0.0";
          src = ./.;
          vendorHash = null;
          subPackages = ["cmd/server"];
          postInstall = ''
            mkdir -p $out/share/gitstats
            cp -r static $out/share/gitstats/
          '';
        };
      in {
        options.services.gitstats = {
          enable = lib.mkEnableOption "GitHub Stats Dashboard";

          port = lib.mkOption {
            type = lib.types.port;
            default = 8080;
            description = "Port the Go server listens on";
          };

          githubTokenFile = lib.mkOption {
            type = lib.types.nullOr lib.types.path;
            default = null;
            description = ''
              Path to a file containing your GitHub personal access token.
              e.g. /run/secrets/github_token
              Bumps rate limit from 60 to 5000 req/hr.
            '';
          };
        };

        config = lib.mkIf cfg.enable {
          # Create a dedicated system user for the service
          users.users.gitstats = {
            isSystemUser = true;
            group = "gitstats";
            description = "gitstats service user";
          };
          users.groups.gitstats = {};

          # Systemd service definition
          systemd.services.gitstats = {
            description = "GitHub Stats Dashboard (Go)";
            wantedBy = ["multi-user.target"];
            after = ["network.target"];

            environment = {
              PORT = toString cfg.port;
            };

            # Load GitHub token from file if provided
            serviceConfig = lib.mkMerge [
              {
                ExecStart = "${gitstats-server}/bin/server";
                WorkingDirectory = "${gitstats-server}/share/gitstats";
                User = "gitstats";
                Group = "gitstats";
                Restart = "on-failure";
                RestartSec = "5s";

                # Hardening
                NoNewPrivileges = true;
                ProtectSystem = "strict";
                ProtectHome = true;
                PrivateTmp = true;
                CapabilityBoundingSet = "";
              }
              (lib.mkIf (cfg.githubTokenFile != null) {
                EnvironmentFiles = [cfg.githubTokenFile];
              })
            ];
          };

          # Open firewall port
          networking.firewall.allowedTCPPorts = [cfg.port];
        };
      };
    };
}
