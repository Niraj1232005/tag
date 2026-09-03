import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function JoinRoom() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (!roomCode.trim() || !playerName.trim()) return;
    setJoining(true);
    setError("");

    const code = roomCode.trim();
    navigate(`/online/${encodeURIComponent(code)}?host=false&name=${encodeURIComponent(playerName.trim())}`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Join Room</h2>

        <div style={styles.field}>
          <label style={styles.label}>Room Code</label>
          <input
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="Enter room code"
            style={{ ...styles.input, textAlign: "center", letterSpacing: "0.2em", fontSize: "1.3rem" }}
            maxLength={6}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Your Name</label>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            style={styles.input}
            maxLength={12}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={handleJoin}
          disabled={!roomCode.trim() || !playerName.trim() || joining}
          style={{
            ...styles.joinBtn,
            opacity: !roomCode.trim() || !playerName.trim() || joining ? 0.5 : 1,
          }}
        >
          {joining ? "Joining..." : "Join Room"}
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
    maxWidth: "420px",
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
  },
  input: {
    width: "100%",
    padding: "0.7rem 1rem",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
  },
  error: {
    color: "#FF6B6B",
    fontSize: "0.9rem",
    marginBottom: "1rem",
  },
  joinBtn: {
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
};
