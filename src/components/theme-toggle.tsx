"use client";

// Przełącznik motywu jasnego i ciemnego w wariancie grupy przycisków lub pojedynczej ikony

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button, ToggleButton, ToggleButtonGroup } from "@heroui/react";

export function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle({ asIconBtn }: { asIconBtn?: boolean } = {}) {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();
  const isDark = isClient && resolvedTheme === "dark";

  if (asIconBtn) {
    return (
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        aria-label={isDark ? "Przełącz na tryb jasny" : "Przełącz na tryb ciemny"}
        onPress={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
      </Button>
    );
  }

  return (
    <ToggleButtonGroup
      size="sm"
      aria-label="Motyw"
      selectionMode="single"
      selectedKeys={[isDark ? "dark" : "light"]}
      onSelectionChange={(keys) => {
        const next = [...keys][0];
        if (next === "light" || next === "dark") setTheme(next);
      }}
      className="hidden md:inline-flex"
    >
      <ToggleButton id="light" isIconOnly aria-label="Tryb jasny">
        <Sun size={15} strokeWidth={1.8} />
      </ToggleButton>
      <ToggleButton id="dark" isIconOnly aria-label="Tryb ciemny">
        <Moon size={15} strokeWidth={1.8} />
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
