"use client";

// Wartość tekstowa z przyciskiem kopiowania i metodą awaryjną dla starszych przeglądarek

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function CopyValue({
  value,
  label,
  children,
  className,
}: {
  value: string;
  label: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const optional = (key: string) => {
    const value = t(key);
    return value === key ? "" : value;
  };
  const copyAria = optional("common.crud.copyValue");
  const copyTitle = optional("common.crud.copy");
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    const ok = await writeClipboard(value);
    setState(ok ? "ok" : "fail");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1600);
  };

  return (
    <span className={cn("rn-copy", className)}>
      <span className="rn-copy__text">{children ?? value}</span>
      <button
        type="button"
        className="rn-copy__btn"
        data-state={state}
        aria-label={copyAria ? copyAria.replace("{label}", label) : label}
        title={copyTitle || undefined}
        onClick={(e) => {
          e.stopPropagation();
          void copy();
        }}
      >
        {state === "ok" ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
      <span className="sr-only" role="status">
        {state === "ok"
          ? optional("common.crud.copied")
          : state === "fail"
            ? optional("common.crud.copyFailed")
            : ""}
      </span>
    </span>
  );
}
