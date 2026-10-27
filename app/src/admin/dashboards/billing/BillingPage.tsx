import { type AuthUser } from "wasp/auth";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useMemo, useState } from "react";
import {
  useQuery,
  listAdminLicenses,
  listPricingPlansAdmin,
  extendTenantTrial,
  setComplimentaryPlan,
  cancelTenantLicense,
  cancelUserSubscriptionImmediate,
} from "wasp/client/operations";
import DefaultLayout from "../../layout/DefaultLayout";
import { AppPageHeader } from "../../../client/components/brand/AppChrome";
import { QueryErrorState } from "../../../client/components/QueryErrorState";
import {
  Activity,
  Church,
  Building2,
  CircleDot,
  BadgeCheck,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../client/components/ui/dropdown-menu";
import { ConfirmDialog } from "../../../client/components/ConfirmDialog";
import { SkeletonTable } from "../../../client/components/Skeletons";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import {
  resolveAdminCodeLabel,
  resolveAdminPlanLabel,
} from "../../../shared/adminLabels";

type LicenseRow = {
  id: string;
  billingId: string | null;
  kind: "parish" | "diocese";
  entityId: string;
  name: string;
  type: string;
  plan: string | null;
  status: string | null;
  trialEndsAt: string | Date | null;
  ownerEmail: string | null;
  ownerName: string | null;
  ownerId: string | null;
  hasStripe: boolean;
  active: boolean;
};

type DialogKind =
  "extend" | "complimentary" | "cancelLicense" | "cancelStripe" | null;

const BillingPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const {
    data: licenses = [],
    isLoading,
    error: loadError,
    refetch,
  } = useQuery(listAdminLicenses);
  const { data: plans = [] } = useQuery(listPricingPlansAdmin);
  const [target, setTarget] = useState<LicenseRow | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [days, setDays] = useState("7");
  const [planSlug, setPlanSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const sellablePlans = (plans as any[]).filter(
    (plan) => plan.isActive && plan.kind !== "CREDITS",
  );

  const planNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const plan of plans as Array<{ slug: string; name: string }>) {
      if (!plan?.slug) continue;
      map.set(plan.slug.toLowerCase(), plan.name);
    }
    return map;
  }, [plans]);

  const resolvePlanName = (plan: string | null) => {
    if (!plan) return t("pages.licenses.no_plan");
    return resolveAdminPlanLabel(plan, { nameBySlug: planNameBySlug });
  };

  const resolveStatusLabel = (row: LicenseRow) =>
    resolveAdminCodeLabel("status", row.status, t);

  const filteredLicenses = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return licenses as LicenseRow[];
    return (licenses as LicenseRow[]).filter((row) =>
      [row.name, row.ownerEmail, row.ownerName, row.plan, row.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [licenses, search]);

  const ownerLabel = (row: LicenseRow | null) => {
    if (!row) return "";
    if (row.ownerName && row.ownerEmail) {
      return `${row.ownerName} (${row.ownerEmail})`;
    }
    return row.ownerEmail || row.ownerName || t("pages.licenses.no_owner");
  };

  const statusIcon = (status: string | null) => {
    switch (status) {
      case "paying":
      case "ACTIVE":
      case "active":
        return <BadgeCheck className="h-3.5 w-3.5 text-[#071A2D]" />;
      case "trialing":
      case "TRIAL":
        return <CircleDot className="h-3.5 w-3.5 text-[#071A2D]" />;
      case "manual":
        return <BadgeCheck className="h-3.5 w-3.5 text-[#8A6418]" />;
      case "past_due":
      case "PAST_DUE":
      case "trial_expired":
        return <AlertTriangle className="h-3.5 w-3.5 text-[#8A6418]" />;
      case "canceled":
      case "CANCELED":
        return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return null;
    }
  };

  const scopeOf = (row: LicenseRow) =>
    row.kind === "diocese"
      ? { dioceseId: row.entityId }
      : { parishId: row.entityId };

  const open = (row: LicenseRow, kind: DialogKind) => {
    setTarget(row);
    setDialog(kind);
    setDays("7");
    setPlanSlug(
      row.plan && row.plan !== "catechist_free"
        ? row.plan
        : sellablePlans[0]?.slug || "",
    );
    setError("");
  };

  const close = () => {
    setDialog(null);
    setTarget(null);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refetch();
      close();
    } catch (err: any) {
      setError(err?.message || t("pages.licenses.action_error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t("pages.admin")}
          title={t("pages.licenses.title")}
          subtitle={t("pages.licenses.subtitle")}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        {isLoading ? (
          <div className="space-y-4" aria-busy="true">
            <SkeletonTable rows={8} />
          </div>
        ) : loadError && licenses.length === 0 ? (
          <QueryErrorState error={loadError} onRetry={refetch} />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Label htmlFor="license-search" className="sr-only">
                {t("pages.licenses.search_placeholder")}
              </Label>
              <Input
                id="license-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("pages.licenses.search_placeholder")}
                className="max-w-md"
              />
            </div>
            <div className="rounded-sm border border-border/70 bg-white overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("pages.licenses.col_entity")}
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("pages.licenses.col_owner")}
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("pages.licenses.col_type")}
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("pages.licenses.col_plan")}
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("pages.licenses.col_status")}
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("pages.licenses.col_actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLicenses.map((row: LicenseRow) => (
                    <tr
                      key={row.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {row.type === "PERSONAL" ? (
                            <Activity className="h-4 w-4" />
                          ) : row.kind === "diocese" ? (
                            <Building2 className="h-4 w-4" />
                          ) : (
                            <Church className="h-4 w-4" />
                          )}
                          {row.kind === "parish" ? (
                            <NavLink
                              to={`/admin/parishes/${row.entityId}`}
                              className="font-semibold tracking-tight text-[#071A2D] hover:underline"
                            >
                              {row.name}
                            </NavLink>
                          ) : (
                            <NavLink
                              to={`/admin/parishes?dioceseId=${row.entityId}`}
                              className="font-semibold tracking-tight text-[#071A2D] hover:underline"
                            >
                              {row.name}
                            </NavLink>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.ownerId ? (
                          <NavLink
                            to={`/admin/users/${row.ownerId}`}
                            className="block min-w-0 hover:underline"
                            aria-label={t("pages.licenses.open_owner", {
                              email:
                                row.ownerEmail || row.ownerName || row.ownerId,
                            })}
                          >
                            <span className="block truncate text-xs font-semibold tracking-tight text-[#071A2D]">
                              {row.ownerEmail ||
                                row.ownerName ||
                                t("pages.licenses.no_owner")}
                            </span>
                            {row.ownerEmail && row.ownerName && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {row.ownerName}
                              </span>
                            )}
                          </NavLink>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t("pages.licenses.no_owner")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {row.kind === "diocese"
                          ? t("pages.licenses.diocese")
                          : resolveAdminCodeLabel(
                              "parishType",
                              row.type || "PARISH",
                              t,
                            )}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold tracking-tight text-[#071A2D]">
                        {resolvePlanName(row.plan)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1">
                          {statusIcon(row.status)}
                          <span className="text-xs">{resolveStatusLabel(row)}</span>
                          {row.trialEndsAt && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {t("pages.licenses.until")}{" "}
                              {formatDate(row.trialEndsAt, currentLocale)}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => open(row, "extend")}
                          >
                            {t("pages.licenses.extend_trial")}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="xs"
                                variant="outline"
                                aria-label={t("pages.licenses.more_actions")}
                              >
                                {t("pages.licenses.more_actions")}
                                <MoreHorizontal className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[12rem]">
                              <DropdownMenuItem
                                onClick={() => open(row, "complimentary")}
                              >
                                {t("pages.licenses.complimentary")}
                              </DropdownMenuItem>
                              {row.kind === "diocese" && (
                                <DropdownMenuItem
                                  disabled={busy}
                                  onClick={() =>
                                    void run(async () => {
                                      await setComplimentaryPlan({
                                        dioceseId: row.entityId,
                                        planSlug: "unlimited",
                                      });
                                    })
                                  }
                                >
                                  {t("pages.licenses.assign_diocese")}
                                </DropdownMenuItem>
                              )}
                              {(row.billingId ||
                                (row.hasStripe && row.ownerId)) && (
                                <DropdownMenuSeparator />
                              )}
                              {row.billingId && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => open(row, "cancelLicense")}
                                >
                                  {t("pages.licenses.cancel_license")}
                                </DropdownMenuItem>
                              )}
                              {row.hasStripe && row.ownerId && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => open(row, "cancelStripe")}
                                >
                                  {t("pages.licenses.cancel_stripe")}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredLicenses.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        {t("pages.licenses.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={dialog === "extend"}
        onOpenChange={(openState) => !openState && close()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pages.licenses.extend_title")}</DialogTitle>
            <DialogDescription>
              {t("pages.licenses.extend_desc")}
              {target && (
                <span className="mt-2 block text-[#071A2D]">
                  {target.name} · {ownerLabel(target)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            aria-label={t("pages.licenses.days")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              {t("pages.plans.cancel")}
            </Button>
            <Button
              disabled={busy || !target}
              onClick={() =>
                target &&
                run(async () => {
                  await extendTenantTrial({
                    ...scopeOf(target),
                    days: Number(days) || 7,
                  });
                })
              }
            >
              {t("pages.licenses.extend_trial")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "complimentary"}
        onOpenChange={(openState) => !openState && close()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pages.licenses.complimentary_title")}</DialogTitle>
            <DialogDescription>
              {t("pages.licenses.complimentary_desc")}
              {target && (
                <span className="mt-2 block text-[#071A2D]">
                  {target.name} · {ownerLabel(target)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <select
            className="h-9 w-full rounded-sm border border-input bg-background px-3 text-sm"
            value={planSlug}
            onChange={(e) => setPlanSlug(e.target.value)}
          >
            <option value="">{t("pages.licenses.select_plan")}</option>
            {sellablePlans.map((plan: any) => (
              <option key={plan.id} value={plan.slug}>
                {plan.name} ({plan.slug})
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              {t("pages.plans.cancel")}
            </Button>
            <Button
              disabled={busy || !target || !planSlug}
              onClick={() =>
                target &&
                run(async () => {
                  await setComplimentaryPlan({
                    ...scopeOf(target),
                    planSlug,
                  });
                })
              }
            >
              {t("pages.licenses.complimentary")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialog === "cancelLicense"}
        onOpenChange={(openState) => !openState && close()}
        title={t("pages.licenses.cancel_license_title")}
        description={
          target
            ? `${t("pages.licenses.cancel_license_desc")} ${target.name} · ${ownerLabel(target)}.`
            : t("pages.licenses.cancel_license_desc")
        }
        confirmLabel={t("pages.licenses.cancel_license")}
        variant="destructive"
        loading={busy}
        onConfirm={() =>
          target &&
          void run(async () => {
            await cancelTenantLicense(scopeOf(target));
          })
        }
      />

      <ConfirmDialog
        open={dialog === "cancelStripe"}
        onOpenChange={(openState) => !openState && close()}
        title={t("pages.licenses.cancel_stripe_title")}
        description={
          target
            ? `${t("pages.licenses.cancel_stripe_desc")} ${target.name} · ${ownerLabel(target)}.`
            : t("pages.licenses.cancel_stripe_desc")
        }
        confirmLabel={t("pages.licenses.cancel_stripe")}
        variant="destructive"
        loading={busy}
        onConfirm={() =>
          target?.ownerId &&
          void run(async () => {
            await cancelUserSubscriptionImmediate({
              userId: target.ownerId!,
              confirm: true,
            });
          })
        }
      />
    </DefaultLayout>
  );
};

export default BillingPage;
