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
  PLAYER_SIZE,
  HUD_HEIGHT,
} from "chase-tag-shared";

const COLYSEUS_URL = import.meta.env.VITE_COLYSEUS_URL || "ws://localhost:2567";

export default function OnlineGame() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const myName = searchParams.get("name") ?? "Player";
  const isHost = searchParams.get("host") === "true";

  const [status, setStatus] = useState<"connecting" | "lobby" | "playing" | "ended">("connecting");
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [roundResult, setRoundResult] = useState<any>(null);

  const clientRef = useRef<Colyseus.Client | null>(null);
  const roomRef = useRef<Colyseus.Room | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const connect = async () => {
      try {
        const client = new Colyseus.Client(COLYSEUS_URL);
        clientRef.current = client;

        const room = await client.joinOrCreate("tag_room", {
          name: myName,
          config: isHost ? {
            roundLength: 120,
            mapName: "arena",
            powerUpsEnabled: true,
          } : undefined,
        });

        roomRef.current = room;

        room.onStateChange((state: any) => {
          const p: PlayerState[] = [];
          if (state.players) {
            state.players.forEach((value: any, key: string) => {
              p.push({ ...value, id: key });
            });
          }
          setPlayers(p);
          if (state.gameStarted && status !== "playing") setStatus("playing");
        });

        room.onMessage("gameStarted", () => setStatus("playing"));

        room.onMessage("roundEnd", (data: any) => {
          setRoundResult(data);
          setStatus("ended");
        });

        setStatus("lobby");
      } catch (err) {
        console.error("Failed to connect:", err);
        setStatus("connecting");
      }
    };

    connect();

    return () => {
      roomRef.current?.leave();
      cancelAnimationFrame(rafRef.current);
    };
  }, [myName, isHost]);

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

      const state = room.state;
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

  const handleStartGame = useCallback(() => {
    roomRef.current?.send("startGame");
  }, []);

  if (status === "connecting") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Connecting...</h2>
          <p style={styles.hint}>Make sure the Colyseus server is running on {COLYSEUS_URL}</p>
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
            {isHost && (
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
          <h2 style={styles.heading}>Room: {roomId}</h2>
          <p style={styles.hint}>Room code: <strong style={{ color: "#FFE66D" }}>{roomId}</strong></p>

          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ color: "#aaa", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Players ({players.length}/13)
            </h3>
            {players.map((p, i) => (
              <div key={p.id} style={styles.playerRow}>
                <span style={{ ...styles.playerColor, background: p.color }} />
                <span style={{ color: "#ddd", fontSize: "0.95rem", flex: 1 }}>{p.name}</span>
                {p.ready ? (
                  <span style={{ color: "#4ECDC4", fontSize: "0.8rem", fontWeight: 700 }}>Ready</span>
                ) : (
                  <span style={{ color: "#666", fontSize: "0.8rem" }}>Not Ready</span>
                )}
              </div>
            ))}
          </div>

          {isHost && (
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

  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, map.width, map.height);

  ctx.strokeStyle = "#16213e";
  ctx.lineWidth = 1;
  for (let x = 0; x < map.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, map.height); ctx.stroke();
  }
  for (let y = 0; y < map.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(map.width, y); ctx.stroke();
  }

  ctx.fillStyle = "#2d2d5e";
  ctx.strokeStyle = "#4a4a8a";
  ctx.lineWidth = 2;
  for (const o of map.obstacles) {
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeRect(o.x, o.y, o.w, o.h);
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
      const config = POWER_UP_CONFIGS[spawn.type as keyof typeof POWER_UP_CONFIGS];
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
      const isGhost = player.activePowerUp?.type === "ghost_step";
      const isFrozen = player.activePowerUp?.type === "freeze_pulse";
      const hasBubble = player.activePowerUp?.type === "safe_bubble";

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

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + PLAYER_SIZE, PLAYER_SIZE, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isFrozen ? "#6699CC" : color;
  ctx.beginPath(); ctx.arc(cx, cy, PLAYER_SIZE, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = isIt ? "#FF0000" : "#FFFFFF";
  ctx.lineWidth = isIt ? 3 : 2;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(cx - 5, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 5, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(cx - 5, cy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 5, cy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
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
