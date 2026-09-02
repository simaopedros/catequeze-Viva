import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getUserAdminDetail,
  adjustUserAiCredits,
  setUserSuspended,
  impersonateUser,
  cancelUserSubscriptionImmediate,
} from "wasp/client/operations";
import { useParams, NavLink } from "react-router";
import { useState } from "react";
import DefaultLayout from "../../layout/DefaultLayout";
import { AppPageHeader } from "../../../client/components/brand/AppChrome";
import { Users, CreditCard, History, BarChart3, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Textarea } from "../../../client/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { startImpersonation } from "../../impersonation";
import { setActiveWorkspaceId } from "../../../client/hooks/workspaceStore";

const UserDetailPage = ({ user }: { user: AuthUser }) => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const {
    data: u,
    isLoading,
    refetch,
  } = useQuery(getUserAdminDetail, {
    id: id!,
  });
  const [credits, setCredits] = useState<string>("");
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isLoading) {
    return (
      <DefaultLayout user={user}>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#071A2D] border-t-transparent" />
        </div>
      </DefaultLayout>
    );
  }

  if (!u) {
    return (
      <DefaultLayout user={user}>
        <div className="text-center py-12 text-muted-foreground">
          {t("pages.user.not_found")}
        </div>
      </DefaultLayout>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refetch();
    } catch (err: any) {
      setError(err?.message || t("pages.user.action_error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <NavLink to="/admin/users" className="hover:text-[#071A2D]">
            {t("pages.user.breadcrumb")}
          </NavLink>
          <span>/</span>
          <span className="font-semibold tracking-tight text-[#071A2D]">
            {u.email}
          </span>
        </div>

        <AppPageHeader
          eyebrow={t("pages.user.eyebrow")}
          title={u.firstName ? `${u.firstName} ${u.lastName || ""}` : u.email}
          subtitle={
            u.suspendedAt
              ? `${u.email} · ${t("pages.user.suspended")}`
              : u.isAdmin
                ? `${u.email} · ${t("pages.admin")}`
                : u.email
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={u.isAdmin || u.id === user.id || busy}
                onClick={() => setImpersonateOpen(true)}
              >
                {t("pages.user.impersonate")}
              </Button>
              <Button
                size="sm"
                variant={u.suspendedAt ? "outline" : "destructive"}
                disabled={u.isAdmin || u.id === user.id || busy}
                onClick={() => {
                  if (u.suspendedAt) {
                    void run(async () => {
                      await setUserSuspended({
                        userId: u.id,
                        suspended: false,
                      });
                    });
                  } else {
                    setSuspendOpen(true);
                  }
                }}
              >
                {u.suspendedAt
                  ? t("pages.user.unsuspend")
                  : t("pages.user.suspend")}
              </Button>
            </div>
          }
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-sm border border-border/70 bg-white p-5">
            <div className="mb-4 space-y-1.5">
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-[#071A2D]" />
                {t("pages.user.profile")}
              </h2>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.user.username")}
                </p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {u.username || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.user.phone")}
                </p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {u.phone || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.user.locale")}
                </p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {u.locale}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.user.created_at")}
                </p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {formatDate(u.createdAt, currentLocale)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.user.two_factor")}
                </p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {u.twoFactorEnabled ? t("yes_filter") : t("no_filter")}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-border/70 bg-white p-5">
            <div className="mb-4 space-y-1.5">
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5 text-[#071A2D]" />
                {t("pages.user.billing")}
              </h2>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.user.plan")}
                </p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {u.subscriptionPlan || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.user.status")}
                </p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {u.subscriptionStatus || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.user.ai_credits")}
                </p>
                <p className="font-semibold tabular-nums tracking-tight text-[#071A2D]">
                  {u.creditsLeft}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.user.stripe_id")}
                </p>
                <p className="text-xs">{u.paymentProcessorUserId || "—"}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <Input
                className="h-9 w-24"
                type="number"
                min={0}
                value={credits}
                placeholder={String(u.creditsLeft)}
                onChange={(e) => setCredits(e.target.value)}
              />
              <Button
                size="sm"
                disabled={busy || credits === ""}
                onClick={() =>
                  run(async () => {
                    await adjustUserAiCredits({
                      userId: u.id,
                      creditsLeft: Number(credits),
                    });
                    setCredits("");
                  })
                }
              >
                {t("pages.user.save_credits")}
              </Button>
              {u.paymentProcessorUserId && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setCancelOpen(true)}
                >
                  {t("pages.user.cancel_stripe")}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-border/70 bg-white p-5">
          <div className="mb-4 space-y-1.5">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 text-[#071A2D]" />
              {t("pages.user.parishes", { count: u.memberships?.length || 0 })}
            </h2>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <div className="divide-y -mx-5">
            {!u.memberships || u.memberships.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                {t("pages.user.no_parishes")}
              </div>
            ) : (
              u.memberships.map((m: any) => (
                <div
                  key={m.id}
                  className="px-5 py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <NavLink
                      to={`/admin/parishes/${m.parish.id}`}
                      className="font-semibold tracking-tight text-[#071A2D] hover:underline"
                    >
                      {m.parish.name}
                    </NavLink>
                    <p className="text-xs text-muted-foreground">
                      {m.community?.name
                        ? t("pages.user.community_prefix", {
                            name: m.community.name,
                          })
                        : ""}
                      {m.role} · {m.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {t("pages.user.since", {
                        date: formatDate(m.createdAt, currentLocale),
                      })}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActiveWorkspaceId(m.parish.id);
                        window.location.href = "/app";
                      }}
                    >
                      {t("pages.parish.open_in_app")}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-sm border border-border/70 bg-white p-5">
          <div className="mb-4 space-y-1.5">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <History className="h-3.5 w-3.5 text-[#071A2D]" />
              {t("pages.user.audit")}
            </h2>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <div className="divide-y -mx-5">
            {!u.auditLog || u.auditLog.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                {t("pages.user.no_audit")}
              </div>
            ) : (
              u.auditLog.map((log: any) => (
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
                  </div>
                  <span className="text-muted-foreground">
                    {formatDate(log.createdAt, currentLocale)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {u.aiUsage && u.aiUsage.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-5">
            <div className="mb-4 space-y-1.5">
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5 text-[#071A2D]" />
                {t("pages.user.ai_usage")}
              </h2>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <div className="divide-y -mx-5">
              {u.aiUsage.map((d: any) => (
                <div
                  key={d.id}
                  className="px-5 py-2 flex items-center justify-between text-xs"
                >
                  <span>{formatDate(d.date, currentLocale)}</span>
                  <span className="font-semibold tabular-nums tracking-tight text-[#071A2D]">
                    {t("pages.user.credits_value", { count: d.count })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pages.user.suspend_title")}</DialogTitle>
            <DialogDescription>
              {t("pages.user.suspend_desc")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("pages.user.suspend_reason")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>
              {t("pages.plans.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await setUserSuspended({
                    userId: u.id,
                    suspended: true,
                    reason,
                  });
                  setSuspendOpen(false);
                  setReason("");
                })
              }
            >
              {t("pages.user.suspend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={impersonateOpen} onOpenChange={setImpersonateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pages.user.impersonate_title")}</DialogTitle>
            <DialogDescription>
              {t("pages.user.impersonate_desc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonateOpen(false)}>
              {t("pages.plans.cancel")}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const result = await impersonateUser({ userId: u.id });
                  startImpersonation({
                    sessionId: result.sessionId,
                    email: result.email,
                    userId: result.userId,
                  });
                  window.location.href = "/app";
                })
              }
            >
              {t("pages.user.impersonate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pages.user.cancel_stripe_title")}</DialogTitle>
            <DialogDescription>
              {t("pages.user.cancel_stripe_desc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              {t("pages.plans.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await cancelUserSubscriptionImmediate({
                    userId: u.id,
                    confirm: true,
                  });
                  setCancelOpen(false);
                })
              }
            >
              {t("pages.user.cancel_stripe")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DefaultLayout>
  );
};

export default UserDetailPage;
