// Rejestruje trafienia w pułapki adresowe i udostępnia je pulpitowi bezpieczeństwa

export interface HoneypotEvent {
  id: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  severity: "HIGH" | "CRITICAL";
  extraHeaders: Record<string, string>;
}

const events: HoneypotEvent[] = [];

export function logHoneypotHit(
  opts: Omit<HoneypotEvent, "id" | "timestamp">,
): HoneypotEvent {
  const event: HoneypotEvent = {
    id: Math.random().toString(36).slice(2, 10),
    timestamp: new Date(),
    ...opts,
  };
  events.unshift(event);
  if (events.length > 500) events.length = 500;
  console.warn(`[HONEYPOT] Hit: ${opts.method} ${opts.endpoint} from ${opts.ip} (${opts.userAgent.slice(0, 60)})`);
  return event;
}

export function getHoneypotEvents(limit = 50): HoneypotEvent[] {
  return events.slice(0, Math.max(0, limit));
}
