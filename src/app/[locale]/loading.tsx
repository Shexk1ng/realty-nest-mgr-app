// Szkielet ładowania pokazywany przy nawigacji i strumieniowaniu tras językowych

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function LocaleLoading() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 py-12 sm:px-6"
      aria-busy="true"
      aria-label="Ładowanie"
    >
      <div className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-10 w-2/3 max-w-md rounded-xl" />
          <SkeletonText lines={2} className="max-w-xl" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 60, 120].map((delay) => (
            <div
              key={delay}
              className="animate-entrance"
              style={{ animationDelay: `${delay}ms` }}
            >
              <div className="space-y-3 rounded-2xl border border-border/40 bg-surface p-6">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-5 w-3/5" />
                <SkeletonText lines={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
