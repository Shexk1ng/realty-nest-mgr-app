"use client";

// Przełącznik publikacji oferty na publicznej stronie serwisu

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { CheckCircle2, ExternalLink, Globe2 } from "lucide-react";
import { Button } from "@heroui/react";
import { useSession } from "next-auth/react";
import { GET_PROPERTY_BY_ID, type Property } from "@/lib/graphql/queries/properties";
import { toast } from "@/components/ui/toast";
import { roleIs } from "@/lib/roles";

export function PropertyPublishToggle({ id }: { id: string }) {
  const { data, loading } = useQuery<{ getPropertyById: Property }>(GET_PROPERTY_BY_ID, { variables: { id } });
  const [busy, setBusy] = useState(false);
  const [approvedAt, setApprovedAt] = useState<string | null | undefined>(undefined);

  const current = approvedAt !== undefined ? approvedAt : data?.getPropertyById?.contentApprovedAt ?? null;
  const isPublished = Boolean(current);

  const { data: session } = useSession();
  const mayPublish = roleIs.canManageUsers(session?.user?.role);

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/properties/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: isPublished ? "unpublish" : "publish" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Nie udało się zmienić statusu publikacji.");
      setApprovedAt(body.contentApprovedAt ?? null);
      toast.success(isPublished ? "Treść cofnięta do szkicu." : "Treść zatwierdzona i opublikowana.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się zmienić statusu publikacji.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
      <Globe2 size={16} className={isPublished ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">
          {isPublished ? "Treść zatwierdzona i opublikowana" : "Treść w szkicu — niewidoczna publicznie"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {isPublished
            ? "Strona publiczna oferty jest wygenerowana i aktualna."
            : "Zatwierdź, aby wygenerować publiczną stronę oferty."}
        </p>
      </div>
      {isPublished && (
        <a
          href={`/listings/${id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Podgląd <ExternalLink size={12} />
        </a>
      )}
      {mayPublish && (
        <Button variant={isPublished ? "ghost" : "primary"} size="sm" onPress={() => void toggle()} isDisabled={busy}>
          <CheckCircle2 size={14} />
          {isPublished ? "Cofnij do szkicu" : "Zatwierdź i opublikuj"}
        </Button>
      )}
    </div>
  );
}
