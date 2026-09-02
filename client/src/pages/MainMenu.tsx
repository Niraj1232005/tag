import { Link } from "react-router-dom";

export default function MainMenu() {
  return (
    <div style={styles.container}>
      <div style={styles.titleArea}>
        <h1 style={styles.title}>CHASE TAG</h1>
        <p style={styles.subtitle}>How long can you avoid being "It"?</p>
      </div>

      <div style={styles.menu}>
        <Link to="/local" style={styles.menuButton}>
          <span style={styles.menuIcon}>🎮</span>
          <span style={styles.menuLabel}>Play Local</span>
          <span style={styles.menuDesc}>2-4 players, same keyboard</span>
        </Link>

        <Link to="/create-room" style={styles.menuButton}>
          <span style={styles.menuIcon}>🏠</span>
          <span style={styles.menuLabel}>Create Room</span>
          <span style={styles.menuDesc}>Host an online game</span>
        </Link>

        <Link to="/join-room" style={styles.menuButton}>
          <span style={styles.menuIcon}>🔗</span>
          <span style={styles.menuLabel}>Join Room</span>
          <span style={styles.menuDesc}>Enter a room code</span>
        </Link>
      </div>

      <div style={styles.footer}>
        <p>WASD to move • E for power-ups • Tag or be tagged!</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)",
    padding: "2rem",
  },
  titleArea: {
    textAlign: "center",
    marginBottom: "3rem",
  },
  title: {
    fontSize: "4rem",
    fontWeight: 900,
    background: "linear-gradient(90deg, #FF6B6B, #FFE66D, #4ECDC4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    margin: 0,
  },
  subtitle: {
    color: "#888",
    fontSize: "1.1rem",
    marginTop: "0.5rem",
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "100%",
    maxWidth: "360px",
  },
  menuButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "1.2rem 2rem",
    background: "rgba(255,255,255,0.05)",
    border: "2px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    textDecoration: "none",
    color: "#fff",
    transition: "all 0.2s",
    cursor: "pointer",
  },
  menuIcon: {
    fontSize: "2rem",
    marginBottom: "0.3rem",
  },
  menuLabel: {
    fontSize: "1.3rem",
    fontWeight: 700,
  },
  menuDesc: {
    fontSize: "0.85rem",
    color: "#888",
    marginTop: "0.2rem",
  },
  footer: {
    marginTop: "3rem",
    color: "#555",
    fontSize: "0.85rem",
    textAlign: "center",
  },
};
