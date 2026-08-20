// Ekran informujący o nieistniejącym adresie, z odnośnikiem powrotu na stronę główną

import Link from "next/link";

export default function RootNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
        background: "var(--bg)",
        color: "var(--text)",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>404 — Nie znaleziono</h1>
      <p style={{ marginTop: "0.5rem", maxWidth: "24rem", opacity: 0.85 }}>
        Ta ścieżka nie istnieje. Wróć na stronę główną.
      </p>
      <Link
        href="/"
        style={{
          marginTop: "1.25rem",
          color: "var(--accent)",
          fontWeight: 600,
          textDecoration: "underline",
        }}
      >
        Strona główna
      </Link>
    </div>
  );
}
