import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MAP_NAMES } from "chase-tag-shared";
import { randomPlayerName } from "../playerNames.js";

const MAP_KEYS = Object.keys(MAP_NAMES);
const ROOM_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateRoomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export default function CreateRoom() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState(() => randomPlayerName());
  const [roundLength, setRoundLength] = useState<60 | 120 | 180>(120);
  const [selectedMap, setSelectedMap] = useState("arena");
  const [powerUps, setPowerUps] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!playerName.trim()) return;
    setCreating(true);

    const code = generateRoomCode();
    sessionStorage.setItem(`tag-room-options:${code}`, JSON.stringify({
      host: true,
      name: playerName.trim(),
      roundLength,
      mapName: selectedMap,
      powerUpsEnabled: powerUps,
      hostKey: crypto.randomUUID(),
    }));
    navigate(`/online/${code}`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Create Room</h2>

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
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={powerUps}
              onChange={e => setPowerUps(e.target.checked)}
              style={styles.checkbox}
            />
            Enable Power-Ups
          </label>
        </div>

        <button
          onClick={handleCreate}
          disabled={!playerName.trim() || creating}
          style={{
            ...styles.createBtn,
            opacity: !playerName.trim() || creating ? 0.5 : 1,
          }}
        >
          {creating ? "Creating..." : "Create Room"}
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
    letterSpacing: "0.05em",
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
  toggleLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "#ccc",
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    accentColor: "#4ECDC4",
  },
  createBtn: {
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
