import { useMemo, useState, type ComponentType } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  listPastoralGroups,
  useQuery,
} from "wasp/client/operations";
import {
  Heart,
  Music,
  UsersRound,
  Church,
  HandHeart,
  Home,
  Flame,
  GraduationCap,
  Shapes,
  Search,
} from "lucide-react";
import { AppPageHeader, AppPanel } from "../../client/components/brand/AppChrome";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { EmptyState } from "../../client/components/EmptyState";
import { SkeletonCard } from "../../client/components/Skeletons";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { planCanCreateGroups } from "../../shared/pricing";
import { PASTORAL_GROUP_KINDS } from "../../shared/pastoralGroups";
import { buildBillingJourneyHref } from "../lib/upgradeJourney";
import { PaymentPlanId } from "../../payment/plans";
import { cn } from "../../client/utils";

const KIND_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  YOUTH: UsersRound,
  MUSIC: Music,
  PRAYER: Heart,
  LITURGY: Church,
  CHARITY: HandHeart,
  FAMILY: Home,
  MOVEMENT: Flame,
  FORMATION: GraduationCap,
  CUSTOM: Shapes,
};

export default function GroupsPage() {
  const { t } = useTranslation("groups");
  const { workspacePlan, isPersonal } = useActiveWorkspace();
  const canCreate = planCanCreateGroups(workspacePlan);
  const [mine, setMine] = useState(false);
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery(listPastoralGroups, {
    mine,
    kind: kind || null,
    q: q.trim() || null,
  });

  const groups = data ?? [];

  const createHref = canCreate
    ? "/app/grupos/novo"
    : buildBillingJourneyHref({
        planId: isPersonal ? PaymentPlanId.Single : PaymentPlanId.Unlimited,
        reason: "group_limit",
        source: "onboarding",
        required: true,
      });

  const kindOptions = useMemo(
    () =>
      PASTORAL_GROUP_KINDS.map((value) => ({
        value,
        label: t(`kinds.${value}`),
      })),
    [t],
  );

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        primaryAction={{
          label: canCreate ? t("create") : t("upgrade_to_create"),
          href: createHref,
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex rounded-md border border-border/70 p-0.5">
          <button
            type="button"
            className={cn(
              "min-h-10 rounded-sm px-3 text-sm font-medium",
              !mine ? "bg-brand-ink text-white" : "text-muted-foreground",
            )}
            onClick={() => setMine(false)}
          >
            {t("tab_discover")}
          </button>
          <button
            type="button"
            className={cn(
              "min-h-10 rounded-sm px-3 text-sm font-medium",
              mine ? "bg-brand-ink text-white" : "text-muted-foreground",
            )}
            onClick={() => setMine(true)}
          >
            {t("tab_mine")}
          </button>
        </div>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search_placeholder")}
            className="pl-9"
          />
        </div>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="min-h-10 rounded-md border border-border bg-background px-3 text-sm text-brand-ink"
        >
          <option value="">{t("all_kinds")}</option>
          {kindOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{t("load_error")}</p>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={mine ? t("empty_mine") : t("empty_discover")}
          description={canCreate ? t("empty_hint_create") : t("empty_hint_join")}
        >
          <Button asChild>
            <Link to={createHref}>{canCreate ? t("create") : t("upgrade_to_create")}</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group: any) => {
            const Icon = KIND_ICONS[group.kind] || UsersRound;
            return (
              <Link key={group.id} to={`/app/grupos/${group.id}`}>
                <AppPanel className="h-full transition-colors hover:border-brand-gold/40">
                  <div className="flex items-start gap-3">
                    <div className="rounded-sm border border-brand-gold/25 bg-brand-paper p-2">
                      <Icon className="h-4 w-4 text-brand-ink" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold tracking-tight text-brand-ink">
                        {group.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(`kinds.${group.kind}`)}
                        {group.city ? ` · ${group.city}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("member_count", { count: group.memberCount })}
                        {group.myStatus === "PENDING" ? ` · ${t("status_pending")}` : ""}
                      </p>
                    </div>
                  </div>
                </AppPanel>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
