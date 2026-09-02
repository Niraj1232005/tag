import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  type GameMap,
  MAPS,
  MAP_NAMES,
  PLAYER_COLORS,
} from "chase-tag-shared";
import {
  createLocalGame,
  updateLocalGame,
  spawnPowerUps,
  type LocalGameState,
} from "../game/engine.js";
import { renderGame, renderHUD } from "../game/renderer.js";
import { useLocalInputs, KEY_BINDINGS } from "../hooks/useLocalInputs.js";

const MAP_KEYS = Object.keys(MAPS);

export default function LocalPlay() {
  const navigate = useNavigate();
  const [numPlayers, setNumPlayers] = useState(2);
  const [roundLength, setRoundLength] = useState(120);
  const [selectedMap, setSelectedMap] = useState<string>("arena");
  const [gameStarted, setGameStarted] = useState(false);
  const [playerNames, setPlayerNames] = useState(["P1", "P2", "P3", "P4"]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<LocalGameState | null>(null);
  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const powerUpTimerRef = useRef<number>(0);
  const getInputs = useLocalInputs(numPlayers);

  const startGame = useCallback(() => {
    const map = MAPS[selectedMap];
    const names = playerNames.slice(0, numPlayers);
    gameRef.current = createLocalGame(map, names, roundLength);
    gameRef.current.running = true;
    powerUpTimerRef.current = 0;
    setGameStarted(true);
  }, [selectedMap, numPlayers, roundLength, playerNames]);

  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game || game.ended) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
    lastTimeRef.current = timestamp;

    const inputs = getInputs();
    updateLocalGame(game, inputs, dt);

    powerUpTimerRef.current += dt;
    if (powerUpTimerRef.current > 12000) {
      powerUpTimerRef.current = 0;
      spawnPowerUps(game);
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    renderHUD(ctx, game, canvas.width, 0);
    renderGame(ctx, game, canvas.width, canvas.height);

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [getInputs]);

  useEffect(() => {
    if (gameStarted) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(gameLoop);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [gameStarted, gameLoop]);

  const handleRestart = useCallback(() => {
    setGameStarted(false);
    gameRef.current = null;
  }, []);

  if (gameStarted && gameRef.current?.ended) {
    const result = gameRef.current.result;
    const itPlayer = gameRef.current.players.find(p => p.isIt);
    return (
      <div style={styles.container}>
        <div style={styles.resultCard}>
          <h1 style={styles.resultTitle}>Round Over!</h1>
          <p style={styles.resultLoser}>
            {result?.loserName ?? "Unknown"} was "It" when time ran out!
          </p>
          <p style={styles.resultSub}>They lose the round.</p>

          <div style={styles.scores}>
            {gameRef.current.players.map(p => (
              <div key={p.id} style={{ ...styles.scoreRow, color: p.color }}>
                {p.name}: {p.score} tags {p.isIt ? "(was IT)" : ""}
              </div>
            ))}
          </div>

          <div style={styles.buttonRow}>
            <button onClick={handleRestart} style={styles.button}>
              Play Again
            </button>
            <button onClick={() => navigate("/")} style={styles.buttonSecondary}>
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameStarted) {
    return (
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100vw", height: "100vh", background: "#0f0f23" }}
      />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Local Play Setup</h2>

        <div style={styles.field}>
          <label style={styles.label}>Players</label>
          <div style={styles.buttonGroup}>
            {[2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setNumPlayers(n)}
                style={numPlayers === n ? styles.selectedBtn : styles.optionBtn}
              >
                {n} Players
              </button>
            ))}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Player Names</label>
          <div style={styles.nameGrid}>
            {Array.from({ length: numPlayers }).map((_, i) => (
              <input
                key={i}
                value={playerNames[i]}
                onChange={e => {
                  const next = [...playerNames];
                  next[i] = e.target.value;
                  setPlayerNames(next);
                }}
                style={{
                  ...styles.nameInput,
                  borderColor: PLAYER_COLORS[i],
                }}
                maxLength={12}
              />
            ))}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Round Length</label>
          <div style={styles.buttonGroup}>
            {[60, 120, 180].map(s => (
              <button
                key={s}
                onClick={() => setRoundLength(s as 60 | 120 | 180)}
                style={roundLength === s ? styles.selectedBtn : styles.optionBtn}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Map</label>
          <div style={styles.buttonGroup}>
            {MAP_KEYS.map(key => (
              <button
                key={key}
                onClick={() => setSelectedMap(key)}
                style={selectedMap === key ? styles.selectedBtn : styles.optionBtn}
              >
                {MAP_NAMES[key]}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Controls</label>
          <div style={styles.controlsList}>
            {KEY_BINDINGS.slice(0, numPlayers).map((b, i) => (
              <div key={i} style={styles.controlRow}>
                <span style={{ ...styles.controlPlayer, color: PLAYER_COLORS[i] }}>
                  P{i + 1}:
                </span>
                <span style={styles.controlKeys}>{b.keys}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={startGame} style={styles.startBtn}>
          Start Game
        </button>
        <button onClick={() => navigate("/")} style={styles.backBtn}>
          Back
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
  },
  heading: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#fff",
    marginBottom: "1.5rem",
    textAlign: "center",
  },
  field: {
    marginBottom: "1.2rem",
  },
  label: {
    display: "block",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#aaa",
    marginBottom: "0.5rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  buttonGroup: {
    display: "flex",
    gap: "0.5rem",
  },
  optionBtn: {
    flex: 1,
    padding: "0.6rem 1rem",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    color: "#ccc",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  selectedBtn: {
    flex: 1,
    padding: "0.6rem 1rem",
    background: "rgba(78, 205, 196, 0.2)",
    border: "2px solid #4ECDC4",
    borderRadius: "8px",
    color: "#4ECDC4",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  nameGrid: {
    display: "flex",
    gap: "0.5rem",
  },
  nameInput: {
    flex: 1,
    padding: "0.5rem",
    background: "rgba(0,0,0,0.3)",
    border: "2px solid",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "0.9rem",
    textAlign: "center",
    outline: "none",
    width: "80px",
  },
  controlsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  controlRow: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
  },
  controlPlayer: {
    fontWeight: 700,
    fontSize: "0.85rem",
    minWidth: "30px",
  },
  controlKeys: {
    color: "#999",
    fontSize: "0.85rem",
    fontFamily: "monospace",
  },
  startBtn: {
    width: "100%",
    padding: "0.9rem",
    background: "linear-gradient(135deg, #4ECDC4, #2ABFB5)",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "1.1rem",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  backBtn: {
    width: "100%",
    padding: "0.7rem",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "10px",
    color: "#888",
    fontSize: "0.9rem",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  resultCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    padding: "2.5rem",
    textAlign: "center",
    maxWidth: "480px",
  },
  resultTitle: {
    fontSize: "2.5rem",
    color: "#FF6B6B",
    marginBottom: "0.5rem",
  },
  resultLoser: {
    fontSize: "1.2rem",
    color: "#FFE66D",
    marginBottom: "0.3rem",
  },
  resultSub: {
    fontSize: "0.9rem",
    color: "#888",
    marginBottom: "1.5rem",
  },
  scores: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    marginBottom: "1.5rem",
  },
  scoreRow: {
    fontSize: "1rem",
    fontWeight: 600,
  },
  buttonRow: {
    display: "flex",
    gap: "0.75rem",
  },
  button: {
    flex: 1,
    padding: "0.8rem",
    background: "#4ECDC4",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  buttonSecondary: {
    flex: 1,
    padding: "0.8rem",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "10px",
    color: "#ccc",
    fontSize: "1rem",
    cursor: "pointer",
  },
};
