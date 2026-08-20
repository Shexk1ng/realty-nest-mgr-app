"use client";

// Wiersz przełącznika włącz/wyłącz z etykietą i podpowiedzią, używany w ustawieniach

import { Description, Switch } from "@heroui/react";

export function Toggle({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <Switch
      isSelected={checked}
      onChange={onChange}
      isDisabled={disabled}
      className="flex w-full items-start justify-between gap-4"
    >
      <div className="space-y-0.5">
        <Switch.Content className="text-sm font-medium">{label}</Switch.Content>
        {hint ? <Description>{hint}</Description> : null}
      </div>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch>
  );
}
