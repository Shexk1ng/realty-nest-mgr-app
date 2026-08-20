"use client";

// Wysuwany czat asystenta AI wraz z kontekstem otwierającym go z dowolnego miejsca pulpitu

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle, ArrowUp, Bot, Sparkles, User, X } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";

type AiAssistantContextValue = { open: () => void };
const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

export function useAiAssistant(): AiAssistantContextValue {
  return useContext(AiAssistantContext) ?? { open: () => {} };
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const SUGGESTION_KEYS = [
  "suggestion1",
  "suggestion2",
  "suggestion3",
  "suggestion4",
] as const;

function buildSuggestions(t: (key: string) => string) {
  return SUGGESTION_KEYS.map((key) => ({ key, label: t(`dashboard.assistant.${key}`) }));
}

function FormattedAnswer({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i}>
            {parts.map((p, j) =>
              p.startsWith("**") && p.endsWith("**") ? (
                <strong key={j}>{p.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{p}</span>
              ),
            )}
          </p>
        );
      })}
    </>
  );
}

function Panel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const suggestions = buildSuggestions(t);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    const onDown = (e: MouseEvent) => {
      if (loading) return;
      if (!popRef.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [loading, onClose]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const json = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || !json.answer) throw new Error(json.error ?? t("dashboard.assistant.genericError"));
      setMessages((m) => [...m, { role: "assistant", content: json.answer! }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : t("dashboard.assistant.genericError"),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={popRef}
      className="rn-ai-pop"
      role="dialog"
      aria-label={t("dashboard.assistant.title")}
    >
      <div className="rn-ai-pop__head">
        <span
          className="rn-ai-pop__mark"
          style={{ animation: "rn-ai-glow 2.6s ease-in-out infinite" }}
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="rn-ai-pop__title">
          <b>{t("dashboard.assistant.title")}</b>
          <span>{t("dashboard.assistant.subtitle")}</span>
        </span>
        <button
          type="button"
          className="rn-ai-pop__x"
          onClick={onClose}
          aria-label={t("dashboard.assistant.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="rn-ai-pop__body">
        {messages.length === 0 && (
          <div style={{ animation: "fade-in-up 300ms var(--ease-out-quart) both" }}>
            <div className="rn-ai-empty">
              <span className="rn-ai-empty__icon">
                <Bot className="h-5 w-5" />
              </span>
              <p className="rn-ai-empty__lead">{t("dashboard.assistant.emptyTitle")}</p>
              <p>{t("dashboard.assistant.emptyBody")}</p>
            </div>
            <div className="rn-ai-chips">
              {suggestions.map(({ key, label }, i) => (
                <button
                  key={key}
                  type="button"
                  className="rn-ai-chip"
                  onClick={() => void send(label)}
                  style={{
                    animation: "fade-in-up 320ms var(--ease-out-quart) both",
                    animationDelay: `${80 + i * 60}ms`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`rn-ai-row${m.role === "user" ? " rn-ai-row--me" : ""}`}
            style={{ animation: "rn-bubble-in 280ms var(--ease-spring) both" }}
          >
            <span className="rn-ai-av">
              {m.role === "user" ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            </span>
            <div
              className={`rn-ai-bubble${
                m.role === "user" ? " rn-ai-bubble--me" : m.error ? " rn-ai-bubble--err" : ""
              }`}
            >
              {m.error && <AlertTriangle className="mb-0.5 inline h-3.5 w-3.5" />}{" "}
              <FormattedAnswer text={m.content} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="rn-ai-row" style={{ animation: "rn-bubble-in 200ms var(--ease-out-quart) both" }}>
            <span className="rn-ai-av">
              <Sparkles className="h-3 w-3" />
            </span>
            <div className="rn-ai-bubble">
              <span className="rn-typing"><span /><span /><span /></span>
            </div>
          </div>
        )}
      </div>

      <div className="rn-ai-pop__foot">
        <form
          className="rn-ai-form"
          onSubmit={(e) => { e.preventDefault(); void send(input); }}
        >
          <textarea
            ref={inputRef}
            className="rn-ai-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
            }}
            rows={1}
            placeholder={t("dashboard.assistant.placeholder")}
          />
          <button
            type="submit"
            className="rn-ai-send"
            disabled={loading || !input.trim()}
            aria-label={t("dashboard.assistant.send")}
          >
            {loading ? (
              <span className="spin inline-flex"><Sparkles className="h-3.5 w-3.5" /></span>
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </form>
        <p className="rn-ai-note">{t("dashboard.assistant.disclaimer")}</p>
      </div>
    </div>
  );
}

export function AiAssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AiAssistantContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      {open && <Panel onClose={() => setOpen(false)} />}
    </AiAssistantContext.Provider>
  );
}
