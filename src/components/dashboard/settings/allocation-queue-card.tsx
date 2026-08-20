"use client";

// Kolejka przydziału zapytań: włączanie agentów i zamiana ich pozycji w kolejce

import { useMutation, useQuery } from "@apollo/client/react";
import { ChevronDown, ChevronUp, Loader2, Users } from "lucide-react";
import {
  GET_ALLOCATION_QUEUE,
  UPDATE_ALLOCATION_SETTINGS,
  type AllocationAgent,
} from "@/lib/graphql/queries/propshare";
import { Avatar } from "@/components/ui/avatar";
import { Button, ToggleButton } from "@heroui/react";
import { useI18n } from "@/i18n/i18n-context";

export function AllocationQueueCard() {
  const { t } = useI18n();
  const { data, loading, refetch } = useQuery<{ getAllocationQueue: AllocationAgent[] }>(
    GET_ALLOCATION_QUEUE,
    { fetchPolicy: "cache-and-network" },
  );
  const [update, { loading: saving }] = useMutation(UPDATE_ALLOCATION_SETTINGS, {
    onCompleted: () => refetch(),
  });

  const agents = data?.getAllocationQueue ?? [];

  const toggle = (agentId: string, enabled: boolean) => {
    update({ variables: { agentId, enabled } });
  };

  const move = (agentId: string, dir: "up" | "down") => {
    const idx = agents.findIndex((a) => a.agentId === agentId);
    if (idx < 0) return;
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= agents.length) return;
    const target = agents[targetIdx];
    const myOrder = agents[idx].allocationQueueOrder ?? idx + 1;
    const theirOrder = target.allocationQueueOrder ?? targetIdx + 1;
    update({ variables: { agentId, queueOrder: theirOrder } });
    update({ variables: { agentId: target.agentId, queueOrder: myOrder } });
  };

  return (
    <section className="alloc-card">
      <div className="alloc-card__head">
        <div className="alloc-card__title">
          <Users size={16} style={{ color: "var(--accent)" }} />
          <div>
            <h2>{t("dashboard.settingsAlloc.title")}</h2>
            <p>{t("dashboard.settingsAlloc.description")}</p>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="alloc-card__loading">
          <Loader2 size={16} className="spin" style={{ color: "var(--accent)" }} />
          <span>{t("dashboard.settingsAlloc.loading")}</span>
        </div>
      ) : agents.length === 0 ? (
        <div className="alloc-card__empty">{t("dashboard.settingsAlloc.empty")}</div>
      ) : (
        <div className="alloc-card__list">
          {agents.map((agent, i) => (
            <div key={agent.agentId} className={`alloc-agent${!agent.allocationEnabled ? " alloc-agent--paused" : ""}`}>
              <span className="alloc-agent__order">#{i + 1}</span>
              <Avatar src={agent.avatarUrl} name={agent.name} size={32} className="alloc-agent__av" />
              <div className="alloc-agent__meta">
                <span className="alloc-agent__name">{agent.name}</span>
                <span className="alloc-agent__role">{agent.role}</span>
              </div>
              <div className="alloc-agent__controls">
                <ToggleButton
                  size="sm"
                  isSelected={agent.allocationEnabled}
                  onChange={() => toggle(agent.agentId, !agent.allocationEnabled)}
                  isDisabled={saving}
                  aria-label={
                    agent.allocationEnabled
                      ? t("dashboard.settingsAlloc.ariaPause")
                      : t("dashboard.settingsAlloc.ariaActivate")
                  }
                >
                  {agent.allocationEnabled
                    ? t("dashboard.settingsAlloc.stateActive")
                    : t("dashboard.settingsAlloc.statePaused")}
                </ToggleButton>
                <div className="alloc-arrows flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    onPress={() => move(agent.agentId, "up")}
                    isDisabled={i === 0 || saving}
                    aria-label={t("dashboard.settingsAlloc.ariaMoveUp")}
                  >
                    <ChevronUp size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    onPress={() => move(agent.agentId, "down")}
                    isDisabled={i === agents.length - 1 || saving}
                    aria-label={t("dashboard.settingsAlloc.ariaMoveDown")}
                  >
                    <ChevronDown size={13} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
