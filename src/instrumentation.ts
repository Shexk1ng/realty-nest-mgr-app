// Start serwera: sprawdza wymagane zmienne środowiskowe i ostrzega o brakujących opcjonalnych

const REQUIRED = ["AUTH_SECRET", "GRAPHQL_INTERNAL_URL"] as const;

const OPTIONAL: Record<string, string> = {
  CLOUDINARY_CLOUD_NAME: "uploads and document delivery",
  CLOUDINARY_API_KEY: "uploads and document delivery",
  CLOUDINARY_API_SECRET: "uploads and document delivery",
  GEMINI_API_KEY: "AI features",
  RESEND_API_KEY: "outbound email (falls back to console in development)",
};

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Copy .env.example to .env.local and fill them in.`,
    );
  }

  if ((process.env.AUTH_SECRET ?? "").length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters.");
  }

  if (process.env.NODE_ENV === "production") {
    const degraded = Object.entries(OPTIONAL)
      .filter(([k]) => !process.env[k]?.trim())
      .map(([k, feature]) => `${k} (${feature})`);
    if (degraded.length > 0) {
      console.warn(`[startup] Running without: ${degraded.join("; ")}`);
    }
  }
}
