"use client";

// Tworzenie odpowiedzi na zapytanie klienta przez AI, z wyborem tonu i kopiowaniem treści

import { useMemo, useState } from "react";
import { Button, ListBox, ListBoxItem, Select, Spinner, TextArea } from "@heroui/react";
import { useQuery } from "@apollo/client/react";
import { Sparkles, Copy, Check, AlertTriangle } from "lucide-react";
import { GET_ENQUIRIES, type Enquiry } from "@/lib/graphql/queries/enquiries";

const TONES = [
  { value: "profesjonalny i ciepły", label: "Professional & warm" },
  { value: "zwięzły i rzeczowy", label: "Concise" },
  { value: "ekskluzywny, premium", label: "Premium" },
];

export function EnquiryReplyComposer() {
  const { data } = useQuery<{ getEnquiries: { items: Enquiry[] } }>(GET_ENQUIRIES, {
    fetchPolicy: "cache-and-network",
    variables: { limit: 500 },
  });
  const enquiries = useMemo(() => data?.getEnquiries?.items ?? [], [data]);

  const [enquiryId, setEnquiryId] = useState("");
  const [tone, setTone] = useState(TONES[0]!.value);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!enquiryId) return;
    setBusy(true);
    setError(null);
    setReply("");
    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enquiryId, tone }),
      });
      const json = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !json.reply) throw new Error(json.error ?? "Generation failed.");
      setReply(json.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a reply.");
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    void navigator.clipboard.writeText(reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--border-soft)" }}>
        <Sparkles size={15} style={{ color: "var(--accent)" }} />
        <span className="card-title" style={{ fontSize: 13, margin: 0 }}>AI reply assistant</span>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Select
            aria-label="Zapytanie"
            selectedKey={enquiryId || "__none"}
            onSelectionChange={(k) => setEnquiryId(String(k) === "__none" ? "" : String(k))}
            style={{ flex: "1 1 260px" }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBoxItem id="__none">Choose an enquiry…</ListBoxItem>
                {enquiries.map((e) => (
                  <ListBoxItem key={e.id} id={e.id}>
                    {e.name}
                    {e.propertyInterest ? ` — ${e.propertyInterest}` : ""}
                    {e.location ? ` (${e.location})` : ""}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            aria-label="Ton wypowiedzi"
            selectedKey={tone}
            onSelectionChange={(k) => setTone(String(k))}
            style={{ flex: "0 1 200px" }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {TONES.map((t) => (
                  <ListBoxItem key={t.value} id={t.value}>
                    {t.label}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Button variant="primary" isDisabled={!enquiryId || busy} onPress={generate}>
            {busy ? <Spinner size="sm" color="current" /> : <Sparkles size={14} />} Draft reply
          </Button>
        </div>

        {error && (
          <div className="rn-banner rn-banner--error" style={{ fontSize: 12 }}>
            <AlertTriangle className="h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {(reply || busy) && (
          <div style={{ position: "relative" }}>
            <TextArea
              fullWidth
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={10}
              placeholder={busy ? "Generating…" : ""}
            />
            {reply && (
              <Button
                variant="ghost"
                size="sm"
                onPress={copy}
                style={{ position: "absolute", top: 8, right: 8 }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
