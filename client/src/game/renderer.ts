import {
  type PlayerState,
  type PowerUpSpawn,
  type StickyPatch,
  type Decoy,
  type GameMap,
  POWER_UP_CONFIGS,
  PLAYER_SIZE,
  HUD_HEIGHT,
} from "chase-tag-shared";
import type { LocalGameState } from "./engine.js";

const BG_COLOR = "#1a1a2e";
const GRID_COLOR = "#16213e";
const GRID_SIZE = 40;

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: LocalGameState,
  canvasW: number,
  canvasH: number
) {
  const map = state.map;
  const offsetX = Math.floor((canvasW - map.width) / 2);
  const offsetY = Math.floor((canvasH - HUD_HEIGHT - map.height) / 2) + HUD_HEIGHT;

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, map.width, map.height);

  // Grid
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  for (let x = 0; x < map.width; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, map.height);
    ctx.stroke();
  }
  for (let y = 0; y < map.height; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(map.width, y);
    ctx.stroke();
  }

  // Obstacles
  ctx.fillStyle = "#2d2d5e";
  ctx.strokeStyle = "#4a4a8a";
  ctx.lineWidth = 2;
  for (const o of map.obstacles) {
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeRect(o.x, o.y, o.w, o.h);
  }

  // Sticky patches
  for (const sp of state.stickyPatches) {
    const alpha = Math.min(1, sp.remainingMs / 1000);
    ctx.fillStyle = `rgba(139, 69, 19, ${alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(160, 82, 45, ${alpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Power-up spawns
  for (const spawn of state.spawns) {
    const config = POWER_UP_CONFIGS[spawn.type];
    ctx.fillStyle = config.color;
    ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 300) * 0.3;
    ctx.beginPath();
    ctx.arc(spawn.x, spawn.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(config.icon, spawn.x, spawn.y);
  }

  // Decoys
  for (const decoy of state.decoys) {
    const owner = state.players.find(p => p.id === decoy.ownerId);
    if (!owner) continue;
    const alpha = Math.min(1, decoy.remainingMs / 1000);
    ctx.globalAlpha = alpha * 0.6;
    drawPlayer(ctx, decoy.x, decoy.y, owner.color, false, false);
    ctx.globalAlpha = 1;
  }

  // Players
  for (const player of state.players) {
    const isGhost = player.activePowerUp?.type === "ghost_step";
    const isFrozen = player.activePowerUp?.type === "freeze_pulse";
    const hasBubble = player.activePowerUp?.type === "safe_bubble";

    if (isGhost) {
      ctx.globalAlpha = 0.25;
    }

    drawPlayer(ctx, player.x, player.y, player.color, player.isIt, isFrozen);

    // Safe bubble indicator
    if (hasBubble) {
      ctx.strokeStyle = "#32CD32";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        player.x + PLAYER_SIZE,
        player.y + PLAYER_SIZE,
        PLAYER_SIZE + 8,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Name tag
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = player.isIt ? "#FF4444" : "#FFFFFF";
    ctx.fillText(
      player.name,
      player.x + PLAYER_SIZE,
      player.y - 8
    );

    // "IT" label
    if (player.isIt) {
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "#FF6B6B";
      ctx.fillText("IT", player.x + PLAYER_SIZE, player.y - 22);
    }
  }

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  isIt: boolean,
  isFrozen: boolean
) {
  const cx = x + PLAYER_SIZE;
  const cy = y + PLAYER_SIZE;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + PLAYER_SIZE, PLAYER_SIZE, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = isFrozen ? "#6699CC" : color;
  ctx.beginPath();
  ctx.arc(cx, cy, PLAYER_SIZE, 0, Math.PI * 2);
  ctx.fill();

  // Outline
  ctx.strokeStyle = isIt ? "#FF0000" : "#FFFFFF";
  ctx.lineWidth = isIt ? 3 : 2;
  ctx.stroke();

  // Face (two dots for eyes)
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 5, cy - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 3, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 5, cy - 3, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Frozen effect (ice crystals)
  if (isFrozen) {
    ctx.strokeStyle = "#B0E0E6";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const ix = cx + Math.cos(angle) * (PLAYER_SIZE + 4);
      const iy = cy + Math.sin(angle) * (PLAYER_SIZE + 4);
      ctx.beginPath();
      ctx.moveTo(ix - 3, iy);
      ctx.lineTo(ix + 3, iy);
      ctx.moveTo(ix, iy - 3);
      ctx.lineTo(ix, iy + 3);
      ctx.stroke();
    }
  }
}

export function renderHUD(
  ctx: CanvasRenderingContext2D,
  state: LocalGameState,
  canvasW: number,
  localPlayerIndex: number
) {
  // HUD background
  ctx.fillStyle = "rgba(15, 15, 35, 0.95)";
  ctx.fillRect(0, 0, canvasW, HUD_HEIGHT);

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HUD_HEIGHT);
  ctx.lineTo(canvasW, HUD_HEIGHT);
  ctx.stroke();

  const itPlayer = state.players.find(p => p.isIt);
  const timeLeft = Math.ceil(state.roundTimeRemaining);

  // Timer
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = timeLeft <= 10 ? "#FF4444" : "#FFFFFF";
  ctx.fillText(formatTime(timeLeft), canvasW / 2, 32);

  // "IT" indicator
  if (itPlayer) {
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#FF6B6B";
    ctx.fillText(`🔴 ${itPlayer.name} is IT`, 20, 32);
  }

  // Power-ups on right
  const localPlayer = state.players[localPlayerIndex];
  if (localPlayer) {
    const rightX = canvasW - 20;
    ctx.textAlign = "right";

    // Held power-up
    if (localPlayer.heldPowerUp) {
      const config = POWER_UP_CONFIGS[localPlayer.heldPowerUp];
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = config.color;
      ctx.fillText(`${config.icon} ${config.name} [E]`, rightX, 20);
    }

    // Active power-up
    if (localPlayer.activePowerUp) {
      const config = POWER_UP_CONFIGS[localPlayer.activePowerUp.type];
      const pct = localPlayer.activePowerUp.remainingMs / localPlayer.activePowerUp.durationMs;
      ctx.font = "12px sans-serif";
      ctx.fillStyle = config.color;
      ctx.fillText(`${config.icon} ${config.name} ${Math.ceil(pct * 100)}%`, rightX, 38);
    }

    // Cooldown
    if (localPlayer.powerUpCooldown > 0) {
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#888";
      ctx.fillText(
        `Cooldown: ${Math.ceil(localPlayer.powerUpCooldown / 1000)}s`,
        rightX,
        localPlayer.heldPowerUp ? 38 : 20
      );
    }
  }

  // Score panel (bottom of HUD or additional info)
  let scoreX = 20;
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  for (const p of state.players) {
    ctx.fillStyle = p.isIt ? "#FF6B6B" : p.color;
    ctx.fillText(`${p.name}: ${p.score}`, scoreX, HUD_HEIGHT - 8);
    scoreX += ctx.measureText(`${p.name}: ${p.score}`).width + 20;
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
