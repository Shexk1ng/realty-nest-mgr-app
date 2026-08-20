"use client";

// Wspólna obudowa kart pulpitu oraz kafelek prezentujący pojedynczą statystykę

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  description,
  icon: Icon,
  action,
  flush,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}) {
  const hasHead = Boolean(title || description || action);

  return (
    <section className={cn("rn-panel", flush && "rn-panel--flush", className)}>
      {hasHead && (
        <header className="rn-panel__head">
          <div className="min-w-0">
            {title && (
              <h2 className="rn-panel__title">
                {Icon && <Icon className="h-4 w-4 text-primary" aria-hidden />}
                {title}
              </h2>
            )}
            {description && <p className="rn-panel__desc">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export type StatTone = "accent" | "green" | "amber" | "violet";

export function StatWidget({
  icon: Icon,
  label,
  value,
  tone = "accent",
  footer,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  tone?: StatTone;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rn-panel", className)}>
      <div className="rn-stat">
        <span className={`rn-stat__tile rn-stat__tile--${tone}`} aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="rn-stat__value">{value}</div>
          <div className="rn-stat__label">{label}</div>
          {footer && <div className="mt-1.5 flex flex-wrap gap-1.5">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
