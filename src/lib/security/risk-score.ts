// Ocenia ryzyko logowania na podstawie znanych adresów IP, urządzeń, pory i nieudanych prób

interface UserProfile {
  knownIps: string[];
  knownUAs: string[];
  lastLoginAt: number | null;
}

const profiles = new Map<string, UserProfile>();
const failedAttempts = new Map<string, { count: number; windowStart: number }>();

// klucz licznika: adres konta, bo przy nieudanej próbie identyfikator
// użytkownika bywa jeszcze nieznany; normalizacja chroni przed rozspójnieniem
function attemptKey(ip: string, account: string): string {
  return `${ip}:${account.trim().toLowerCase()}`;
}

export interface RiskAssessment {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  factors: string[];
  requiresAdditionalAuth: boolean;
}

export interface RiskEvent {
  id: string;
  timestamp: string;
  account: string | null;
  ip: string;
  score: number;
  level: RiskAssessment["level"];
  factors: string[];
  stepUpRequired: boolean;
}

const events: RiskEvent[] = [];
let eventSeq = 0;

export function getRiskEvents(limit = 50): RiskEvent[] {
  return events.slice(0, Math.max(0, limit));
}

export function clearRiskEvents(): void {
  events.length = 0;
  eventSeq = 0;
}

export function assessRisk(opts: {
  userId: string;
  account?: string;
  ip: string;
  userAgent: string;
  now?: Date;
}): RiskAssessment {
  const { userId, account, ip, userAgent, now } = opts;
  const profile = profiles.get(userId) ?? { knownIps: [], knownUAs: [], lastLoginAt: null };

  let score = 0;
  const factors: string[] = [];

  const hour = (now ?? new Date()).getHours();
  if (hour >= 1 && hour < 5) {
    score += 25;
    factors.push(`Logowanie o niestandardowej porze (${hour}:00)`);
  }

  // czynnik aktywny dopiero gdy konto ma historię -> brak fałszywych alarmów
  const ipKnown = profile.knownIps.includes(ip);
  if (!ipKnown && profile.knownIps.length > 0) {
    score += 30;
    factors.push(`Nowy adres IP: ${ip}`);
  }

  const uaKey = userAgent.slice(0, 120);
  const uaKnown = profile.knownUAs.includes(uaKey);
  if (!uaKnown && profile.knownUAs.length > 0) {
    score += 15;
    factors.push("Nowe urządzenie lub przeglądarka");
  }

  const failRecord = failedAttempts.get(attemptKey(ip, account ?? ""));
  if (failRecord && Date.now() - failRecord.windowStart < 15 * 60_000) {
    const penalty = Math.min(failRecord.count * 12, 40);
    if (penalty > 0) {
      score += penalty;
      factors.push(`${failRecord.count} nieudana/e próba/y logowania w ostatnich 15 min`);
    }
  }

  const level: RiskAssessment["level"] =
    score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";

  const assessment: RiskAssessment = {
    score: Math.min(score, 100),
    level,
    factors,
    requiresAdditionalAuth: level === "HIGH",
  };

  if (assessment.score > 0) {
    events.unshift({
      id: `risk-${++eventSeq}`,
      timestamp: new Date().toISOString(),
      account: account ?? null,
      ip,
      score: assessment.score,
      level: assessment.level,
      factors: assessment.factors,
      stepUpRequired: assessment.requiresAdditionalAuth,
    });
    if (events.length > 200) events.length = 200;
  }

  return assessment;
}

export function recordSuccessfulLogin(userId: string, ip: string, userAgent: string): void {
  const profile = profiles.get(userId) ?? { knownIps: [], knownUAs: [], lastLoginAt: null };
  if (!profile.knownIps.includes(ip)) {
    profile.knownIps.push(ip);
    if (profile.knownIps.length > 15) profile.knownIps.shift();
  }
  const uaKey = userAgent.slice(0, 120);
  if (!profile.knownUAs.includes(uaKey)) {
    profile.knownUAs.push(uaKey);
    if (profile.knownUAs.length > 10) profile.knownUAs.shift();
  }
  profile.lastLoginAt = Date.now();
  profiles.set(userId, profile);
}

export function recordFailedAttempt(ip: string, account: string): void {
  const key = attemptKey(ip, account);
  const now = Date.now();
  const record = failedAttempts.get(key);
  if (!record || now - record.windowStart > 15 * 60_000) {
    failedAttempts.set(key, { count: 1, windowStart: now });
  } else {
    record.count++;
  }
}

export function clearFailedAttempts(ip: string, account: string): void {
  failedAttempts.delete(attemptKey(ip, account));
}
