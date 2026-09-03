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

const SKY_TOP = "#43a5f5";
const SKY_BOTTOM = "#55d3e6";

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

  renderSideStageBackground(ctx, map);

  for (const o of map.obstacles) {
    renderPlatform(ctx, o.x, o.y, o.w, o.h);
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
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(player.name, player.x + PLAYER_SIZE, player.y - 8);
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

  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(cx, y + PLAYER_SIZE * 2 + 3, PLAYER_SIZE * 0.9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isFrozen ? "#6699CC" : color;
  roundRect(ctx, x + 3, y + 5, PLAYER_SIZE * 2 - 6, PLAYER_SIZE * 2 - 3, 8);
  ctx.fill();

  ctx.fillStyle = "#102033";
  roundRect(ctx, x + 7, y + 8, PLAYER_SIZE * 2 - 14, PLAYER_SIZE + 7, 5);
  ctx.fill();

  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  roundRect(ctx, x + 3, y + 5, PLAYER_SIZE * 2 - 6, PLAYER_SIZE * 2 - 3, 8);
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath(); ctx.arc(cx - 5, cy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 5, cy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.beginPath(); ctx.arc(cx - 5, cy - 2, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 5, cy - 2, 1.2, 0, Math.PI * 2); ctx.fill();

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

  // "IT" arrow indicator above the player
  if (isIt) {
    const arrowY = y - 18;
    ctx.fillStyle = "#FF6B6B";
    ctx.save();
    ctx.translate(cx, arrowY);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-7, 9);
    ctx.lineTo(7, 9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, 16);
    ctx.strokeStyle = "#FF6B6B";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function renderSideStageBackground(ctx: CanvasRenderingContext2D, map: GameMap) {
  const gradient = ctx.createLinearGradient(0, 0, 0, map.height);
  gradient.addColorStop(0, SKY_TOP);
  gradient.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, map.width, map.height);

  ctx.fillStyle = "rgba(44, 107, 190, 0.22)";
  ctx.beginPath();
  ctx.ellipse(map.width * 0.78, map.height * 0.62, map.width * 0.28, 70, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(map.width * 0.36, map.height * 0.7, map.width * 0.32, 60, 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(50, 107, 200, 0.28)";
  for (let x = -80; x < map.width; x += 260) {
    ctx.fillRect(x + 90, map.height * 0.42, 170, map.height * 0.28);
    ctx.fillRect(x + 125, map.height * 0.38, 100, map.height * 0.06);
  }
}

function renderPlatform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#2ee870";
  ctx.fillRect(x, y, w, 9);
  ctx.fillStyle = "#ff3f8e";
  ctx.fillRect(x, y + 9, w, h - 9);
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.fillRect(x, y, w, 2);

  ctx.strokeStyle = "rgba(24, 157, 75, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let px = x + 8; px < x + w; px += 14) {
    ctx.lineTo(px, y + 11 + ((px / 14) % 2) * 4);
  }
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
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

  const timeLeft = Math.ceil(state.roundTimeRemaining);

  // Timer
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = timeLeft <= 10 ? "#FF4444" : "#FFFFFF";
  ctx.fillText(formatTime(timeLeft), canvasW / 2, 32);

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
