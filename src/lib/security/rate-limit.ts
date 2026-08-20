// Ogranicza liczbę żądań w oknie czasowym i definiuje limity dla AI, wysyłki plików i OTP

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function sanitizeInput(s: string, maxLen = 2000): string {
  return s.replace(/\0/g, "").slice(0, maxLen);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

export function rateLimit(opts: { limit: number; windowMs: number }) {
  return (req: Request, key?: string): RateLimitResult => {
    const ip = getClientIp(req);
    const storeKey = key ? `${ip}:${key}` : ip;
    const now = Date.now();
    const windowStart = now - opts.windowMs;

    let entry = store.get(storeKey);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(storeKey, entry);
    }

    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= opts.limit) {
      const oldest = entry.timestamps[0]!;
      const retryAfter = Math.ceil((oldest + opts.windowMs - now) / 1000);
      return { allowed: false, remaining: 0, retryAfter };
    }

    entry.timestamps.push(now);
    return { allowed: true, remaining: opts.limit - entry.timestamps.length };
  };
}

export const aiRateLimit = rateLimit({ limit: 30, windowMs: 60_000 });
export const aiVisionRateLimit = rateLimit({ limit: 10, windowMs: 60_000 });
export const uploadRateLimit = rateLimit({ limit: 20, windowMs: 60_000 });
export const otpSendRateLimit = rateLimit({ limit: 5, windowMs: 5 * 60_000 });
export const backupRateLimit = rateLimit({ limit: 3, windowMs: 60 * 60_000 });
export const contactFormRateLimit = rateLimit({ limit: 5, windowMs: 10 * 60_000 });

export { sanitizeInput };
