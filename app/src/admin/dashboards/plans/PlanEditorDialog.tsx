import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Switch } from "../../../client/components/ui/switch";
import { Textarea } from "../../../client/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import type { AdminPricingPlan } from "./PlansPage";

export type PlanEditorValues = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  kind: "subscription" | "credits";
  level: "personal" | "institutional";
  creditsAmount: number | null;
  isActive: boolean;
  isPublic: boolean;
  highlight: boolean;
  sortOrder: number;
  maxClasses: number | null;
  maxCatechumens: number | null;
  maxCatechists: number | null;
  maxParishes: number | null;
  maxGroups: number | null;
  canCreateGroups: boolean;
  canAccessCatechesis: boolean;
  aiMonthlyCredits: number;
  aiDailyLimit: number;
  aiInitialCredits: number;
  socialMaxPostsPerDay: number | null;
  socialMaxMediaPerPost: number;
  socialMaxVideoSeconds: number;
  features: string[];
  translations: {
    en?: { name?: string; features?: string[] };
    es?: { name?: string; features?: string[] };
  };
  confirmLimitReduction?: boolean;
};

function fromAdminPlan(plan: AdminPricingPlan): PlanEditorValues {
  const translations = (plan.translations ?? {}) as PlanEditorValues["translations"];
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description ?? "",
    kind: plan.kind === "CREDITS" ? "credits" : "subscription",
    level: plan.level === "INSTITUTIONAL" ? "institutional" : "personal",
    creditsAmount: plan.creditsAmount,
    isActive: plan.isActive,
    isPublic: plan.isPublic,
    highlight: plan.highlight,
    sortOrder: plan.sortOrder,
    maxClasses: plan.maxClasses,
    maxCatechumens: plan.maxCatechumens,
    maxCatechists: plan.maxCatechists,
    maxParishes: plan.maxParishes,
    maxGroups: plan.maxGroups ?? null,
    canCreateGroups: Boolean(plan.canCreateGroups),
    canAccessCatechesis: plan.canAccessCatechesis ?? false,
    aiMonthlyCredits: plan.aiMonthlyCredits,
    aiDailyLimit: plan.aiDailyLimit,
    aiInitialCredits: plan.aiInitialCredits,
    socialMaxPostsPerDay: plan.socialMaxPostsPerDay,
    socialMaxMediaPerPost: plan.socialMaxMediaPerPost,
    socialMaxVideoSeconds: plan.socialMaxVideoSeconds,
    features: Array.isArray(plan.features) ? plan.features : [],
    translations: {
      en: translations.en ?? { name: "", features: [] },
      es: translations.es ?? { name: "", features: [] },
    },
  };
}

function emptyPlan(): PlanEditorValues {
  return {
    slug: "",
    name: "",
    description: "",
    kind: "subscription",
    level: "personal",
    creditsAmount: null,
    isActive: true,
    isPublic: true,
    highlight: false,
    sortOrder: 100,
    maxClasses: 3,
    maxCatechumens: 150,
    maxCatechists: 1,
    maxParishes: 1,
    maxGroups: 3,
    canCreateGroups: true,
    canAccessCatechesis: true,
    aiMonthlyCredits: 0,
    aiDailyLimit: 0,
    aiInitialCredits: 0,
    socialMaxPostsPerDay: 0,
    socialMaxMediaPerPost: 0,
    socialMaxVideoSeconds: 0,
    features: [],
    translations: {
      en: { name: "", features: [] },
      es: { name: "", features: [] },
    },
  };
}

function LimitField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const unlimited = value == null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={unlimited} onCheckedChange={(checked) => onChange(checked ? null : 0)} />
          Ilimitado
        </label>
      </div>
      <Input
        type="number"
        min={0}
        disabled={unlimited}
        value={unlimited ? "" : value}
        onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
      />
    </div>
  );
}

interface PlanEditorDialogProps {
  open: boolean;
  plan: AdminPricingPlan | null;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PlanEditorValues) => Promise<void> | void;
}

