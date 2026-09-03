import {
  type PlayerState,
  type PowerUpType,
  type PowerUpSpawn,
  type Obstacle,
  type StickyPatch,
  type Decoy,
  type GameMap,
  POWER_UP_CONFIGS,
  ALL_POWER_UP_TYPES,
  PLAYER_MOVE_SPEED,
  PLAYER_JUMP_SPEED,
  GRAVITY,
  MAX_FALL_SPEED,
  SPEED_SURGE_MULTIPLIER,
  PLAYER_SIZE,
  TAG_RADIUS,
  POWER_UP_PICKUP_RADIUS,
  FREEZE_RADIUS,
  BINK_DASH_DISTANCE,
  STICKY_PATCH_RADIUS,
  STICKY_SLOW_MULTIPLIER,
  PLAYER_COLORS,
} from "chase-tag-shared";

export interface LocalGameState {
  players: PlayerState[];
  spawns: PowerUpSpawn[];
  stickyPatches: StickyPatch[];
  decoys: Decoy[];
  map: GameMap;
  roundTimeRemaining: number;
  roundLength: number;
  running: boolean;
  ended: boolean;
  result: { loserId: string; loserName: string } | null;
  tagLocked: boolean;
}

export interface LocalPlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  usePowerUp: boolean;
}

const ZERO_INPUT: LocalPlayerInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  usePowerUp: false,
};

export function createLocalGame(
  map: GameMap,
  playerNames: string[],
  roundLength: number
): LocalGameState {
  const players: PlayerState[] = playerNames.map((name, i) => ({
    id: `local_${i}`,
    name,
    x: map.spawnPoints[i].x,
    y: map.spawnPoints[i].y,
    vx: 0,
    vy: 0,
    isIt: i === 0,
    alive: true,
    facing: { x: 1, y: 0 },
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    score: 0,
    ready: true,
    activePowerUp: null,
    powerUpCooldown: 0,
    heldPowerUp: null,
  }));

  return {
    players,
    spawns: [],
    stickyPatches: [],
    decoys: [],
    map,
    roundTimeRemaining: roundLength,
    roundLength,
    running: false,
    ended: false,
    result: null,
    tagLocked: false,
  };
}

