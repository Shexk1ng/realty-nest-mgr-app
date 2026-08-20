"use client";

// Awaryjny ekran błędu pokazywany, gdy zawiedzie główny układ dokumentu

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background: "#0b0f14",
          color: "#f1f5f9",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
          Something went wrong
        </h1>
        <p style={{ marginTop: "0.75rem", maxWidth: "28rem", opacity: 0.85 }}>
          The application hit a critical error. Try again or refresh the page.
        </p>
        {process.env.NODE_ENV === "development" && error.message ? (
          <pre
            style={{
              marginTop: "1rem",
              maxWidth: "100%",
              overflow: "auto",
              padding: "0.75rem",
              fontSize: "0.75rem",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "0.5rem",
              textAlign: "left",
            }}
          >
            {error.message}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "1.5rem",
            padding: "0.6rem 1.25rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            background: "#2563eb",
            color: "#fff",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
