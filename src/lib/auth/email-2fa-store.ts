// Przechowuje oczekujące kody jednorazowe 2FA i preferencje weryfikacji e-mail użytkowników

import crypto from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const PREFS_FILE = join(DATA_DIR, "email-2fa-prefs.json");

declare global {
  var __email2fa_prefs__: Map<string, boolean> | undefined;
  var __email2fa_otps__: Map<string, OTPRecord> | undefined;
}

interface OTPRecord {
  otpHash: string;
  email: string;
  userId: string;
  userName: string;
  userRole: string;
  userShortId: number;
  userCompanyId: string | null;
  userTwoFactorEnabled: boolean;
  accessToken: string;
  expiresAt: number;
  attempts: number;
}

function getPrefsMap(): Map<string, boolean> {
  if (!global.__email2fa_prefs__) {
    global.__email2fa_prefs__ = loadPrefsFromDisk();
  }
  return global.__email2fa_prefs__;
}

function getOtpMap(): Map<string, OTPRecord> {
  if (!global.__email2fa_otps__) {
    global.__email2fa_otps__ = new Map();
  }
  return global.__email2fa_otps__;
}

function loadPrefsFromDisk(): Map<string, boolean> {
  try {
    if (!existsSync(PREFS_FILE)) return new Map();
    const raw = readFileSync(PREFS_FILE, "utf8");
    const obj = JSON.parse(raw) as Record<string, boolean>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function savePrefsToDisks(map: Map<string, boolean>) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(PREFS_FILE, JSON.stringify(Object.fromEntries(map), null, 2));
  } catch (err) {
    console.error("[email-2fa] Failed to persist prefs:", err);
  }
}

export function isEmailTwoFactorEnabled(userId: string): boolean {
  return getPrefsMap().get(userId) === true;
}

export function enableEmailTwoFactor(userId: string) {
  const map = getPrefsMap();
  map.set(userId, true);
  savePrefsToDisks(map);
}

export function disableEmailTwoFactor(userId: string) {
  const map = getPrefsMap();
  map.set(userId, false);
  savePrefsToDisks(map);
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function generateOtp(): string {
  return String(crypto.randomInt(100_000, 999_999));
}

export function refreshOtpForToken(tokenId: string): {
  otp: string;
  email: string;
  userName: string;
} | null {
  const map = getOtpMap();
  const rec = map.get(tokenId);

  if (!rec || Date.now() > rec.expiresAt) {
    return null;
  }

  const otp = generateOtp();
  rec.otpHash = hashOtp(otp);
  rec.expiresAt = Date.now() + 5 * 60 * 1_000;
  rec.attempts = 0;

  return { otp, email: rec.email, userName: rec.userName };
}

export function storeOtp(
  userId: string,
  email: string,
  userName: string,
  userRole: string,
  userShortId: number,
  userCompanyId: string | null,
  userTwoFactorEnabled: boolean,
  accessToken: string,
  otp: string,
): string {
  const tokenId = crypto.randomUUID();
  for (const [id, rec] of getOtpMap()) {
    if (rec.userId === userId) getOtpMap().delete(id);
  }
  getOtpMap().set(tokenId, {
    otpHash: hashOtp(otp),
    email,
    userId,
    userName,
    userRole,
    userShortId,
    userCompanyId,
    userTwoFactorEnabled,
    accessToken,
    expiresAt: Date.now() + 5 * 60 * 1_000,
    attempts: 0,
  });
  return tokenId;
}

export interface OTPVerifyResult {
  valid: boolean;
  error?: string;
  email?: string;
  accessToken?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    shortId: number;
    companyId: string | null;
    twoFactorEnabled: boolean;
  };
}

export function verifyOtp(tokenId: string, otp: string): OTPVerifyResult {
  const map = getOtpMap();
  const rec = map.get(tokenId);

  if (!rec) {
    return { valid: false, error: "Invalid or expired session. Request a new code." };
  }
  if (Date.now() > rec.expiresAt) {
    map.delete(tokenId);
    return { valid: false, error: "Code expired. Request a new one.", email: rec.email };
  }
  if (rec.attempts >= 3) {
    map.delete(tokenId);
    return { valid: false, error: "Too many attempts. Request a new code.", email: rec.email };
  }

  rec.attempts++;

  if (hashOtp(otp.trim()) !== rec.otpHash) {
    return {
      valid: false,
      error: `Incorrect code. ${3 - rec.attempts} attempt${rec.attempts < 2 ? "s" : ""} remaining.`,
      email: rec.email,
    };
  }

  map.delete(tokenId);
  return {
    valid: true,
    accessToken: rec.accessToken,
    user: {
      id: rec.userId,
      name: rec.userName,
      email: rec.email,
      role: rec.userRole,
      shortId: rec.userShortId,
      companyId: rec.userCompanyId,
      twoFactorEnabled: rec.userTwoFactorEnabled,
    },
  };
}
