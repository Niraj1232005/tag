import { createRequire } from "module";
import type { Client, Room as RoomType } from "colyseus";
import {
  TagRoomStateSchema,
  PlayerSchema,
  PowerUpSpawnSchema,
  StickyPatchSchema,
  DecoySchema,
  POWER_UP_TYPE_INDEX,
  POWER_UP_INDEX_TO_TYPE,
  type GameMap,
  type RoomConfig,
  MAPS,
  PLAYER_COLORS,
  PLAYER_BASE_SPEED,
  SPEED_SURGE_MULTIPLIER,
  PLAYER_SIZE,
  TAG_RADIUS,
  POWER_UP_PICKUP_RADIUS,
  FREEZE_RADIUS,
  BINK_DASH_DISTANCE,
  STICKY_PATCH_RADIUS,
  STICKY_SLOW_MULTIPLIER,
  POWER_UP_CONFIGS,
  type PowerUpType,
} from "chase-tag-shared";

const require = createRequire(import.meta.url);
const colyseus = require("colyseus") as any;

const { Room } = colyseus;

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function rectCollides(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function collidesWithObstacles(x: number, y: number, obstacles: any[]): boolean {
  for (const o of obstacles) {
    if (rectCollides(x, y, PLAYER_SIZE * 2, PLAYER_SIZE * 2, o.x, o.y, o.w, o.h)) {
      return true;
    }
  }
  return false;
}

interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  usePowerUp: boolean;
}

function playerList(state: TagRoomStateSchema): PlayerSchema[] {
  const out: PlayerSchema[] = [];
  state.players.forEach((p) => out.push(p));
  return out;
}

export class TagRoom extends (Room as unknown as typeof RoomType) {
  get s(): TagRoomStateSchema {
    return this.state as TagRoomStateSchema;
  }

  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private powerUpInterval: ReturnType<typeof setInterval> | null = null;
  private lastTick = Date.now();
  private playerInputs: Map<string, InputState> = new Map();
  private hostId: string | null = null;
  private hostKey: string | null = null;
  private config: RoomConfig = {
    roundLength: 120,
    mapName: "arena",
    powerUpsEnabled: true,
  };
  private map: GameMap = MAPS.arena;

  onCreate(options: { config?: RoomConfig; hostKey?: string }) {
    this.config = options.config ?? this.config;
    this.hostKey = options.hostKey ?? null;
    this.map = MAPS[this.config.mapName] ?? MAPS.arena;
    this.maxClients = 13;

    const state = new TagRoomStateSchema();
    state.mapName = this.config.mapName;
    state.roundLength = this.config.roundLength;
    state.roundLengthNum = this.config.roundLength;
    state.roundTimeRemaining = this.config.roundLength;
    state.powerUpsEnabled = this.config.powerUpsEnabled;
    state.gameStarted = false;
    this.setState(state);

    this.onMessage("input", (client: Client, data: InputState) => {
      this.playerInputs.set(client.sessionId, data);
    });

    this.onMessage("startGame", (client: Client) => {
      if (client.sessionId !== this.hostId) return;
      if (this.s.gameStarted) return;
      this.startGame();
    });

    this.onMessage("ready", (client: Client) => {
      const player = this.s.players.get(client.sessionId);
      if (player) {
        player.ready = !player.ready;
      }
    });

    this.onMessage("config", (client: Client, data: Partial<RoomConfig>) => {
      if (client.sessionId !== this.hostId) return;
      if (this.s.gameStarted) return;
      if (data.roundLength) {
        this.config.roundLength = data.roundLength;
        this.s.roundLength = data.roundLength;
        this.s.roundLengthNum = data.roundLength;
      }
      if (data.mapName && MAPS[data.mapName]) {
        this.config.mapName = data.mapName;
        this.s.mapName = data.mapName;
        this.map = MAPS[data.mapName];
      }
      if (data.powerUpsEnabled !== undefined) {
        this.config.powerUpsEnabled = data.powerUpsEnabled;
        this.s.powerUpsEnabled = data.powerUpsEnabled;
      }
    });
  }

