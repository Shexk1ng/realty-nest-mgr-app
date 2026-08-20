// Szkielet ładowania ekranu sieci PropShare

import { Skeleton } from "@/components/ui/skeleton";

export default function PropShareLoading() {
  return (
    <div className="dash-dense" aria-hidden>
      <div className="span-4" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-8 w-36 rounded-xl" />
      </div>
      <div className="span-4" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card-surface space-y-3 rounded-2xl p-4" style={{ animationDelay: `${i * 40}ms` }}>
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton variant="chip" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