export function PlanEditorDialog({
  open,
  plan,
  saving,
  onOpenChange,
  onSubmit,
}: PlanEditorDialogProps) {
  const { t } = useTranslation("admin");
  const isEdit = Boolean(plan);
  const [values, setValues] = useState<PlanEditorValues>(plan ? fromAdminPlan(plan) : emptyPlan());

  useEffect(() => {
    setValues(plan ? fromAdminPlan(plan) : emptyPlan());
  }, [plan, open]);

  const update = <K extends keyof PlanEditorValues>(key: K, value: PlanEditorValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const featuresText = values.features.join("\n");
  const enFeatures = (values.translations.en?.features ?? []).join("\n");
  const esFeatures = (values.translations.es?.features ?? []).join("\n");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("pages.plans.edit_title") : t("pages.plans.new_title")}
          </DialogTitle>
          <DialogDescription>{t("pages.plans.editor_subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="plan-name">{t("pages.plans.field_name")}</Label>
            <Input
              id="plan-name"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-slug">{t("pages.plans.field_slug")}</Label>
            <Input
              id="plan-slug"
              value={values.slug}
              disabled={isEdit}
              onChange={(event) => update("slug", event.target.value.toLowerCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("pages.plans.field_sort")}</Label>
            <Input
              type="number"
              value={values.sortOrder}
              onChange={(event) => update("sortOrder", Number(event.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("pages.plans.field_kind")}</Label>
            <Select
              value={values.kind}
              onValueChange={(value) => update("kind", value as PlanEditorValues["kind"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subscription">{t("pages.plans.kind_subscription")}</SelectItem>
                <SelectItem value="credits">{t("pages.plans.kind_credits")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("pages.plans.field_level")}</Label>
            <Select
              value={values.level}
              onValueChange={(value) => update("level", value as PlanEditorValues["level"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">{t("pages.plans.level_personal")}</SelectItem>
                <SelectItem value="institutional">{t("pages.plans.level_institutional")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {values.kind === "credits" && (
            <div className="space-y-1.5">
              <Label>{t("pages.plans.field_credits")}</Label>
              <Input
                type="number"
                min={0}
                value={values.creditsAmount ?? 0}
                onChange={(event) => update("creditsAmount", Number(event.target.value))}
              />
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("pages.plans.field_description")}</Label>
            <Textarea
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between rounded-sm border border-border/70 px-3 py-2">
            <Label>{t("pages.plans.field_active")}</Label>
            <Switch
              checked={values.isActive}
              onCheckedChange={(checked) => {
                update("isActive", checked);
                if (checked && !values.isPublic) {
                  update("isPublic", true);
                }
              }}
            />
          </div>
          <div className="flex items-center justify-between rounded-sm border border-border/70 px-3 py-2">
            <Label>{t("pages.plans.field_public")}</Label>
            <Switch checked={values.isPublic} onCheckedChange={(checked) => update("isPublic", checked)} />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {t("pages.plans.field_visibility_help")}
          </p>
          <div className="flex items-center justify-between rounded-sm border border-border/70 px-3 py-2 sm:col-span-2">
            <Label>{t("pages.plans.field_highlight")}</Label>
            <Switch checked={values.highlight} onCheckedChange={(checked) => update("highlight", checked)} />
          </div>

          <LimitField
            label={t("pages.plans.limit_classes")}
            value={values.maxClasses}
            onChange={(value) => update("maxClasses", value)}
          />
          <LimitField
            label={t("pages.plans.limit_catechumens")}
            value={values.maxCatechumens}
            onChange={(value) => update("maxCatechumens", value)}
          />
          <LimitField
            label={t("pages.plans.limit_catechists")}
            value={values.maxCatechists}
            onChange={(value) => update("maxCatechists", value)}
          />
          <LimitField
            label={t("pages.plans.limit_parishes")}
            value={values.maxParishes}
            onChange={(value) => update("maxParishes", value)}
          />
          <LimitField
            label={t("pages.plans.limit_groups")}
            value={values.maxGroups}
            onChange={(value) => update("maxGroups", value)}
          />
          <div className="flex items-center justify-between rounded-sm border border-border/70 px-3 py-2">
            <Label>{t("pages.plans.can_create_groups")}</Label>
            <Switch
              checked={values.canCreateGroups}
              onCheckedChange={(checked) => update("canCreateGroups", checked)}
            />
          </div>
          <div className="flex items-center justify-between rounded-sm border border-border/70 px-3 py-2">
            <Label>{t("pages.plans.can_access_catechesis")}</Label>
            <Switch
              checked={values.canAccessCatechesis}
              onCheckedChange={(checked) => update("canAccessCatechesis", checked)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("pages.plans.ai_monthly")}</Label>
            <Input
              type="number"
              min={0}
              value={values.aiMonthlyCredits}
              onChange={(event) => update("aiMonthlyCredits", Number(event.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("pages.plans.ai_daily")}</Label>
            <Input
              type="number"
              min={0}
              value={values.aiDailyLimit}
              onChange={(event) => update("aiDailyLimit", Number(event.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("pages.plans.ai_initial")}</Label>
            <Input
              type="number"
              min={0}
              value={values.aiInitialCredits}
              onChange={(event) => update("aiInitialCredits", Number(event.target.value))}
            />
          </div>
          <LimitField
            label={t("pages.plans.social_posts")}
            value={values.socialMaxPostsPerDay}
            onChange={(value) => update("socialMaxPostsPerDay", value)}
          />

          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("pages.plans.field_features")}</Label>
            <Textarea
              value={featuresText}
              onChange={(event) =>
                update(
                  "features",
                  event.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                )
              }
              rows={5}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("pages.plans.field_name_en")}</Label>
            <Input
              value={values.translations.en?.name ?? ""}
              onChange={(event) =>
                update("translations", {
                  ...values.translations,
                  en: { ...values.translations.en, name: event.target.value },
                })
              }
            />
            <Textarea
              value={enFeatures}
              onChange={(event) =>
                update("translations", {
                  ...values.translations,
                  en: {
                    ...values.translations.en,
                    features: event.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  },
                })
              }
              rows={4}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("pages.plans.field_name_es")}</Label>
            <Input
              value={values.translations.es?.name ?? ""}
              onChange={(event) =>
                update("translations", {
                  ...values.translations,
                  es: { ...values.translations.es, name: event.target.value },
                })
              }
            />
            <Textarea
              value={esFeatures}
              onChange={(event) =>
                update("translations", {
                  ...values.translations,
                  es: {
                    ...values.translations.es,
                    features: event.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  },
                })
              }
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("pages.plans.cancel")}
          </Button>
          <Button onClick={() => onSubmit(values)} disabled={saving || !values.slug || !values.name}>
            {saving ? t("pages.plans.saving") : t("pages.plans.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
