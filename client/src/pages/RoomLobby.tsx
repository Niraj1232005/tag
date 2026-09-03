import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PLAYER_COLORS } from "chase-tag-shared";

interface LobbyPlayer {
  id: string;
  name: string;
  ready: boolean;
  color: string;
}

export default function RoomLobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const normalizedRoomCode = (roomId ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const navigate = useNavigate();
  const roomOptions = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`tag-room-options:${normalizedRoomCode}`) ?? "{}");
    } catch {
      return {};
    }
  }, [normalizedRoomCode]);

  const isHost = roomOptions.host === true;
  const myName = roomOptions.name ?? "Player";

  const [players, setPlayers] = useState<LobbyPlayer[]>([
    {
      id: "host",
      name: isHost ? myName : "Host",
      ready: true,
      color: PLAYER_COLORS[0],
    },
  ]);
  const [myReady, setMyReady] = useState(false);
  const [simulating, setSimulating] = useState(true);

  useEffect(() => {
    if (!isHost) {
      setPlayers(prev => [
        prev[0],
        { id: "me", name: myName, ready: false, color: PLAYER_COLORS[1] },
      ]);
    } else {
      setPlayers(prev => [
        { ...prev[0], name: myName },
      ]);
    }
  }, [isHost, myName]);

  useEffect(() => {
    if (!simulating) return;
    const names = ["Chaser", "Runner", "Swift", "Ninja", "Dash"];
    let added = 0;

    const timer = setInterval(() => {
      if (added >= 2) {
        clearInterval(timer);
        setSimulating(false);
        return;
      }
      const idx = players.length;
      setPlayers(prev => [
        ...prev,
        {
          id: `bot_${idx}`,
          name: names[idx % names.length],
          ready: Math.random() > 0.5,
          color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
        },
      ]);
      added++;
    }, 2000);

    return () => clearInterval(timer);
  }, [simulating]);

  const toggleReady = useCallback(() => {
    setMyReady(r => !r);
    setPlayers(prev => prev.map(p =>
      p.id === "me" || (isHost && p.id === "host")
        ? { ...p, ready: !myReady }
        : p
    ));
  }, [myReady, isHost]);

  const startGame = useCallback(() => {
    navigate("/local");
  }, [navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Room Lobby</h2>

        <div style={styles.roomCode}>
          <span style={styles.codeLabel}>Room Code</span>
          <span style={styles.codeValue}>{roomId}</span>
          <button
            onClick={() => navigator.clipboard?.writeText(roomId ?? "")}
            style={styles.copyBtn}
          >
            Copy
          </button>
        </div>

        <div style={styles.playerList}>
          {players.map((p, i) => (
            <div key={p.id} style={styles.playerRow}>
              <span style={{ ...styles.playerColor, background: p.color }} />
              <span style={styles.playerName}>{p.name}</span>
              {p.id === "me" || (isHost && p.id === "host") ? (
                <span style={styles.youBadge}>You</span>
              ) : null}
              <span style={{
                ...styles.readyBadge,
                background: p.ready ? "rgba(78, 205, 196, 0.2)" : "rgba(255,255,255,0.05)",
                color: p.ready ? "#4ECDC4" : "#666",
              }}>
                {p.ready ? "Ready" : "Not Ready"}
              </span>
            </div>
          ))}
        </div>

        <div style={styles.buttonRow}>
          <button onClick={toggleReady} style={styles.readyBtn}>
            {myReady ? "Unready" : "Ready Up"}
          </button>
          {isHost && (
            <button onClick={startGame} style={styles.startBtn}>
              Start Game
            </button>
          )}
        </div>

        <p style={styles.hint}>
          Share the room code with friends to play together!
        </p>
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
  roomCode: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    marginBottom: "1.5rem",
    padding: "0.75rem",
    background: "rgba(0,0,0,0.3)",
    borderRadius: "10px",
  },
  codeLabel: {
    color: "#888",
    fontSize: "0.85rem",
    textTransform: "uppercase",
  },
  codeValue: {
    color: "#FFE66D",
    fontSize: "1.8rem",
    fontWeight: 900,
    letterSpacing: "0.15em",
    fontFamily: "monospace",
  },
  copyBtn: {
    padding: "0.3rem 0.6rem",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "4px",
    color: "#aaa",
    fontSize: "0.75rem",
    cursor: "pointer",
  },
  playerList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginBottom: "1.5rem",
  },
  playerRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.6rem 1rem",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "8px",
  },
  playerColor: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  playerName: {
    color: "#ddd",
    fontSize: "1rem",
    fontWeight: 600,
    flex: 1,
  },
  youBadge: {
    color: "#4ECDC4",
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  readyBadge: {
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "0.2rem 0.5rem",
    borderRadius: "4px",
  },
  buttonRow: {
    display: "flex",
    gap: "0.75rem",
  },
  readyBtn: {
    flex: 1,
    padding: "0.8rem",
    background: "rgba(255, 107, 107, 0.2)",
    border: "2px solid #FF6B6B",
    borderRadius: "10px",
    color: "#FF6B6B",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  startBtn: {
    flex: 1,
    padding: "0.8rem",
    background: "linear-gradient(135deg, #4ECDC4, #2ABFB5)",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  hint: {
    color: "#555",
    fontSize: "0.8rem",
    textAlign: "center",
    marginTop: "1rem",
  },
};
