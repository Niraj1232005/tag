import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import * as Colyseus from "colyseus.js";
import {
  type PlayerState,
  type PowerUpSpawn,
  type StickyPatch,
  type Decoy,
  type GameMap,
  MAPS,
  PLAYER_COLORS,
  POWER_UP_CONFIGS,
  POWER_UP_INDEX_TO_TYPE,
  PLAYER_SIZE,
  HUD_HEIGHT,
} from "chase-tag-shared";

const COLYSEUS_URL = import.meta.env.VITE_COLYSEUS_URL || "ws://localhost:2567";
const ROOM_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generatePublicRoomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function lobbyPlayerToState(player: any): PlayerState {
  return {
    id: player.id,
    name: player.name,
    x: player.x ?? 0,
    y: player.y ?? 0,
    vx: player.vx ?? 0,
    vy: player.vy ?? 0,
    isIt: !!player.isIt,
    alive: player.alive ?? true,
    facing: { x: player.facingX ?? 1, y: player.facingY ?? 0 },
    color: player.color,
    score: player.score ?? 0,
    ready: !!player.ready,
    activePowerUp: player.activePowerUpType >= 0 ? {
      type: POWER_UP_INDEX_TO_TYPE[player.activePowerUpType],
      remainingMs: player.activePowerUpRemaining,
      durationMs: player.activePowerUpDuration,
    } : null,
    powerUpCooldown: player.powerUpCooldown ?? 0,
    heldPowerUp: player.heldPowerUp >= 0 ? POWER_UP_INDEX_TO_TYPE[player.heldPowerUp] : null,
  };
}