  onJoin(client: Client, options: { name?: string; hostKey?: string }) {
    const playerIndex = this.s.players.size;
    if (!this.hostId || (this.hostKey && options.hostKey === this.hostKey)) {
      this.hostId = client.sessionId;
      this.s.hostId = client.sessionId;
    }
    const spawn = this.map.spawnPoints[playerIndex % this.map.spawnPoints.length];

    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.name = options.name ?? `P${playerIndex + 1}`;
    player.x = spawn.x;
    player.y = spawn.y;
    player.isIt = playerIndex === 0;
    player.alive = true;
    player.facingX = 1;
    player.facingY = 0;
    player.color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
    player.score = 0;
    player.ready = false;
    player.heldPowerUp = -1;
    player.activePowerUpType = -1;

    this.s.players.set(client.sessionId, player);
    this.playerInputs.set(client.sessionId, {
      up: false, down: false, left: false, right: false, usePowerUp: false,
    });
  }

  onLeave(client: Client) {
    this.s.players.delete(client.sessionId);
    this.playerInputs.delete(client.sessionId);

    if (this.s.players.size === 0) {
      this.disconnect();
      return;
    }

    if (client.sessionId === this.hostId) {
      this.hostId = playerList(this.s)[0]?.id ?? null;
      this.s.hostId = this.hostId ?? "";
    }

    const itPlayer = playerList(this.s).find(p => p.isIt);
    if (!itPlayer) {
      const first = playerList(this.s)[0];
      first.isIt = true;
    }
  }

  startGame() {
    this.s.gameStarted = true;
    this.s.roundTimeRemaining = this.config.roundLength;

    let idx = 0;
    this.s.players.forEach((player, sessionId) => {
      const spawn = this.map.spawnPoints[idx % this.map.spawnPoints.length];
      player.x = spawn.x;
      player.y = spawn.y;
      player.isIt = idx === 0;
      player.alive = true;
      player.score = 0;
      player.activePowerUpType = -1;
      player.activePowerUpRemaining = 0;
      player.activePowerUpDuration = 0;
      player.powerUpCooldown = 0;
      player.heldPowerUp = -1;
      idx++;
    });

    this.s.spawns.clear();
    this.s.stickyPatches.clear();
    this.s.decoys.clear();

    this.lastTick = Date.now();

    this.tickInterval = setInterval(() => this.gameTick(), 1000 / 30);
    if (this.config.powerUpsEnabled) {
      this.powerUpInterval = setInterval(() => this.spawnPowerUp(), 12000);
    }

    this.broadcast("gameStarted", {});
  }

