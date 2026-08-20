// Wykrywa próby wstrzyknięcia poleceń do funkcji AI po wzorcach i nasyceniu tokenami systemowymi

const PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|rules?|context|prompt)/i, label: "instruction-override" },
  { re: /forget\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|rules?|context|prompt)/i,  label: "instruction-wipe" },
  { re: /disregard\s+(all\s+)?(previous|prior|earlier|your)\s+(instructions?|rules?)/i,            label: "instruction-disregard" },
  { re: /you\s+are\s+now\s+(a\s+)?(?!an?\s+agent|assistant\s+from)/i,                             label: "role-switch-now" },
  { re: /pretend\s+(you\s+are|to\s+be|that\s+you'?re?)/i,                                         label: "role-pretend" },
  { re: /act\s+as\s+(if\s+you\s+(are|were)\s+)?a\s+/i,                                            label: "act-as" },
  { re: /roleplay\s+as/i,                                                                           label: "roleplay" },
  { re: /simulate\s+a?\s*(different|other|new)\s+(ai|model|assistant|system)/i,                    label: "simulate-model" },
  { re: /\b(DAN|STAN|DUDE|KEVIN|AIM)\s+mode\b/i,                                                  label: "jailbreak-mode" },
  { re: /jailbreak(ed)?/i,                                                                          label: "jailbreak-keyword" },
  { re: /developer\s+mode\s+enabled/i,                                                             label: "developer-mode" },
  { re: /\[SYSTEM\]/i,                                                                              label: "system-token" },
  { re: /\[INST\]/i,                                                                                label: "inst-token" },
  { re: /<\|system\|>/i,                                                                            label: "llama-system" },
  { re: /<<SYS>>/i,                                                                                 label: "llama-sys" },
  { re: /###\s*system\s*(instruction|prompt)/i,                                                     label: "system-header" },
  { re: /<\|im_start\|>/i,                                                                          label: "chatml-start" },
  { re: /reveal\s+(all|the\s+full|every)\s+(data|context|prompt|instructions?|system)/i,           label: "exfil-reveal" },
  { re: /show\s+me\s+(all|the\s+full|every)\s+(data|context|prompt|system)/i,                     label: "exfil-show" },
  { re: /print\s+(out\s+)?(all|the\s+full|your\s+entire)\s+(context|prompt|data|instructions?)/i, label: "exfil-print" },
  { re: /repeat\s+(verbatim|exactly|word[\s-]for[\s-]word)\s+.{0,30}(context|system|prompt)/i,   label: "exfil-repeat" },
  { re: /what\s+(are\s+your|is\s+your)\s+(exact\s+)?(system\s+prompt|instructions?|rules)/i,     label: "exfil-query" },
  { re: /new\s+instructions?\s*:/i,                                                                label: "new-instructions" },
  { re: /override\s+(instructions?|system\s+prompt|rules?|context)/i,                             label: "override" },
  { re: /updated?\s+system\s+(instruction|prompt)/i,                                               label: "updated-system" },
];

const META_TOKENS = ["system:", "assistant:", "user:", "[system]", "[assistant]", "[user]",
  "###", "<|", "|>", "<<sys>>", "</sys>", "[/inst]", "<im_start>"];

export interface PromptGuardResult {
  suspicious: boolean;
  label?: string;
  reason?: string;
}

export function detectPromptInjection(text: string): PromptGuardResult {
  if (!text || text.length < 10) return { suspicious: false };

  for (const { re, label } of PATTERNS) {
    if (re.test(text)) {
      return {
        suspicious: true,
        label,
        reason: `Matched pattern: ${label}`,
      };
    }
  }

  const lower = text.toLowerCase();
  // heurystyka gęstości
  const hits = META_TOKENS.filter((t) => lower.includes(t)).length;
  if (hits >= 3) {
    return {
      suspicious: true,
      label: "meta-token-density",
      reason: `High concentration of system-level tokens (${hits} matched)`,
    };
  }

  return { suspicious: false };
}

export function guardOrThrow(text: string): void {
  const result = detectPromptInjection(text);
  if (result.suspicious) {
    const err = new Error(`Prompt injection attempt detected [${result.label ?? "unknown"}].`);
    (err as Error & { statusCode: number; isInjection: boolean }).statusCode = 400;
    (err as Error & { statusCode: number; isInjection: boolean }).isInjection = true;
    throw err;
  }
}

export function guardMultiple(texts: string[]): PromptGuardResult {
  for (const t of texts) {
    const r = detectPromptInjection(t);
    if (r.suspicious) return r;
  }
  return { suspicious: false };
}
