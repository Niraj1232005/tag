# Chase Tag

An original browser-based multiplayer chase/tag game. **One player is "It"** and must tag another before the round timer runs out — whoever is "It" when time expires loses the round.

Two ways to play:

- **Online Rooms** — join/create a room with a 6-character code (up to 13 players), powered by a Colyseus server.
- **Local Same-Device** — 2–4 players on one keyboard, entirely client-side (no network).

## Architecture

```
tag/
├── client/    Vite + React + TypeScript app (menu, lobby, canvas game, HUD)
├── server/    Colyseus server (TagRoom, room lifecycle, authoritative logic)
├── shared/    Types, power-up configs, maps, and the Colyseus room-state schema
└── package.json
```

This is an **bun workspace monorepo**. `shared` is built first and imported by both `client` and `server` so the tag/power-up logic is never duplicated.

- `client` → deploy to a static host (Vercel, Netlify, Cloudflare Pages).
- `server` → deploy to a long-running Node host with persistent WebSockets (Fly.io, Railway, Render) — **not** serverless/static.

## Prerequisites

- **Node.js 20+** (uses ESM workspaces)
- **bun 9+**

## Getting Started (Dev Environment)

### 1. Install dependencies

From the repo root:

```bash
bun install
```

### 2. Build the shared package

`shared` must be compiled before the client/server can use it:

```bash
bun run build --workspace=shared
```

Or run the full build (shared + client + server) at any time:

```bash
bun run build
```

### 3. Start the Colyseus server (for online mode)

```bash
bun run dev:server
```

This runs the server in watch mode on **port 2567** (configurable via `--port` or the `PORT` env var). You should see the Colyseus banner and:

```
Chase Tag server listening on port 2567
```

### 4. Start the client (frontend)

In a **second terminal**:

```bash
bun run dev:client
```

Opens the Vite dev server at **http://localhost:3000**.

> **Note on the local-only flow:** Local multiplayer works entirely in the browser without the server. Only **Create Room / Join Room** (online mode) requires `dev:server` to be running.

## Wiring the Client to the Server

The React client connects to the Colyseus server using the `VITE_COLYSEUS_URL` environment variable. Create a `.env` file in `client/`:

```bash
# client/.env
VITE_COLYSEUS_URL=ws://localhost:2567
```

If unset, the client defaults to `ws://localhost:2567`, so local dev works out of the box.

## Common Scripts

| Command | Description |
|---------|-------------|
| `bun run dev:client` | Start Vite dev server (port 3000) |
| `bun run dev:server` | Start Colyseus server in watch mode (port 2567) |
| `bun run build` | Build shared, then client, then server |
| `bun run build --workspace=shared` | Rebuild the shared package only |

## Gameplay / Controls

### Online Rooms
- **Create Room** → host configures round length, map, and power-ups, then gets a shareable room code.
- **Join Room** → enter the 6-character code.
- Each player controls their own character on their own device.

### Local Same-Device (key zones)

| Player | Move | Power-up |
|--------|------|----------|
| Player 1 | `W A S D` | `E` |
| Player 2 | `Arrow Keys` | `Enter` |
| Player 3 | `T F G H` | `R` |
| Player 4 | `Numpad 8 4 6 5` | `0` |

### Power-Ups (7 total)

Speed Surge · Freeze Pulse · Ghost Step · Blink Dash · Mirror Decoy · Safe Bubble · Sticky Patch

Pickups spawn on the map (a random rotation of 2–3 at a time). Any player — "It" or a runner — can grab one.

## Deployment

- **Client:** build (`bun run build --workspace=client`), then host `client/dist` statically. Set `VITE_COLYSEUS_URL` to your deployed server's WebSocket URL.
- **Server:** build and run `node dist/index.js`. If you later run multiple instances, add Redis to sync rooms across instances (not needed at launch).