function rectCollides(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function collidesWithObstacles(
  x: number, y: number, obstacles: Obstacle[]
): boolean {
  for (const o of obstacles) {
    if (rectCollides(x, y, PLAYER_SIZE * 2, PLAYER_SIZE * 2, o.x, o.y, o.w, o.h)) {
      return true;
    }
  }
  return false;
}

function isGrounded(player: PlayerState, map: GameMap): boolean {
  const playerH = PLAYER_SIZE * 2;
  return player.y >= map.height - playerH - 0.5 || collidesWithObstacles(player.x, player.y + 2, map.obstacles);
}

function horizontallyOverlaps(x: number, obstacle: Obstacle): boolean {
  const playerW = PLAYER_SIZE * 2;
  return x + playerW > obstacle.x && x < obstacle.x + obstacle.w;
}

function moveVertically(player: PlayerState, newY: number, map: GameMap) {
  const playerH = PLAYER_SIZE * 2;
  const oldY = player.y;

  if (player.vy >= 0) {
    const oldBottom = oldY + playerH;
    const newBottom = newY + playerH;
    for (const o of map.obstacles) {
      if (horizontallyOverlaps(player.x, o) && oldBottom <= o.y && newBottom >= o.y) {
        player.y = o.y - playerH;
        player.vy = 0;
        return;
      }
    }
  } else {
    for (const o of map.obstacles) {
      const obstacleBottom = o.y + o.h;
      if (horizontallyOverlaps(player.x, o) && oldY >= obstacleBottom && newY <= obstacleBottom) {
        player.y = obstacleBottom;
        player.vy = 0;
        return;
      }
    }
  }

  if (!collidesWithObstacles(player.x, newY, map.obstacles)) {
    player.y = newY;
  } else {
    player.vy = 0;
  }
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function spawnPowerUps(state: LocalGameState) {
  if (state.spawns.length >= 3) return;
  const availableSlots = state.map.powerUpSpawns.filter(
    ps => !state.spawns.some(s => s.x === ps.x && s.y === ps.y)
  );
  if (availableSlots.length === 0) return;

  const slot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
  const type = ALL_POWER_UP_TYPES[Math.floor(Math.random() * ALL_POWER_UP_TYPES.length)];

  state.spawns.push({
    id: `spawn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    x: slot.x,
    y: slot.y,
    respawnTimer: 0,
  });
}

export function updateLocalGame(
  state: LocalGameState,
  inputs: LocalPlayerInput[],
  dt: number
): void {
  if (!state.running || state.ended) return;

  state.roundTimeRemaining -= dt / 1000;
  if (state.roundTimeRemaining <= 0) {
    state.roundTimeRemaining = 0;
    const itPlayer = state.players.find(p => p.isIt);
    state.ended = true;
    state.running = false;
    state.result = {
      loserId: itPlayer?.id ?? "",
      loserName: itPlayer?.name ?? "Unknown",
    };
    return;
  }

  // Update power-up timers
  for (const player of state.players) {
    if (player.activePowerUp) {
      player.activePowerUp.remainingMs -= dt;
      if (player.activePowerUp.remainingMs <= 0) {
        player.activePowerUp = null;
      }
    }
    if (player.powerUpCooldown > 0) {
      player.powerUpCooldown -= dt;
      if (player.powerUpCooldown < 0) player.powerUpCooldown = 0;
    }
  }

  // Update sticky patches
  state.stickyPatches = state.stickyPatches.filter(sp => {
    sp.remainingMs -= dt;
    return sp.remainingMs > 0;
  });

  // Update decoys
  state.decoys = state.decoys.filter(d => {
    d.remainingMs -= dt;
    d.x += d.vx;
    d.y += d.vy;
    d.vx *= 0.97;
    d.vy *= 0.97;
    return d.remainingMs > 0;
  });

  // Move players
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    const input = inputs[i] ?? ZERO_INPUT;

    if (!player.alive) continue;

    // Check if frozen
    const isFrozen = player.activePowerUp?.type === "freeze_pulse";

    let speed = PLAYER_MOVE_SPEED;
    if (player.activePowerUp?.type === "speed_surge") {
      speed *= SPEED_SURGE_MULTIPLIER;
    }

    // Check sticky patches
    for (const patch of state.stickyPatches) {
      if (dist(player, patch) < STICKY_PATCH_RADIUS) {
        speed *= STICKY_SLOW_MULTIPLIER;
      }
    }

    const frameScale = dt / (1000 / 60);
    let dx = 0;
    if (!isFrozen) {
      if (input.left) dx -= speed * frameScale;
      if (input.right) dx += speed * frameScale;
      if (dx !== 0) player.facing = { x: Math.sign(dx), y: 0 };
      if (input.up && isGrounded(player, state.map)) {
        player.vy = -PLAYER_JUMP_SPEED;
      }
    }

    player.vx = dx;
    player.vy = Math.min(MAX_FALL_SPEED, player.vy + GRAVITY * frameScale);

    const newX = player.x + player.vx;
    if (!collidesWithObstacles(newX, player.y, state.map.obstacles)) {
      player.x = newX;
    } else {
      player.vx = 0;
    }

    const newY = player.y + player.vy * frameScale;
    moveVertically(player, newY, state.map);

    // Clamp to map
    player.x = Math.max(0, Math.min(state.map.width - PLAYER_SIZE * 2, player.x));
    player.y = Math.max(0, Math.min(state.map.height - PLAYER_SIZE * 2, player.y));
    if (player.y >= state.map.height - PLAYER_SIZE * 2) player.vy = 0;
  }

  // Power-up pickup (auto-activate immediately)
  for (const player of state.players) {
    for (let si = state.spawns.length - 1; si >= 0; si--) {
      const spawn = state.spawns[si];
      if (dist(player, spawn) < POWER_UP_PICKUP_RADIUS) {
        if (player.powerUpCooldown <= 0) {
          activatePowerUp(state, player, spawn.type);
          const config = POWER_UP_CONFIGS[spawn.type];
          player.powerUpCooldown = config.cooldownMs;
        }
        state.spawns.splice(si, 1);
      }
    }
  }

  // Tag check
  const itPlayer = state.players.find(p => p.isIt);
  if (itPlayer) {
    if (state.tagLocked) {
      let stillOverlapping = false;
      for (const other of state.players) {
        if (other.id === itPlayer.id) continue;
        if (!other.alive) continue;
        if (dist(itPlayer, other) < TAG_RADIUS) {
          stillOverlapping = true;
          break;
        }
      }
      if (!stillOverlapping) {
        state.tagLocked = false;
      }
    }

    if (!state.tagLocked) {
      for (const other of state.players) {
        if (other.id === itPlayer.id) continue;
        if (!other.alive) continue;

        if (dist(itPlayer, other) < TAG_RADIUS) {
          // Check safe bubble
          if (other.activePowerUp?.type === "safe_bubble") {
            other.activePowerUp = null;
            continue;
          }

          // Tag! Swap roles, then wait for separation before tagging again.
          itPlayer.isIt = false;
          other.isIt = true;
          itPlayer.score += 1;
          state.tagLocked = true;
          break;
        }
      }
    }
  }
}

function activatePowerUp(
  state: LocalGameState,
  player: PlayerState,
  type: PowerUpType
): void {
  switch (type) {
    case "speed_surge":
      player.activePowerUp = {
        type,
        remainingMs: POWER_UP_CONFIGS.speed_surge.durationMs,
        durationMs: POWER_UP_CONFIGS.speed_surge.durationMs,
      };
      break;

    case "freeze_pulse": {
      let closest: PlayerState | null = null;
      let closestDist = Infinity;
      for (const other of state.players) {
        if (other.id === player.id) continue;
        const d = dist(player, other);
        if (d < FREEZE_RADIUS && d < closestDist) {
          closestDist = d;
          closest = other;
        }
      }
      if (closest) {
        closest.activePowerUp = {
          type: "freeze_pulse",
          remainingMs: POWER_UP_CONFIGS.freeze_pulse.durationMs,
          durationMs: POWER_UP_CONFIGS.freeze_pulse.durationMs,
        };
      }
      break;
    }

    case "ghost_step":
      player.activePowerUp = {
        type,
        remainingMs: POWER_UP_CONFIGS.ghost_step.durationMs,
        durationMs: POWER_UP_CONFIGS.ghost_step.durationMs,
      };
      break;

    case "blink_dash": {
      const dashX = player.x + player.facing.x * BINK_DASH_DISTANCE;
      const dashY = player.y + player.facing.y * BINK_DASH_DISTANCE;
      const clampedX = Math.max(0, Math.min(state.map.width - PLAYER_SIZE * 2, dashX));
      const clampedY = Math.max(0, Math.min(state.map.height - PLAYER_SIZE * 2, dashY));
      if (!collidesWithObstacles(clampedX, clampedY, state.map.obstacles)) {
        player.x = clampedX;
        player.y = clampedY;
      }
      break;
    }

    case "mirror_decoy":
      state.decoys.push({
        id: `decoy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ownerId: player.id,
        x: player.x,
        y: player.y,
        vx: -player.facing.x * 2,
        vy: -player.facing.y * 2,
        remainingMs: POWER_UP_CONFIGS.mirror_decoy.durationMs,
      });
      break;

    case "safe_bubble":
      player.activePowerUp = {
        type,
        remainingMs: POWER_UP_CONFIGS.safe_bubble.durationMs,
        durationMs: POWER_UP_CONFIGS.safe_bubble.durationMs,
      };
      break;

    case "sticky_patch":
      state.stickyPatches.push({
        id: `sticky_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: player.x,
        y: player.y,
        remainingMs: POWER_UP_CONFIGS.sticky_patch.durationMs,
      });
      break;
  }
}
