import { type AuthUser } from "wasp/auth";
import { useQuery, getUserAdminDetail } from "wasp/client/operations";
import { useParams } from "react-router";
import DefaultLayout from "../../layout/DefaultLayout";
import { AppPageHeader } from "../../../client/components/brand/AppChrome";
import {
  Users,
  Shield,
  CreditCard,
  History,
  BarChart3,
  Building2,
} from "lucide-react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";

const UserDetailPage = ({ user }: { user: AuthUser }) => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const { data: u, isLoading } = useQuery(getUserAdminDetail, { id: id! });

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

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        {/* Breadcrumb */}
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
          subtitle={u.isAdmin ? `${u.email} · ${t("pages.admin")}` : u.email}
        />

        {/* Profile + Billing */}
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
                <p className="text-xs text-muted-foreground">{t("pages.user.username")}</p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {u.username || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("pages.user.phone")}</p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {u.phone || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("pages.user.locale")}</p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {u.locale}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("pages.user.created_at")}</p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {formatDate(u.createdAt, currentLocale)}
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
                <p className="text-xs text-muted-foreground">{t("pages.user.plan")}</p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {u.subscriptionPlan || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("pages.user.status")}</p>
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {u.subscriptionStatus || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("pages.user.ai_credits")}
                </p>
                <p className="font-semibold tabular-nums tracking-tight text-[#071A2D]">
                  {u.credits}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("pages.user.stripe_id")}</p>
                <p className="text-xs">{u.paymentProcessorUserId || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Memberships */}
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
                    <p className="font-semibold tracking-tight text-[#071A2D]">
                      {m.parish.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.community?.name
                        ? t("pages.user.community_prefix", { name: m.community.name })
                        : ""}
                      {m.role} · {m.status}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t("pages.user.since", { date: formatDate(m.createdAt, currentLocale) })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Log */}
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
                  <span className="text-muted-foreground">
                    {formatDate(log.createdAt, currentLocale)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Usage */}
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
                    {t("pages.user.credits_value", { count: d.creditsUsed })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default UserDetailPage;
