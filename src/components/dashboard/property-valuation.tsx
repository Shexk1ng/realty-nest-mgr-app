"use client";

// Wycena nieruchomości przez AI z widełkami cenowymi i poziomem trafności

import { useState } from "react";
import { Sparkles, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import type { ValuationRequest, ValuationResponse } from "@/app/api/ai/valuation/route";
import { useI18n } from "@/i18n/i18n-context";

interface Props {
  area?: number | null;
  location?: string | null;
  city?: string | null;
  district?: string | null;
  propertyType?: string;
  transactionType?: string;
  condition?: string;
  floor?: number | null;
  totalFloors?: number | null;
  yearBuilt?: number | null;
  rooms?: number | null;
  features?: string[];
}

const CONFIDENCE_LABEL: Record<string, string> = {
  HIGH: "Wysoka trafność",
  MEDIUM: "Średnia trafność",
  LOW: "Niska trafność",
};

const CONFIDENCE_CLASS: Record<string, string> = {
  HIGH: "valuation-confidence--high",
  MEDIUM: "valuation-confidence--medium",
  LOW: "valuation-confidence--low",
};

const PLN = (n: number) =>
  n.toLocaleString("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 });

export function PropertyValuation(props: Props) {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };

  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<ValuationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const hasEnoughData = !!(props.area || props.location || props.city);

  const estimate = async () => {
    setState("loading");
    setErrorMsg("");

    const body: ValuationRequest = {
      area: props.area ?? undefined,
      location: props.location ?? undefined,
      city: props.city ?? undefined,
      district: props.district ?? undefined,
      propertyType: props.propertyType,
      transactionType: props.transactionType,
      condition: props.condition,
      floor: props.floor ?? undefined,
      totalFloors: props.totalFloors ?? undefined,
      yearBuilt: props.yearBuilt ?? undefined,
      rooms: props.rooms ?? undefined,
      features: props.features,
    };

    try {
      const res = await fetch("/api/ai/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ValuationResponse & { error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Valuation failed.");
      }
      setResult(data);
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Nie udało się oszacować wartości.");
      setState("error");
    }
  };

  return (
    <div className="valuation-panel">
      <div className="valuation-header">
        <TrendingUp size={15} />
        <span>Wycena AI</span>
      </div>

      {state === "idle" || state === "error" ? (
        <>
          <button
            type="button"
            className="realty-nest__btn realty-nest__btn--ghost realty-nest__btn--sm valuation-btn"
            onClick={estimate}
            disabled={!hasEnoughData}
            title={!hasEnoughData ? tf("dashboard.propertyForm.valuationNeedsData", "Uzupełnij lokalizację lub powierzchnię") : undefined}
          >
            <Sparkles size={14} />
            {tf("dashboard.propertyForm.valuationRun", "Szacuj wartość AI")}
          </button>
          {!hasEnoughData && (
            <span className="valuation-hint">{tf("dashboard.propertyForm.valuationNeedsDataHint", "Uzupełnij lokalizację lub powierzchnię, aby wycenić.")}</span>
          )}
          {state === "error" && (
            <div className="valuation-error">
              <AlertCircle size={13} />
              {errorMsg}
            </div>
          )}
        </>
      ) : state === "loading" ? (
        <div className="valuation-loading">
          <Loader2 size={15} className="spin" />
          <span>{tf("dashboard.propertyForm.valuationAnalyzing", "Analizuję rynek...")}</span>
        </div>
      ) : result ? (
        <div className="valuation-result">
          <div className="valuation-range">
            <span className="valuation-range__label">{tf("dashboard.propertyForm.valuationEstimatedValue", "Szacowana wartość")}</span>
            <span className="valuation-range__value">
              {PLN(result.estimatedMin)} – {PLN(result.estimatedMax)}
            </span>
            {result.pricePerSqm && (
              <span className="valuation-range__sqm">
                ~{PLN(result.pricePerSqm)} / m²
              </span>
            )}
          </div>
          <span className={`rn-badge valuation-confidence ${CONFIDENCE_CLASS[result.confidence] ?? ""}`}>
            {CONFIDENCE_LABEL[result.confidence] ?? result.confidence}
          </span>
          <p className="valuation-rationale">{result.rationale}</p>
          <button
            type="button"
            className="realty-nest__btn realty-nest__btn--ghost realty-nest__btn--xs valuation-refresh"
            onClick={estimate}
          >
            <Sparkles size={12} />
            Odśwież
          </button>
        </div>
      ) : null}
    </div>
  );
}
