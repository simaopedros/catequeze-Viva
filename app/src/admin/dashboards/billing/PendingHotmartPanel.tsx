import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  linkPendingHotmartEntitlement,
  listPendingHotmartEntitlements,
  useQuery,
} from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";

type PendingRow = {
  id: string;
  email: string;
  planSlug: string;
  interval: string | null;
  transaction: string | null;
  accessEndsAt: string | Date | null;
};

export function PendingHotmartPanel() {
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const { data, isLoading, refetch } = useQuery(listPendingHotmartEntitlements);
  const rows = (data ?? []) as PendingRow[];
  const [userIds, setUserIds] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const link = async (row: PendingRow) => {
    const userId = (userIds[row.id] || "").trim();
    if (!userId) {
      setError(t("pages.hotmart_pending.user_required"));
      return;
    }
    setBusyId(row.id);
    setError("");
    try {
      await linkPendingHotmartEntitlement({ pendingId: row.id, userId });
      setUserIds((current) => ({ ...current, [row.id]: "" }));
      await refetch();
    } catch (err: any) {
      setError(err?.message || t("pages.hotmart_pending.error"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-3" aria-labelledby="hotmart-pending-title">
      <div>
        <h2 id="hotmart-pending-title" className="text-lg font-semibold">
          {t("pages.hotmart_pending.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("pages.hotmart_pending.subtitle")}</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("pages.hotmart_pending.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("pages.hotmart_pending.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">{t("pages.hotmart_pending.col_email")}</th>
                <th className="p-2">{t("pages.hotmart_pending.col_plan")}</th>
                <th className="p-2">{t("pages.hotmart_pending.col_transaction")}</th>
                <th className="p-2">{t("pages.hotmart_pending.col_until")}</th>
                <th className="p-2">{t("pages.hotmart_pending.col_user")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="p-2">{row.email}</td>
                  <td className="p-2">
                    {row.planSlug}
                    {row.interval ? ` · ${row.interval}` : ""}
                  </td>
                  <td className="p-2">{row.transaction || "—"}</td>
                  <td className="p-2">
                    {row.accessEndsAt ? formatDate(row.accessEndsAt, currentLocale) : "—"}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`pending-user-${row.id}`} className="sr-only">
                        {t("pages.hotmart_pending.col_user")}
                      </Label>
                      <Input
                        id={`pending-user-${row.id}`}
                        value={userIds[row.id] || ""}
                        onChange={(event) =>
                          setUserIds((current) => ({ ...current, [row.id]: event.target.value }))
                        }
                        placeholder={t("pages.hotmart_pending.user_placeholder")}
                        className="max-w-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => void link(row)}
                      >
                        {t("pages.hotmart_pending.link")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
