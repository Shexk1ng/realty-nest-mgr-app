// Wykrywa masowe pobieranie danych w oknie pięciu minut i blokuje odpowiedź po przekroczeniu progu

export type DlpSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface DlpEvent {
  id: string;
  timestamp: string;
  actorIp: string;
  actorJwt?: string;
  dataType: string;
  recordCount: number;
  operationName?: string;
  severity: DlpSeverity;
  blocked: boolean;
  details: string;
}

const windowMs = 5 * 60 * 1000;

interface WindowEntry {
  ts: number;
  count: number;
  ids?: string[];
}

interface WindowBucket {
  entries: WindowEntry[];
}

const windows = new Map<string, WindowBucket>();
const events: DlpEvent[] = [];
let eventSeq = 0;

const THRESHOLDS: Record<string, { warn: number; block: number }> = {
  contacts:   { warn: 30, block: 50 },
  properties: { warn: 60, block: 100 },
  enquiries:  { warn: 40, block: 80 },
  documents:  { warn: 20, block: 50 },
};

function severity(count: number, dataType: string): DlpSeverity {
  const t = THRESHOLDS[dataType];
  if (!t) return "LOW";
  if (count >= t.block) return "HIGH";
  if (count >= t.warn)  return "MEDIUM";
  return "LOW";
}

function pruneWindow(bucket: WindowBucket): void {
  const now = Date.now();
  bucket.entries = bucket.entries.filter((e) => now - e.ts <= windowMs);
}

function windowSum(bucket: WindowBucket): number {
  const distinct = new Set<string>();
  let untracked = 0;
  for (const e of bucket.entries) {
    if (e.ids?.length) for (const id of e.ids) distinct.add(id);
    else untracked += e.count;
  }
  return distinct.size + untracked;
}

export function checkDlp(opts: {
  ip: string;
  dataType: string;
  recordCount: number;
  recordIds?: string[];
  operationName?: string;
  jwt?: string;
}): { blocked: boolean; event?: DlpEvent } {
  const { ip, dataType, recordCount, recordIds, operationName, jwt } = opts;
  const threshold = THRESHOLDS[dataType];
  if (!threshold || recordCount <= 0) return { blocked: false };

  const key = `${ip}:${dataType}`;
  let bucket = windows.get(key);
  if (!bucket) {
    bucket = { entries: [] };
    windows.set(key, bucket);
  }
  pruneWindow(bucket);

  const now = Date.now();
  bucket.entries.push({ ts: now, count: recordCount, ids: recordIds });

  const windowCount = windowSum(bucket);
  if (windowCount < threshold.warn) return { blocked: false };

  const sev = severity(windowCount, dataType);
  const blocked = windowCount >= threshold.block;

  const event: DlpEvent = {
    id: `dlp-${++eventSeq}`,
    timestamp: new Date(now).toISOString(),
    actorIp: ip,
    actorJwt: jwt,
    dataType,
    recordCount: windowCount,
    operationName,
    severity: sev,
    blocked,
    details: `${windowCount} distinct ${dataType} records fetched within the last 5 minutes (this request: ${recordCount}). Threshold: warn=${threshold.warn}, block=${threshold.block}.`,
  };

  events.unshift(event);
  if (events.length > 200) events.splice(200);

  return { blocked, event };
}

export function getDlpEvents(limit = 50): DlpEvent[] {
  return events.slice(0, Math.max(0, limit));
}

export function clearDlpEvents(): void {
  events.length = 0;
  windows.clear();
  eventSeq = 0;
}
