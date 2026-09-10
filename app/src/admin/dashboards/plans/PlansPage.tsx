import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  listPricingPlansAdmin,
  upsertPricingPlan,
  setPricingPlanPrice,
  archivePricingPlan,
  reorderPricingPlans,
} from "wasp/client/operations";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Archive, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import { QueryErrorState } from "../../../client/components/QueryErrorState";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import { ConfirmDialog } from "../../../client/components/ConfirmDialog";
import { formatPrice } from "../../../shared/currency";
import { PlanEditorDialog, type PlanEditorValues } from "./PlanEditorDialog";
import { PlanPricesCard } from "./PlanPricesCard";

export type AdminPricingPlanPrice = {
  id: string;
  interval: "MONTHLY" | "ANNUAL" | "ONE_TIME";
  currency: string;
  unitAmountCents: number;
  stripePriceId: string | null;
  stripeLookupKey: string | null;
  isActive: boolean;
  archivedAt: string | Date | null;
  createdAt: string | Date;
};

export type AdminPricingPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: "SUBSCRIPTION" | "CREDITS";
  level: "PERSONAL" | "INSTITUTIONAL";
  creditsAmount: number | null;
  isSystem: boolean;
  isActive: boolean;
  isPublic: boolean;
  highlight: boolean;
  sortOrder: number;
  maxClasses: number | null;
  maxCatechumens: number | null;
  maxCatechists: number | null;
  maxParishes: number | null;
  aiMonthlyCredits: number;
  aiDailyLimit: number;
  aiInitialCredits: number;
  socialMaxPostsPerDay: number | null;
  socialMaxMediaPerPost: number;
  socialMaxVideoSeconds: number;
  features: string[] | unknown;
  translations: unknown;
  stripeProductId: string | null;
  prices: AdminPricingPlanPrice[];
  subscriberCount: number;
  subscriberUsers?: number;
  subscriberTenants?: number;
};

function activePrice(plan: AdminPricingPlan, interval: AdminPricingPlanPrice["interval"]) {
  return plan.prices.find((price) => price.interval === interval && price.isActive);
}

const PlansPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const { data, isLoading, error, refetch } = useQuery(listPricingPlansAdmin);
  const plans = (data ?? []) as AdminPricingPlan[];
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPricingPlan | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<AdminPricingPlan | null>(null);
  const [archiveNeedsConfirm, setArchiveNeedsConfirm] = useState(false);
  const [limitConfirm, setLimitConfirm] = useState<PlanEditorValues | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
    setFormError(null);
  };

  const openEdit = (plan: AdminPricingPlan) => {
    setEditing(plan);
    setEditorOpen(true);
    setFormError(null);
  };

  const submitPlan = async (values: PlanEditorValues, confirmLimitReduction = false) => {
    setSaving(true);
    setFormError(null);
    try {
      const result = (await upsertPricingPlan({
        ...values,
        description: values.description || null,
        confirmLimitReduction,
      })) as {
        needsConfirmation?: boolean;
        impactPreview?: { subscribersAffected: number; reducingLimits: boolean };
        plan?: AdminPricingPlan;
      };
      if (result.needsConfirmation) {
        setLimitConfirm(values);
        setFormError(
          t("pages.plans.limit_reduction_warning", {
            count: result.impactPreview?.subscribersAffected ?? 0,
          }),
        );
        return;
      }
      setEditorOpen(false);
      setLimitConfirm(null);
      await refetch();
    } catch (err: any) {
      setFormError(err?.message || t("pages.plans.save_error"));
    } finally {
      setSaving(false);
    }
  };

  const runArchive = async (confirmAffected = false) => {
    if (!archiveTarget) return;
    setSaving(true);
    try {
      const result = (await archivePricingPlan({
        planId: archiveTarget.id,
        confirmAffected,
      })) as { needsConfirmation?: boolean; affected?: number };
      if (result.needsConfirmation) {
        setArchiveNeedsConfirm(true);
        return;
      }
      setArchiveTarget(null);
      setArchiveNeedsConfirm(false);
      await refetch();
    } catch (err: any) {
      setFormError(err?.message || t("pages.plans.archive_error"));
    } finally {
      setSaving(false);
    }
  };

  const movePlan = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= plans.length) return;
    const orderedIds = plans.map((plan) => plan.id);
    const [moved] = orderedIds.splice(index, 1);
    orderedIds.splice(target, 0, moved);
    setSaving(true);
    try {
      await reorderPricingPlans({ orderedIds });
      await refetch();
    } catch (err: any) {
      setFormError(err?.message || t("pages.plans.save_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t("pages.admin")}
          title={t("pages.plans.title")}
          subtitle={t("pages.plans.subtitle")}
          actions={
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("pages.plans.new_plan")}
            </Button>
          }
        />

        {formError && (
          <p className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12" aria-busy="true">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-ink border-t-transparent" />
          </div>
        ) : error && plans.length === 0 ? (
          <QueryErrorState error={error} onRetry={refetch} />
        ) : (
          <div className="overflow-hidden rounded-sm border border-border/70 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-4 py-3">{t("pages.plans.col_name")}</th>
                  <th className="px-4 py-3">{t("pages.plans.col_type")}</th>
                  <th className="px-4 py-3">{t("pages.plans.col_prices")}</th>
                  <th className="px-4 py-3">{t("pages.plans.col_status")}</th>
                  <th className="px-4 py-3">{t("pages.plans.col_subscribers")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {plans.map((plan, index) => {
                  const monthly = activePrice(plan, "MONTHLY") || activePrice(plan, "ONE_TIME");
                  const annual = activePrice(plan, "ANNUAL");
                  return (
                    <Fragment key={plan.id}>
                      <tr className="border-b border-border/60">
                        <td className="px-4 py-3">
                          <div className="font-medium text-brand-ink">{plan.name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{plan.slug}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{plan.kind === "CREDITS" ? t("pages.plans.kind_credits") : t("pages.plans.kind_subscription")}</div>
                          <div className="text-xs text-muted-foreground">
                            {plan.level === "INSTITUTIONAL"
                              ? t("pages.plans.level_institutional")
                              : t("pages.plans.level_personal")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {monthly ? <div>{formatPrice(monthly.unitAmountCents)}</div> : <div>—</div>}
                          {annual && <div className="text-muted-foreground">{formatPrice(annual.unitAmountCents)}/ano</div>}
                          {plan.stripeProductId ? (
                            <Badge variant="success" size="sm" className="mt-1">
                              Stripe
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm" className="mt-1">
                              {t("pages.plans.no_stripe_product")}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {plan.isActive ? (
                              <Badge variant="success" size="sm">{t("pages.plans.badge_sellable")}</Badge>
                            ) : (
                              <Badge variant="secondary" size="sm">{t("pages.plans.badge_archived")}</Badge>
                            )}
                            {plan.isPublic && (
                              <Badge variant="info" size="sm">{t("pages.plans.badge_public")}</Badge>
                            )}
                            {plan.isSystem && (
                              <Badge variant="outline" size="sm">{t("pages.plans.badge_system")}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{plan.subscriberCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="xs"
                              variant="ghost"
                              disabled={index === 0 || saving}
                              onClick={() => movePlan(index, -1)}
                              aria-label={t("pages.plans.move_up")}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              disabled={index === plans.length - 1 || saving}
                              onClick={() => movePlan(index, 1)}
                              aria-label={t("pages.plans.move_down")}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => openEdit(plan)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                            >
                              {t("pages.plans.prices")}
                            </Button>
                            {!plan.isSystem && plan.isActive && (
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => {
                                  setArchiveTarget(plan);
                                  setArchiveNeedsConfirm(false);
                                }}
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === plan.id && (
                        <tr>
                          <td colSpan={6} className="bg-muted/20 px-4 py-4">
                            <PlanPricesCard
                              plan={plan}
                              changing={saving}
                              onChangePrice={async (interval, unitAmountCents) => {
                                setSaving(true);
                                try {
                                  await setPricingPlanPrice({
                                    planId: plan.id,
                                    interval,
                                    unitAmountCents,
                                  });
                                  await refetch();
                                } finally {
                                  setSaving(false);
                                }
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PlanEditorDialog
        open={editorOpen}
        plan={editing}
        saving={saving}
        onOpenChange={setEditorOpen}
        onSubmit={(values) => submitPlan(values, false)}
      />

      <ConfirmDialog
        open={Boolean(limitConfirm)}
        onOpenChange={(open) => {
          if (!open) setLimitConfirm(null);
        }}
        title={t("pages.plans.limit_reduction_title")}
        description={formError || t("pages.plans.limit_reduction_desc")}
        confirmLabel={t("pages.plans.confirm_reduce")}
        onConfirm={() => {
          if (limitConfirm) void submitPlan(limitConfirm, true);
        }}
        loading={saving}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
            setArchiveNeedsConfirm(false);
          }
        }}
        title={t("pages.plans.archive_title")}
        description={
          archiveNeedsConfirm
            ? t("pages.plans.archive_affected", { count: archiveTarget?.subscriberCount ?? 0 })
            : t("pages.plans.archive_desc")
        }
        confirmLabel={t("pages.plans.archive")}
        variant="destructive"
        onConfirm={() => void runArchive(archiveNeedsConfirm || (archiveTarget?.subscriberCount ?? 0) === 0)}
        loading={saving}
      />
    </DefaultLayout>
  );
};

export default PlansPage;
