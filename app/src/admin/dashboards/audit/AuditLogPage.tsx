import { type AuthUser } from "wasp/auth";
import { useQuery, getAuditLogs } from "wasp/client/operations";
import { useState, Fragment } from "react";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppDisplayTitle,
  AppGoldRule,
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import { ShieldCheck, Download } from "lucide-react";
import { formatDateTime } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";

const AuditLogPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [parishId, setParishId] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const pageSize = 50;

  const { data, isLoading } = useQuery(getAuditLogs, {
    skip: page * pageSize,
    take: pageSize,
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(entityType.trim() ? { entityType: entityType.trim() } : {}),
    ...(userId.trim() ? { userId: userId.trim() } : {}),
    ...(parishId.trim() ? { parishId: parishId.trim() } : {}),
  });

  const totalPages = data?.total ? Math.ceil(data.total / pageSize) : 0;

  const exportCsv = () => {
    const logs = data?.logs ?? [];
    const header = ["createdAt", "action", "entityType", "entityId", "operation", "user"];
    const rows = logs.map((log: any) => {
      let operation = "";
      try {
        operation = JSON.parse(log.metadata || "{}").operation || "";
      } catch {
        /* ignore */
      }
      return [
        log.createdAt,
        log.action,
        log.entityType,
        log.entityId,
        operation,
        log.user?.email || "",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",");
    });
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t("pages.admin")}
          title={t("pages.audit.title")}
          subtitle={t("pages.audit.subtitle")}
          actions={
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!data?.logs?.length}>
              <Download className="mr-1 h-3.5 w-3.5" />
              {t("pages.audit.export")}
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <select
            className="h-9 rounded-sm border border-input bg-background px-3 text-sm"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">{t("pages.audit.all_actions")}</option>
            {["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT", "APPROVE", "REJECT"].map(
              (action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ),
            )}
          </select>
          <Input
            className="h-9 w-40"
            placeholder={t("pages.audit.entity_placeholder")}
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(0);
            }}
          />
          <Input
            className="h-9 w-48"
            placeholder={t("pages.audit.user_placeholder")}
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setPage(0);
            }}
          />
          <Input
            className="h-9 w-48"
            placeholder={t("pages.audit.parish_placeholder")}
            value={parishId}
            onChange={(e) => {
              setParishId(e.target.value);
              setPage(0);
            }}
          />
          {data?.total != null && (
            <span className="text-xs text-muted-foreground">
              {t("pages.audit.count", { count: data.total })}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-ink border-t-transparent" />
          </div>
        ) : !data?.logs || data.logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center">
            <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
              {t("pages.audit.empty_title")}
            </AppDisplayTitle>
            <AppGoldRule className="mx-auto" />
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              {t("pages.audit.empty_desc")}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-sm border border-border/70 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("pages.audit.col_date")}
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("pages.audit.col_action")}
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("pages.audit.col_entity")}
                    </th>
                    <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:table-cell">
                      {t("pages.audit.col_operation")}
                    </th>
                    <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:table-cell">
                      {t("pages.audit.col_user")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((log: any) => {
                    let operation = "";
                    let parsed: Record<string, unknown> | null = null;
                    try {
                      parsed = JSON.parse(log.metadata || "{}");
                      operation = (parsed as any).operation || "";
                    } catch {
                      /* ignore */
                    }
                    return (
                      <Fragment key={log.id}>
                          <tr
                            className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                            onClick={() =>
                              setOpenId(openId === log.id ? null : log.id)
                            }
                          >
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(log.createdAt, currentLocale)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`rounded-sm px-1.5 py-0.5 text-xs font-medium ${
                                log.action === "DELETE"
                                  ? "bg-destructive/10 text-destructive"
                                  : log.action === "REJECT"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-brand-ink/8 text-brand-ink"
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs">{log.entityType}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                            {operation || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">
                            {log.user?.email || "—"}
                          </td>
                        </tr>
                        {openId === log.id && parsed && (
                          <tr key={`${log.id}-meta`} className="bg-muted/20">
                            <td colSpan={5} className="px-4 py-3">
                              <pre className="whitespace-pre-wrap break-all text-xs text-muted-foreground">
                                {JSON.stringify(parsed, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="text-xs px-3 py-1.5 rounded-sm border border-border/70 bg-white hover:bg-muted disabled:opacity-50"
                >
                  {t("pages.audit.prev")}
                </button>
                <span className="text-xs text-muted-foreground">
                  {t("pages.audit.page_of", {
                    page: page + 1,
                    total: totalPages,
                  })}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-xs px-3 py-1.5 rounded-sm border border-border/70 bg-white hover:bg-muted disabled:opacity-50"
                >
                  {t("pages.audit.next")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DefaultLayout>
  );
};

export default AuditLogPage;
