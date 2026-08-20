"use client";

// Zwijany pasek filtrów list z licznikiem aktywnych kryteriów

import { useEffect, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button, Chip } from "@heroui/react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";

export function FilterPanel({
  activeCount = 0,
  openToken = 0,
  children,
  className,
}: {
  activeCount?: number;
  openToken?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const [manual, setManual] = useState<boolean | null>(null);
  const [seenToken, setSeenToken] = useState(openToken);
  if (openToken !== seenToken) {
    setSeenToken(openToken);
    setManual(true);
  }
  const open = manual ?? activeCount > 0;
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seenToken === 0) return;
    bodyRef.current?.querySelector<HTMLInputElement>("input:not([type='hidden'])")?.focus();
  }, [seenToken]);

  return (
    <div className={cn("space-y-3", className)}>
      <Button
        variant={activeCount > 0 ? "secondary" : "ghost"}
        size="sm"
        onPress={() => setManual(!open)}
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
        {tf("common.crud.filters", "Filtry")}
        {activeCount > 0 && (
          <Chip size="sm" variant="soft" color="accent">
            {activeCount}
          </Chip>
        )}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </Button>

      {open && <div ref={bodyRef}>{children}</div>}
    </div>
  );
}
