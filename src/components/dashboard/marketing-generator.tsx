"use client";

// Generator tekstów marketingowych dla wybranej oferty, oparty o AI

import { useMemo, useState } from "react";
import { Button, ListBox, ListBoxItem, Select, Spinner } from "@heroui/react";
import { useQuery } from "@apollo/client/react";
import { Sparkles, Copy, Check, AlertTriangle, Megaphone } from "lucide-react";
import { GET_PROPERTIES, type Property } from "@/lib/graphql/queries/properties";
import { useI18n } from "@/i18n/i18n-context";

interface MarketingCopy {
  socialPost: string;
  emailSubject: string;
  emailBody: string;
  flyerHeadline: string;
  hashtags: string[];
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ border: "1px solid var(--border-soft)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--surface-2)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>{label}</span>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => {
            void navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p style={{ margin: 0, padding: "10px 12px", fontSize: 13, whiteSpace: "pre-wrap", color: "var(--text)" }}>{value}</p>
    </div>
  );
}

export function MarketingGenerator() {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const { data } = useQuery<{ getProperties: { items: Property[] } }>(GET_PROPERTIES, {
    fetchPolicy: "cache-and-network",
    variables: { limit: 500 },
  });
  const properties = useMemo(() => data?.getProperties?.items ?? [], [data]);

  const [propertyId, setPropertyId] = useState("");
  const [copy, setCopy] = useState<MarketingCopy | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!propertyId) return;
    setBusy(true);
    setError(null);
    setCopy(null);
    try {
      const res = await fetch("/api/ai/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      const json = (await res.json()) as MarketingCopy & { error?: string };
      if (!res.ok || !json.socialPost) throw new Error(json.error ?? "Generation failed.");
      setCopy(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate copy.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-surface mb-6 overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
        <Megaphone className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{tf("dashboard.marketing.generatorTitle", "Generator materiałów marketingowych (AI)")}</h2>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap gap-3">
          <Select
            aria-label={tf("dashboard.marketing.generatorProperty", "Oferta")}
            selectedKey={propertyId || "__none"}
            onSelectionChange={(k) => setPropertyId(String(k) === "__none" ? "" : String(k))}
            style={{ flex: "1 1 260px" }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBoxItem id="__none">{tf("dashboard.marketing.generatorPickProperty", "Wybierz ofertę…")}</ListBoxItem>
                {properties.map((p) => (
                  <ListBoxItem key={p.id} id={p.id}>
                    {p.title}
                    {p.location ? ` — ${p.location}` : ""}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Button variant="primary" isDisabled={!propertyId || busy} onPress={generate}>
            {busy ? <Spinner size="sm" color="current" /> : <Sparkles size={14} />} Generuj
          </Button>
        </div>

        {error && (
          <div className="rn-banner rn-banner--error" style={{ fontSize: 12 }}>
            <AlertTriangle className="h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {copy && (
          <div className="grid gap-3 sm:grid-cols-2">
            <CopyBlock label="Flyer headline" value={copy.flyerHeadline} />
            <CopyBlock label="Hashtags" value={copy.hashtags?.join(" ") ?? ""} />
            <div className="sm:col-span-2"><CopyBlock label="Social post" value={copy.socialPost} /></div>
            <div className="sm:col-span-2"><CopyBlock label={`Email — ${copy.emailSubject}`} value={copy.emailBody} /></div>
          </div>
        )}
      </div>
    </section>
  );
}
