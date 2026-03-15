# Ephemeral Comms - Frontend

A temporary, password-protected communication platform built with React + Vite.

## Quick Start

### Prerequisites
- Node.js 16+ (works well on NixOS with `nix develop`)
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The dev server will open at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── main.jsx              # React entry point
├── App.jsx              # Root component
├── index.css            # Global Tailwind styles
├── pages/
│   └── EphemeralComms.jsx   # Main page component
└── components/
    ├── AuthScreen.jsx    # Login/Create session screen
    └── ChatScreen.jsx    # Chat interface
```

## Features

✅ **Create or join password-protected sessions**
✅ **Real-time messaging** (ready for Socket.IO)
✅ **File sharing** (up to 50MB files)
✅ **Presence indicators** (online users)
✅ **Typing indicators**
✅ **Session ID sharing** (with copy button)
✅ **Responsive design** (mobile & desktop)

## Technologies

- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Lucide Icons** - UI icons
- **Socket.IO** (ready to integrate) - Real-time communication

## Next: Backend Integration

This frontend is ready to connect to a Node.js + Socket.IO backend.

Replace the mock state management with Socket.IO events:
- `connect` - Join session
- `message` - Send/receive messages
- `file-upload` - Share files
- `user-joined` / `user-left` - Presence updates
- `typing` - Typing indicators
- `disconnect` - Leave session

## NixOS Setup

Create a `flake.nix` in the project root:

```nix
{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [ nodejs ];
        };
      }
    );
}
```

Then:
```bash
nix develop
npm install
npm run dev
```
