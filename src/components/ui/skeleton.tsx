// Jednolite szkielety ładowania: element migotania i gotowe układy zastępcze ekranów pulpitu

import { Skeleton as HeroSkeleton } from "@heroui/react";
import { cn } from "@/lib/utils";

export type SkeletonVariant = "block" | "text" | "avatar" | "chip";

export interface SkeletonProps
  extends Omit<React.ComponentProps<typeof HeroSkeleton>, "children"> {
  variant?: SkeletonVariant;
}

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  block: "rounded-md",
  text: "h-3.5 w-[70%] rounded",
  avatar: "h-9 w-9 rounded-full",
  chip: "h-5 w-16 rounded-full",
};

export function Skeleton({ className, variant = "block", ...props }: SkeletonProps) {
  return (
    <HeroSkeleton
      animationType="shimmer"
      className={cn(VARIANT_CLASS[variant], className)}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 && lines > 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("card-surface rounded-2xl p-5 space-y-3", className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-border/60">
      <Skeleton className="h-4 w-8 shrink-0" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-24 shrink-0" />
      <Skeleton className="h-5 w-16 rounded-full shrink-0" />
      <Skeleton className="h-4 w-20 shrink-0" />
    </div>
  );
}


export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn("card-surface rounded-2xl p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-24" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-10 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 p-6" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 60, 120, 180].map((delay) => (
          <div
            key={delay}
            className="animate-entrance"
            style={{ animationDelay: `${delay}ms` }}
          >
            <SkeletonStatCard />
          </div>
        ))}
      </div>

      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-4 px-5 py-3 border-b border-border/40">
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20 ml-auto" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonTableRow key={i} />
        ))}
      </div>
    </div>
  );
}


export function SkeletonPropertyRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-border/60">
      <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full shrink-0" />
      <Skeleton className="h-4 w-24 shrink-0" />
      <Skeleton className="h-4 w-20 shrink-0" />
      <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
    </div>
  );
}

export function SkeletonPropertiesPage() {
  return (
    <div className="space-y-5 p-6" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      <div className="flex items-center gap-2">
        {[80, 72, 96, 64].map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-lg" style={{ width: w }} />
        ))}
      </div>

      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-3 border-b border-border/40">
          {[32, 120, 80, 64, 72, 28].map((w, i) => (
            <Skeleton key={i} className="h-3" style={{ width: w, ...(i === 1 ? { flex: 1 } : {}) }} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonPropertyRow key={i} />
        ))}
      </div>
    </div>
  );
}


export function SkeletonContactRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border/60">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-44" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full shrink-0" />
      <Skeleton className="h-3 w-24 shrink-0" />
    </div>
  );
}

export function SkeletonContactsPage() {
  return (
    <div className="space-y-5 p-6" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonContactRow key={i} />
        ))}
      </div>
    </div>
  );
}


export function SkeletonPipelineColumn() {
  return (
    <div className="flex flex-col gap-3 min-w-[240px] flex-1">
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-7 rounded-full" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card-surface rounded-xl p-4 space-y-3">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonPipelinePage() {
  return (
    <div className="space-y-5 p-6" aria-hidden>
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonPipelineColumn key={i} />
        ))}
      </div>
    </div>
  );
}


export function SkeletonStatsPage() {
  return (
    <div className="space-y-6 p-6" aria-hidden>
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card-surface rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-[180px] w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}


export function SkeletonGenericPage() {
  return (
    <div className="space-y-6 p-6" aria-hidden>
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-60" />
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card-surface rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <div className="space-y-3">
              <SkeletonText lines={2} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
