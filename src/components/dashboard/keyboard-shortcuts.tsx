"use client";

// Globalne skróty klawiszowe pulpitu i okno ze ściągawką ich listy

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Keyboard } from "lucide-react";
import { Modal } from "@heroui/react";
import { useI18n } from "@/i18n/i18n-context";

export const SHORTCUT_EVENT = {
  newRecord: "rn:shortcut:new-record",
  focusFilters: "rn:shortcut:focus-filters",
} as const;

export function useShortcutEvent(name: string, handler: () => void) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  }, [handler]);
  useEffect(() => {
    const listener = () => latest.current();
    window.addEventListener(name, listener);
    return () => window.removeEventListener(name, listener);
  }, [name]);
}

const NAV_SHORTCUTS: { key: string; path: string; labelKey: string }[] = [
  { key: "d", path: "/dashboard", labelKey: "dashboard.nav.overview" },
  { key: "p", path: "/dashboard/properties", labelKey: "dashboard.nav.properties" },
  { key: "c", path: "/dashboard/contacts", labelKey: "dashboard.nav.contacts" },
  { key: "e", path: "/dashboard/enquiries", labelKey: "dashboard.nav.enquiries" },
  { key: "v", path: "/dashboard/viewings", labelKey: "dashboard.shell.navViewings" },
  { key: "t", path: "/dashboard/tasks", labelKey: "dashboard.shell.navTasks" },
  { key: "k", path: "/dashboard/calendar", labelKey: "dashboard.nav.calendar" },
  { key: "s", path: "/dashboard/stats", labelKey: "dashboard.nav.stats" },
];

const SEQUENCE_WINDOW_MS = 1500;

interface ShortcutsContextValue {
  openHelp: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export function useShortcuts(): ShortcutsContextValue {
  return useContext(ShortcutsContext) ?? { openHelp: () => {} };
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function KeyCap({ children }: { children: React.ReactNode }) {
  return <kbd className="rn-kbd">{children}</kbd>;
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="rn-shortcut-row">
      <span className="rn-shortcut-row__label">{label}</span>
      <span className="rn-shortcut-row__keys">
        {keys.map((k, i) => (
          <KeyCap key={`${k}-${i}`}>{k}</KeyCap>
        ))}
      </span>
    </div>
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [isMac] = useState(() =>
    typeof navigator !== "undefined"
      ? navigator.platform.startsWith("Mac") || /Mac/.test(navigator.userAgent)
      : false,
  );
  const mod = isMac ? "⌘" : "Ctrl";

  return (
    <Modal isOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>
                <span className="inline-flex items-center gap-2">
                  <Keyboard className="h-4 w-4" aria-hidden />
                  {t("dashboard.shortcuts.title")}
                </span>
              </Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="space-y-5">
              <section className="space-y-1.5">
                <h3 className="rn-shortcut-group">{t("dashboard.shortcuts.groupSearch")}</h3>
                <ShortcutRow label={t("dashboard.shortcuts.quickSearch")} keys={[mod, "K"]} />
                <ShortcutRow label={t("dashboard.shell.aiSearch")} keys={[mod, "⇧", "K"]} />
              </section>

              <section className="space-y-1.5">
                <h3 className="rn-shortcut-group">{t("dashboard.shortcuts.groupNavigation")}</h3>
                <p className="text-xs text-text-3">{t("dashboard.shortcuts.sequenceHint")}</p>
                {NAV_SHORTCUTS.map((s) => (
                  <ShortcutRow key={s.key} label={t(s.labelKey)} keys={["G", s.key.toUpperCase()]} />
                ))}
              </section>

              <section className="space-y-1.5">
                <h3 className="rn-shortcut-group">{t("dashboard.shortcuts.groupActions")}</h3>
                <ShortcutRow label={t("dashboard.shortcuts.newRecord")} keys={["N"]} />
                <ShortcutRow label={t("dashboard.shortcuts.focusFilters")} keys={["/"]} />
                <ShortcutRow label={t("dashboard.shortcuts.showHelp")} keys={["?"]} />
                <ShortcutRow label={t("dashboard.shortcuts.closeOverlay")} keys={["Esc"]} />
              </section>

              <p className="text-xs text-text-3">{t("dashboard.shortcuts.typingNote")}</p>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { localeHref } = useI18n();
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingSince = useRef(0);

  const openHelp = useCallback(() => setHelpOpen(true), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.target instanceof HTMLElement && e.target.closest('[role="grid"]')) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;

      const key = e.key.toLowerCase();
      const now = Date.now();

      if (pendingSince.current && now - pendingSince.current < SEQUENCE_WINDOW_MS) {
        pendingSince.current = 0;
        const target = NAV_SHORTCUTS.find((s) => s.key === key);
        if (target) {
          e.preventDefault();
          router.push(localeHref(target.path));
          return;
        }
      }

      if (key === "g") {
        pendingSince.current = now;
        return;
      }
      pendingSince.current = 0;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key === "/" && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(SHORTCUT_EVENT.focusFilters));
        return;
      }
      if (key === "n") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(SHORTCUT_EVENT.newRecord));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, localeHref]);

  const value = useMemo(() => ({ openHelp }), [openHelp]);

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      {helpOpen && <ShortcutsDialog onClose={() => setHelpOpen(false)} />}
    </ShortcutsContext.Provider>
  );
}