export default function OnlineGame() {
  const { roomId } = useParams<{ roomId: string }>();
  const normalizedRoomCode = (roomId ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const myName = searchParams.get("name") ?? "Player";
  const isHost = searchParams.get("host") === "true";
  const hostKey = searchParams.get("hostKey") ?? undefined;
  const roundLengthParam = searchParams.get("roundLength") ?? "120";
  const mapNameParam = searchParams.get("mapName") ?? "arena";
  const powerUpsEnabledParam = searchParams.get("powerUpsEnabled") ?? "true";
  const searchString = searchParams.toString();

  const [status, setStatus] = useState<"connecting" | "lobby" | "playing" | "ended">("connecting");
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [roundResult, setRoundResult] = useState<any>(null);
  const [actualRoomId, setActualRoomId] = useState(normalizedRoomCode);
  const [serverHostId, setServerHostId] = useState("");
  const [connectionError, setConnectionError] = useState("");

  const clientRef = useRef<Colyseus.Client | null>(null);
  const roomRef = useRef<Colyseus.Room | null>(null);
  const gameFrameRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const connect = async () => {
      try {
        const client = new Colyseus.Client(COLYSEUS_URL);
        clientRef.current = client;

        const publicRoomCode = normalizedRoomCode === "NEW" ? generatePublicRoomCode() : normalizedRoomCode;
        const joinOptions = { name: myName, hostKey, roomCode: publicRoomCode };
        let room: Colyseus.Room;
        if (isHost) {
          try {
            room = await client.join("tag_room", joinOptions);
          } catch {
            room = await client.create("tag_room", {
              ...joinOptions,
              config: {
                roundLength: Number(roundLengthParam),
                mapName: mapNameParam,
                powerUpsEnabled: powerUpsEnabledParam !== "false",
              },
            });
          }
        } else {
          room = await client.join("tag_room", joinOptions);
        }

        roomRef.current = room;
        setActualRoomId(publicRoomCode);
        setConnectionError("");

        if (normalizedRoomCode === "NEW") {
          const params = new URLSearchParams(searchString);
          window.history.replaceState(null, "", `/online/${publicRoomCode}?${params.toString()}`);
        }

        const syncState = (state: any) => {
          const p: PlayerState[] = [];
          if (state.players) {
            state.players.forEach((value: any, key: string) => {
              p.push(lobbyPlayerToState({ ...value, id: value.id || key }));
            });
          }
          setPlayers(p);
          setServerHostId(state.hostId ?? "");
          setStatus(state.gameStarted ? "playing" : "lobby");
        };

        room.onStateChange(syncState);
        room.onMessage("lobbyState", (data: any) => {
          setPlayers((data.players ?? []).map(lobbyPlayerToState));
          setServerHostId(data.hostId ?? "");
          if (data.roomCode) setActualRoomId(String(data.roomCode).toUpperCase().replace(/[^A-Z0-9]/g, ""));
        });
        room.onMessage("gameFrame", (frame: any) => {
          gameFrameRef.current = frame;
          setPlayers((frame.players ?? []).map(lobbyPlayerToState));
          setServerHostId(frame.hostId ?? "");
          if (frame.roomCode) setActualRoomId(String(frame.roomCode).toUpperCase().replace(/[^A-Z0-9]/g, ""));
        });
        syncState(room.state);
        room.send("requestLobbyState");

        room.onMessage("gameStarted", () => {
          setRoundResult(null);
          setStatus("playing");
        });

        room.onMessage("roundEnd", (data: any) => {
          setRoundResult(data);
          setStatus("ended");
        });


      } catch (err) {
        console.error("Failed to connect:", err);
        setConnectionError(err instanceof Error ? err.message : "Unable to connect to room");
        setStatus("connecting");
      }
    };

    connect();

    return () => {
      gameFrameRef.current = null;
      roomRef.current?.leave();
      cancelAnimationFrame(rafRef.current);
    };
  }, [myName, isHost, hostKey, normalizedRoomCode, roundLengthParam, mapNameParam, powerUpsEnabledParam, searchString]);

  useEffect(() => {
    if (status !== "playing") return;

    const handleDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);

    const sendInput = () => {
      const room = roomRef.current;
      if (!room) return;
      room.send("input", {
        up: !!keysRef.current["w"],
        down: !!keysRef.current["s"],
        left: !!keysRef.current["a"],
        right: !!keysRef.current["d"],
        usePowerUp: !!keysRef.current["e"],
      });
      keysRef.current["e"] = false;
    };

    const inputInterval = setInterval(sendInput, 1000 / 30);

    const gameLoop = () => {
      const canvas = canvasRef.current;
      const room = roomRef.current;
      if (!canvas || !room) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const state = gameFrameRef.current ?? room.state;
      const map = MAPS[state.mapName] ?? MAPS.arena;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      renderOnlineHUD(ctx, state, canvas.width);
      renderOnlineGame(ctx, state, canvas.width, canvas.height, map);

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      clearInterval(inputInterval);
      cancelAnimationFrame(rafRef.current);
    };
  }, [status]);

  const amHost = serverHostId ? roomRef.current?.sessionId === serverHostId : isHost;

  const handleStartGame = useCallback(() => {
    roomRef.current?.send("startGame");
  }, []);

  if (status === "connecting") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Connecting...</h2>
          <p style={styles.hint}>{connectionError || `Make sure the Colyseus server is running on ${COLYSEUS_URL}`}</p>
          <button onClick={() => navigate("/")} style={styles.backBtn}>Back to Menu</button>
        </div>
      </div>
    );
  }

  if (status === "ended" && roundResult) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Round Over!</h2>
          <p style={{ color: "#FFE66D", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            {roundResult.loserName} was "It" when time ran out!
          </p>
          <div style={{ marginBottom: "1rem" }}>
            {roundResult.scores?.map((s: any) => (
              <div key={s.id} style={{ color: s.wasIt ? "#FF6B6B" : "#4ECDC4", padding: "0.3rem 0" }}>
                {s.name}: {s.score} tags {s.wasIt ? "(was IT)" : ""}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {amHost && (
              <button onClick={handleStartGame} style={styles.startBtn}>Rematch</button>
            )}
            <button onClick={() => navigate("/")} style={styles.backBtn}>Main Menu</button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "lobby") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Room: {actualRoomId}</h2>
          <p style={styles.hint}>Room code: <strong style={{ color: "#FFE66D" }}>{actualRoomId}</strong></p>

          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ color: "#aaa", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Participants ({players.length}/13)
            </h3>
            {players.length === 0 ? (
              <p style={styles.hint}>Waiting for room state...</p>
            ) : players.map((p) => (
              <div key={p.id} style={styles.playerRow}>
                <span style={{ ...styles.playerColor, background: p.color }} />
                <span style={{ color: "#ddd", fontSize: "0.95rem", flex: 1 }}>{p.name}</span>
                {p.id === serverHostId && (
                  <span style={{ color: "#FFE66D", fontSize: "0.75rem", fontWeight: 700 }}>HOST</span>
                )}
                {p.isIt && (
                  <span style={{ color: "#FF6B6B", fontSize: "0.75rem", fontWeight: 700 }}>IT</span>
                )}
              </div>
            ))}
          </div>

          {amHost && (
            <button onClick={handleStartGame} style={styles.startBtn}>
              Start Game
            </button>
          )}
          <button onClick={() => navigate("/")} style={styles.backBtn}>Leave Room</button>
        </div>
      </div>
    );
  }

  if (status === "playing") {
    return (
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100vw", height: "100vh", background: "#0f0f23" }}
      />
    );
  }

  return null;
}

function renderOnlineGame(
  ctx: CanvasRenderingContext2D,
  state: any,
  canvasW: number,
  canvasH: number,
  map: GameMap
) {
  const offsetX = Math.floor((canvasW - map.width) / 2);
  const offsetY = Math.floor((canvasH - HUD_HEIGHT - map.height) / 2) + HUD_HEIGHT;

  ctx.save();
  ctx.translate(offsetX, offsetY);

  renderOnlineStageBackground(ctx, map);

  for (const o of map.obstacles) {
    renderOnlinePlatform(ctx, o.x, o.y, o.w, o.h);
  }

  if (state.stickyPatches) {
    state.stickyPatches.forEach((sp: any) => {
      const alpha = Math.min(1, sp.remainingMs / 1000);
      ctx.fillStyle = `rgba(139, 69, 19, ${alpha * 0.5})`;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 40, 0, Math.PI * 2); ctx.fill();
    });
  }

  if (state.spawns) {
    state.spawns.forEach((spawn: any) => {
      const type = POWER_UP_INDEX_TO_TYPE[spawn.type];
      const config = type ? POWER_UP_CONFIGS[type] : undefined;
      if (!config) return;
      ctx.fillStyle = config.color;
      ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 300) * 0.3;
      ctx.beginPath(); ctx.arc(spawn.x, spawn.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff"; ctx.fillText(config.icon, spawn.x, spawn.y);
    });
  }

  if (state.players) {
    state.players.forEach((player: any, id: string) => {
      const activePowerUpType = POWER_UP_INDEX_TO_TYPE[player.activePowerUpType];
      const isGhost = activePowerUpType === "ghost_step";
      const isFrozen = activePowerUpType === "freeze_pulse";
      const hasBubble = activePowerUpType === "safe_bubble";

      if (isGhost) ctx.globalAlpha = 0.25;

      drawOnlinePlayer(ctx, player.x, player.y, player.color, player.isIt, isFrozen);

      if (hasBubble) {
        ctx.strokeStyle = "#32CD32"; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + PLAYER_SIZE, player.y + PLAYER_SIZE, PLAYER_SIZE + 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = player.isIt ? "#FF4444" : "#FFFFFF";
      ctx.fillText(player.name, player.x + PLAYER_SIZE, player.y - 8);

      if (player.isIt) {
        ctx.font = "bold 13px sans-serif";
        ctx.fillStyle = "#FF6B6B";
        ctx.fillText("IT", player.x + PLAYER_SIZE, player.y - 22);
      }
    });
  }

  ctx.restore();
}

function drawOnlinePlayer(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string, isIt: boolean, isFrozen: boolean
) {
  const cx = x + PLAYER_SIZE;
  const cy = y + PLAYER_SIZE;

  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(cx, y + PLAYER_SIZE * 2 + 3, PLAYER_SIZE * 0.9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isFrozen ? "#6699CC" : color;
  roundOnlineRect(ctx, x + 3, y + 5, PLAYER_SIZE * 2 - 6, PLAYER_SIZE * 2 - 3, 8);
  ctx.fill();

  ctx.fillStyle = "#102033";
  roundOnlineRect(ctx, x + 7, y + 8, PLAYER_SIZE * 2 - 14, PLAYER_SIZE + 7, 5);
  ctx.fill();

  ctx.strokeStyle = isIt ? "#FF2D2D" : "#FFFFFF";
  ctx.lineWidth = isIt ? 3 : 2;
  roundOnlineRect(ctx, x + 3, y + 5, PLAYER_SIZE * 2 - 6, PLAYER_SIZE * 2 - 3, 8);
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath(); ctx.arc(cx - 5, cy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 5, cy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.beginPath(); ctx.arc(cx - 5, cy - 2, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 5, cy - 2, 1.2, 0, Math.PI * 2); ctx.fill();
}

function renderOnlineStageBackground(ctx: CanvasRenderingContext2D, map: GameMap) {
  const gradient = ctx.createLinearGradient(0, 0, 0, map.height);
  gradient.addColorStop(0, "#43a5f5");
  gradient.addColorStop(1, "#55d3e6");
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

function renderOnlinePlatform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
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

function roundOnlineRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function renderOnlineHUD(ctx: CanvasRenderingContext2D, state: any, canvasW: number) {
  ctx.fillStyle = "rgba(15, 15, 35, 0.95)";
  ctx.fillRect(0, 0, canvasW, HUD_HEIGHT);

  ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, HUD_HEIGHT); ctx.lineTo(canvasW, HUD_HEIGHT); ctx.stroke();

  const timeLeft = Math.ceil(state.roundTimeRemaining ?? 0);
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;

  ctx.font = "bold 20px monospace"; ctx.textAlign = "center";
  ctx.fillStyle = timeLeft <= 10 ? "#FF4444" : "#FFFFFF";
  ctx.fillText(`${m}:${s.toString().padStart(2, "0")}`, canvasW / 2, 32);

  let itName = "";
  if (state.players) {
    state.players.forEach((p: any) => {
      if (p.isIt) itName = p.name;
    });
  }
  if (itName) {
    ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
    ctx.fillStyle = "#FF6B6B";
    ctx.fillText(`🔴 ${itName} is IT`, 20, 32);
  }

  if (state.players) {
    const list: any[] = [];
    state.players.forEach((p: any) => list.push(p));
    const rightX = canvasW - 20;
    ctx.textAlign = "right";
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#FFE66D";
    ctx.fillText(`Participants: ${list.length}/13`, rightX, 18);

    ctx.font = "12px sans-serif";
    list.slice(0, 6).forEach((p, i) => {
      ctx.fillStyle = p.isIt ? "#FF6B6B" : p.color || "#FFFFFF";
      ctx.fillText(`${p.name}${p.isIt ? " • IT" : ""}  ${p.score ?? 0}`, rightX, 35 + i * 15);
    });
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)",
    padding: "1rem",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    padding: "2rem",
    width: "100%",
    maxWidth: "480px",
    textAlign: "center",
  },
  heading: {
    fontSize: "1.5rem", fontWeight: 700, color: "#fff", marginBottom: "1rem",
  },
  hint: {
    color: "#888", fontSize: "0.9rem", marginBottom: "1rem",
  },
  playerRow: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    padding: "0.5rem 1rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px",
    marginBottom: "0.4rem",
  },
  playerColor: {
    width: "12px", height: "12px", borderRadius: "50%", flexShrink: 0,
  },
  startBtn: {
    width: "100%", padding: "0.9rem",
    background: "linear-gradient(135deg, #4ECDC4, #2ABFB5)",
    border: "none", borderRadius: "10px",
    color: "#fff", fontSize: "1.1rem", fontWeight: 700, cursor: "pointer",
    marginBottom: "0.5rem",
  },
  backBtn: {
    width: "100%", padding: "0.7rem",
    background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "10px", color: "#888", fontSize: "0.9rem", cursor: "pointer",
  },
};
