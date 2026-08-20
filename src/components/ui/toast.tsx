"use client";

// Powiadomienia wysuwane: warianty sukcesu, błędu, ostrzeżenia i informacji

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { ToastProvider, toast as heroToast } from "@heroui/react";

export type ToastVariant = "success" | "error" | "warning" | "info";

const INDICATOR: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  error: <XCircle className="h-4 w-4" aria-hidden />,
  warning: <AlertTriangle className="h-4 w-4" aria-hidden />,
  info: <Info className="h-4 w-4" aria-hidden />,
};

const DEFAULT_TIMEOUT = 4500;

function push(variant: ToastVariant, title: string, description?: string): string {
  const options = {
    description,
    indicator: INDICATOR[variant],
    timeout: DEFAULT_TIMEOUT,
  };

  switch (variant) {
    case "success":
      return heroToast.success(title, options);
    case "error":
      return heroToast.danger(title, options);
    case "warning":
      return heroToast.warning(title, options);
    case "info":
      return heroToast.info(title, options);
  }
}

export const toast = {
  success: (title: string, description?: string) => push("success", title, description),
  error: (title: string, description?: string) => push("error", title, description),
  warning: (title: string, description?: string) => push("warning", title, description),
  info: (title: string, description?: string) => push("info", title, description),
  dismiss: (id: string) => heroToast.close(id),
  clear: () => heroToast.clear(),
};

export function Toaster() {
  return <ToastProvider placement="bottom" maxVisibleToasts={4} />;
}
