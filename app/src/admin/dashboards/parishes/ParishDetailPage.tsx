import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getParishAdminDetail,
  listDioceses,
  updateParish,
} from "wasp/client/operations";
import { useParams, NavLink } from "react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppMetric,
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import {
  Users,
  CircleDot,
  BadgeCheck,
  AlertTriangle,
  History,
} from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import { ConfirmDialog } from "../../../client/components/ConfirmDialog";
import { setActiveWorkspaceId } from "../../../client/hooks/workspaceStore";

const ParishDetailPage = ({ user }: { user: AuthUser }) => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const {
    data: parish,
    isLoading,
    refetch,
  } = useQuery(getParishAdminDetail, {
    id: id!,
  });
  const { data: dioceses = [] } = useQuery(listDioceses);
  const [dioceseId, setDioceseId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    if (parish) setDioceseId(parish.diocese?.id ?? "");
  }, [parish?.id, parish?.diocese?.id]);

  const statusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <BadgeCheck className="h-3.5 w-3.5 text-[#071A2D]" />;
      case "TRIAL":
        return <CircleDot className="h-3.5 w-3.5 text-[#071A2D]" />;
      case "PAST_DUE":
        return <AlertTriangle className="h-3.5 w-3.5 text-[#8A6418]" />;
      case "CANCELED":
        return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return null;
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refetch();
    } catch (err: any) {
      setError(err?.message || t("pages.parish.action_error"));
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <DefaultLayout user={user}>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#071A2D] border-t-transparent" />
        </div>
      </DefaultLayout>
    );
  }

  if (!parish) {
    return (
      <DefaultLayout user={user}>
        <div className="text-center py-12 text-muted-foreground">
          {t("pages.parish.not_found")}
        </div>
      </DefaultLayout>
    );
  }

  const isPersonal = parish.type === "PERSONAL";
  const dioceseDirty = (parish.diocese?.id ?? "") !== dioceseId;

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <NavLink to="/admin/parishes" className="hover:text-[#071A2D]">
            {t("pages.parishes.title")}
          </NavLink>
          <span>/</span>
          <span className="font-semibold tracking-tight text-[#071A2D]">
            {parish.name}
          </span>
        </div>

        <AppPageHeader
          eyebrow={t("pages.parish.eyebrow")}
          title={parish.name}
          subtitle={[
            !parish.active ? t("pages.parishes.archived") : null,
            parish.city,
            parish.diocese?.name,
            parish.owner?.email,
          ]
            .filter(Boolean)
            .join(" · ")}
          actions={
            <div className="flex flex-wrap gap-2">
              {!isPersonal && (
                <Button
                  size="sm"
                  variant={parish.active ? "outline" : "default"}
                  disabled={busy}
                  onClick={() => {
                    if (parish.active) {
                      setArchiveOpen(true);
                    } else {
                      void run(async () => {
                        await updateParish({ id: parish.id, active: true });
                      });
                    }
                  }}
                >
                  {parish.active
                    ? t("pages.parish.archive")
                    : t("pages.parish.restore")}
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  setActiveWorkspaceId(parish.id);
                  window.location.href = "/app";
                }}
              >
                {t("pages.parish.open_in_app")}
              </Button>
            </div>
          }
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <AppMetric
            label={t("pages.parish.kpi_classes")}
            value={parish._count?.classes || 0}
            className="bg-white"
          />
          <AppMetric
            label={t("pages.parish.kpi_catechumens")}
            value={parish._count?.catechumens || 0}
            className="bg-white"
          />
          <AppMetric
            label={t("pages.parish.kpi_members")}
            value={parish._count?.memberships || 0}
            className="bg-white"
          />
          <AppMetric
            label={t("pages.parish.kpi_communities")}
            value={parish._count?.communities || 0}
            className="bg-white"
          />
          <AppMetric
            label={t("pages.parish.kpi_campaigns")}
            value={parish._count?.messageCampaigns || 0}
            className="bg-white"
          />
        </div>

        {!isPersonal && (
          <div className="rounded-sm border border-border/70 bg-white p-5">
            <div className="mb-4 space-y-1.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("pages.parish.diocese")}
              </h2>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <select
                className="h-9 min-w-56 rounded-sm border border-input bg-background px-3 text-sm"
                value={dioceseId}
                onChange={(e) => setDioceseId(e.target.value)}
              >
                <option value="">{t("pages.parish.no_diocese")}</option>
                {dioceses.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={busy || !dioceseDirty}
                onClick={() =>
                  run(async () => {
                    await updateParish({
                      id: parish.id,
                      dioceseId: dioceseId || null,
                    });
                  })
                }
              >
                {t("pages.parish.save_diocese")}
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-sm border border-border/70 bg-white p-5">
          <div className="mb-4 space-y-1.5">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <CircleDot className="h-3.5 w-3.5 text-[#071A2D]" />
              {t("pages.parish.license")}
            </h2>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          {parish.billing ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.parish.plan")}
                </p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {parish.billing.plan}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.parish.status")}
                </p>
                <p className="flex items-center gap-1 font-semibold tracking-tight text-[#071A2D]">
                  {statusIcon(parish.billing.status)}
                  {parish.billing.status}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.parish.trial_until")}
                </p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {parish.billing.trialEndsAt
                    ? formatDate(parish.billing.trialEndsAt, currentLocale)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.parish.limits")}
                </p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {t("pages.parish.limits_value", {
                    classes:
                      parish.billing.maxClasses ||
                      t("pages.parish.default_limit"),
                    catechumens:
                      parish.billing.maxCatechumens ||
                      t("pages.parish.default_limit"),
                  })}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("pages.parish.no_license")}
            </p>
          )}
          <NavLink
            to="/admin/billing"
            className="mt-4 inline-block text-xs text-[#071A2D] hover:underline"
          >
            {t("pages.parish.manage_license")}
          </NavLink>
        </div>

        <div className="rounded-sm border border-border/70 bg-white p-5">
          <div className="mb-4 space-y-1.5">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-[#071A2D]" />
              {t("pages.parish.members", {
                count: parish.members?.length || 0,
              })}
            </h2>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <div className="divide-y -mx-5">
            {!parish.members || parish.members.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                {t("pages.parish.no_members")}
              </div>
            ) : (
              parish.members.map((m: any) => (
                <div
                  key={m.id}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-[#071A2D]">
                      {m.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.user.firstName
                        ? `${m.user.firstName} ${m.user.lastName || ""}`
                        : "—"}
                    </p>
                  </div>
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-xs">
                    {m.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-sm border border-border/70 bg-white p-5">
          <div className="mb-4 space-y-1.5">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <History className="h-3.5 w-3.5 text-[#071A2D]" />
              {t("pages.parish.recent_activity")}
            </h2>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <div className="divide-y -mx-5">
            {!parish.recentAudit || parish.recentAudit.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                {t("pages.parish.no_activity")}
              </div>
            ) : (
              parish.recentAudit.map((log: any) => (
                <div
                  key={log.id}
                  className="px-5 py-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold tracking-tight text-[#071A2D]">
                      {log.action}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {log.entityType}
                    </span>
                    {log.metadata && (
                      <span className="text-muted-foreground ml-2">
                        {(() => {
                          try {
                            return JSON.parse(log.metadata).operation || "";
                          } catch {
                            return "";
                          }
                        })()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{log.user?.email || "—"}</span>
                    <span>{formatDate(log.createdAt, currentLocale)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={t("pages.parish.archive_confirm_title")}
        description={t("pages.parish.archive_confirm_desc")}
        confirmLabel={t("pages.parish.archive")}
        variant="destructive"
        loading={busy}
        onConfirm={() =>
          void run(async () => {
            await updateParish({ id: parish.id, active: false });
            setArchiveOpen(false);
          })
        }
      />
    </DefaultLayout>
  );
};

export default ParishDetailPage;
