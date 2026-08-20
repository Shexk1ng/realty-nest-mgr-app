"use client";

// Eksport danych kontaktu i trwałe usunięcie rekordu na żądanie z tytułu RODO

import { useState } from "react";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import { useSession } from "next-auth/react";
import { AlertTriangle, Ban, Download } from "lucide-react";
import { AlertDialog, Button, Spinner } from "@heroui/react";
import { EXPORT_CONTACT_DATA, HARD_DELETE_CONTACT, GET_CONTACTS } from "@/lib/graphql/queries/contacts";
import { toast } from "@/components/ui/toast";
import { roleIs } from "@/lib/roles";
import { useI18n } from "@/i18n/i18n-context";

function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ContactGdprActions({ contactId, shortId }: { contactId: string; shortId: number }) {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data: session } = useSession();
  const mayUseGdprActions = roleIs.canManageUsers(session?.user?.role);
  const [runExport, exportState] = useLazyQuery<{ exportContactData: string }>(EXPORT_CONTACT_DATA, {
    fetchPolicy: "network-only",
  });
  const [runErase, eraseState] = useMutation(HARD_DELETE_CONTACT, { refetchQueries: [GET_CONTACTS] });

  const doExport = async () => {
    const { data, error } = await runExport({ variables: { id: contactId } });
    if (error || !data) {
      toast.error(tf("dashboard.contacts.gdprExportFailed", "Nie udało się wygenerować eksportu danych."));
      return;
    }
    downloadJson(`kontakt-${shortId}-eksport-danych.json`, data.exportContactData);
    toast.success(tf("dashboard.contacts.gdprExportOk", "Eksport danych pobrany."));
  };

  const doErase = async () => {
    try {
      await runErase({ variables: { id: contactId } });
      toast.success(tf("dashboard.contacts.gdprEraseOk", "Dane osobowe kontaktu zostały trwale usunięte."));
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tf("dashboard.contacts.gdprEraseFailed", "Nie udało się usunąć danych."));
    }
  };

  if (!mayUseGdprActions) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        onPress={() => void doExport()}
        isDisabled={exportState.loading}
        aria-label={tf("dashboard.contacts.gdprExportAria", "Eksportuj dane osobowe (RODO art. 15/20)")}
      >
        {exportState.loading ? <Spinner size="sm" /> : <Download className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        onPress={() => setConfirmOpen(true)}
        aria-label={tf("dashboard.contacts.gdprEraseAria", "Usuń trwale dane osobowe (RODO art. 17)")}
        className="text-danger"
      >
        <Ban className="h-3.5 w-3.5" />
      </Button>

      {confirmOpen && (
        <AlertDialog isOpen onOpenChange={(open) => { if (!open && !eraseState.loading) setConfirmOpen(false); }}>
          <AlertDialog.Backdrop isDismissable={!eraseState.loading}>
            <AlertDialog.Container size="sm">
              <AlertDialog.Dialog>
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger">
                    <AlertTriangle className="h-5 w-5" aria-hidden />
                  </AlertDialog.Icon>
                  <AlertDialog.Heading>{tf("dashboard.contacts.gdprEraseHeading", "Trwale usunąć dane osobowe?")}</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  {tf(
                    "dashboard.contacts.gdprEraseBody",
                    "Imię, e-mail, telefon i notatki tego kontaktu zostaną nieodwracalnie usunięte z bazy — w odróżnieniu od zwykłego usunięcia, tej operacji nie da się cofnąć. Powiązane transakcje i wpisy dziennika audytu pozostają (wymóg rozliczalności i przepisów księgowych), ale bez odniesienia do usuniętych danych osobowych.",
                  )}
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button variant="ghost" size="sm" onPress={() => setConfirmOpen(false)} isDisabled={eraseState.loading}>
                    {t("common.crud.cancel")}
                  </Button>
                  <Button variant="danger" size="sm" onPress={() => void doErase()} isDisabled={eraseState.loading}>
                    {eraseState.loading ? <Spinner size="sm" color="current" /> : <Ban className="h-4 w-4" />}{" "}
                    {tf("dashboard.contacts.gdprEraseConfirm", "Usuń trwale")}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      )}
    </>
  );
}