  gameTick() {
    if (!this.s.gameStarted) return;

    const now = Date.now();
    const dt = now - this.lastTick;
    this.lastTick = now;

    this.s.roundTimeRemaining -= dt / 1000;
    if (this.s.roundTimeRemaining <= 0) {
      this.s.roundTimeRemaining = 0;
      this.endRound();
      return;
    }

    const staleSpawns: string[] = [];
    this.s.spawns.forEach((spawn, key) => {
      if (spawn.respawnTimer > 0) {
        spawn.respawnTimer -= dt;
        if (spawn.respawnTimer <= 0) staleSpawns.push(key);
      }
    });
    for (const k of staleSpawns) this.s.spawns.delete(k);

    const staleSticky: string[] = [];
    this.s.stickyPatches.forEach((sp, key) => {
      sp.remainingMs -= dt;
      if (sp.remainingMs <= 0) staleSticky.push(key);
    });
    for (const k of staleSticky) this.s.stickyPatches.delete(k);

    const staleDecoys: string[] = [];
    this.s.decoys.forEach((d, key) => {
      d.remainingMs -= dt;
      d.x += d.vx;
      d.y += d.vy;
      d.vx *= 0.97;
      d.vy *= 0.97;
      if (d.remainingMs <= 0) staleDecoys.push(key);
    });
    for (const k of staleDecoys) this.s.decoys.delete(k);

    this.s.players.forEach((player, sessionId) => {
      if (player.activePowerUpType >= 0) {
        player.activePowerUpRemaining -= dt;
        if (player.activePowerUpRemaining <= 0) {
          player.activePowerUpType = -1;
          player.activePowerUpRemaining = 0;
          player.activePowerUpDuration = 0;
        }
      }
      if (player.powerUpCooldown > 0) {
        player.powerUpCooldown -= dt;
        if (player.powerUpCooldown < 0) player.powerUpCooldown = 0;
      }

      const input = this.playerInputs.get(sessionId);
      if (!input) return;

      const isFrozen = player.activePowerUpType === POWER_UP_TYPE_INDEX.freeze_pulse;

      let speed = PLAYER_BASE_SPEED;
      if (player.activePowerUpType === POWER_UP_TYPE_INDEX.speed_surge) {
        speed *= SPEED_SURGE_MULTIPLIER;
      }

      this.s.stickyPatches.forEach((patch) => {
        if (dist(player.x + PLAYER_SIZE, player.y + PLAYER_SIZE, patch.x, patch.y) < STICKY_PATCH_RADIUS) {
          speed *= STICKY_SLOW_MULTIPLIER;
        }
      });

      let dx = 0, dy = 0;
      if (!isFrozen) {
        if (input.up) dy -= 1;
        if (input.down) dy += 1;
        if (input.left) dx -= 1;
        if (input.right) dx += 1;

        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          dx = (dx / len) * speed;
          dy = (dy / len) * speed;
          player.facingX = dx / speed;
          player.facingY = dy / speed;
        }
      }

      player.vx = dx;
      player.vy = dy;

      const newX = player.x + dx;
      const newY = player.y + dy;

      if (!collidesWithObstacles(newX, player.y, this.map.obstacles)) {
        player.x = newX;
      }
      if (!collidesWithObstacles(player.x, newY, this.map.obstacles)) {
        player.y = newY;
      }

      player.x = Math.max(0, Math.min(this.map.width - PLAYER_SIZE * 2, player.x));
      player.y = Math.max(0, Math.min(this.map.height - PLAYER_SIZE * 2, player.y));
    });

    this.s.players.forEach((player) => {
      if (player.heldPowerUp >= 0) return;
      const consumed: string[] = [];
      this.s.spawns.forEach((spawn, key) => {
        if (dist(player.x + PLAYER_SIZE, player.y + PLAYER_SIZE, spawn.x, spawn.y) < POWER_UP_PICKUP_RADIUS) {
          player.heldPowerUp = spawn.type;
          consumed.push(key);
        }
      });
      for (const k of consumed) this.s.spawns.delete(k);
    });

    this.s.players.forEach((player, sessionId) => {
      const input = this.playerInputs.get(sessionId);
      if (input?.usePowerUp && player.heldPowerUp >= 0 && player.powerUpCooldown <= 0) {
        const type = POWER_UP_INDEX_TO_TYPE[player.heldPowerUp];
        if (!type) return;
        this.activatePowerUp(player, type);
        const config = POWER_UP_CONFIGS[type as PowerUpType];
        player.powerUpCooldown = config.cooldownMs;
        player.heldPowerUp = -1;
        input.usePowerUp = false;
      }
    });

    const itPlayer = playerList(this.s).find(p => p.isIt);
    if (itPlayer) {
      for (const other of this.s.players.values()) {
        if (other.id === itPlayer.id) continue;
        if (!other.alive) continue;

        if (dist(itPlayer.x + PLAYER_SIZE, itPlayer.y + PLAYER_SIZE, other.x + PLAYER_SIZE, other.y + PLAYER_SIZE) < TAG_RADIUS) {
          if (other.activePowerUpType === POWER_UP_TYPE_INDEX.safe_bubble) {
            other.activePowerUpType = -1;
            other.activePowerUpRemaining = 0;
            other.activePowerUpDuration = 0;
            continue;
          }

          itPlayer.isIt = false;
          other.isIt = true;
          itPlayer.score += 1;

          this.broadcast("tag", {
            taggerId: itPlayer.id,
            taggedId: other.id,
          });
          break;
        }
      }
    }
  }

  activatePowerUp(player: PlayerSchema, type: PowerUpType) {
    const typeIdx = POWER_UP_TYPE_INDEX[type];
    const config = POWER_UP_CONFIGS[type];

    switch (type) {
      case "speed_surge":
      case "ghost_step":
      case "safe_bubble":
        player.activePowerUpType = typeIdx;
        player.activePowerUpRemaining = config.durationMs;
        player.activePowerUpDuration = config.durationMs;
        break;

      case "freeze_pulse": {
        let closest: PlayerSchema | null = null;
        let closestDist = Infinity;
        for (const other of this.s.players.values()) {
          if (other.id === player.id) continue;
          const d = dist(player.x + PLAYER_SIZE, player.y + PLAYER_SIZE, other.x + PLAYER_SIZE, other.y + PLAYER_SIZE);
          if (d < FREEZE_RADIUS && d < closestDist) {
            closestDist = d;
            closest = other;
          }
        }
        if (closest) {
          closest.activePowerUpType = POWER_UP_TYPE_INDEX.freeze_pulse;
          closest.activePowerUpRemaining = config.durationMs;
          closest.activePowerUpDuration = config.durationMs;
        }
        break;
      }

      case "blink_dash": {
        const dashX = player.x + player.facingX * BINK_DASH_DISTANCE;
        const dashY = player.y + player.facingY * BINK_DASH_DISTANCE;
        const clampedX = Math.max(0, Math.min(this.map.width - PLAYER_SIZE * 2, dashX));
        const clampedY = Math.max(0, Math.min(this.map.height - PLAYER_SIZE * 2, dashY));
        if (!collidesWithObstacles(clampedX, clampedY, this.map.obstacles)) {
          player.x = clampedX;
          player.y = clampedY;
        }
        break;
      }

      case "mirror_decoy": {
        const decoy = new DecoySchema();
        decoy.id = `decoy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        decoy.ownerId = player.id;
        decoy.x = player.x;
        decoy.y = player.y;
        decoy.vx = -player.facingX * 2;
        decoy.vy = -player.facingY * 2;
        decoy.remainingMs = config.durationMs;
        this.s.decoys.set(decoy.id, decoy);
        break;
      }

      case "sticky_patch": {
        const patch = new StickyPatchSchema();
        patch.id = `sticky_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        patch.x = player.x + PLAYER_SIZE;
        patch.y = player.y + PLAYER_SIZE;
        patch.remainingMs = config.durationMs;
        this.s.stickyPatches.set(patch.id, patch);
        break;
      }
    }
  }

  spawnPowerUp() {
    if (this.s.spawns.size >= 3) return;
    const existing: PowerUpSpawnSchema[] = [];
    this.s.spawns.forEach((s) => existing.push(s));
    const available = this.map.powerUpSpawns.filter(
      ps => !existing.some(s => s.x === ps.x && s.y === ps.y)
    );
    if (available.length === 0) return;

    const slot = available[Math.floor(Math.random() * available.length)];
    const typeKeys = Object.keys(POWER_UP_TYPE_INDEX) as PowerUpType[];
    const type = typeKeys[Math.floor(Math.random() * typeKeys.length)];

    const spawn = new PowerUpSpawnSchema();
    spawn.id = `spawn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    spawn.type = POWER_UP_TYPE_INDEX[type];
    spawn.x = slot.x;
    spawn.y = slot.y;
    spawn.respawnTimer = 0;

    this.s.spawns.set(spawn.id, spawn);
  }

  endRound() {
    this.s.gameStarted = false;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.powerUpInterval) {
      clearInterval(this.powerUpInterval);
      this.powerUpInterval = null;
    }

    const itPlayer = playerList(this.s).find(p => p.isIt);
    const scores = playerList(this.s).map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      wasIt: p.isIt,
    }));

    this.broadcast("roundEnd", {
      loserId: itPlayer?.id ?? "",
      loserName: itPlayer?.name ?? "Unknown",
      scores,
    });
  }

  onDispose() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.powerUpInterval) {
      clearInterval(this.powerUpInterval);
      this.powerUpInterval = null;
    }
  }
}
