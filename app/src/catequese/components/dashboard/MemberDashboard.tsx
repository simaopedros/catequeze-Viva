import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery, listPastoralGroups } from "wasp/client/operations";
import { BookMarked, ScrollText, UsersRound, Plus } from "lucide-react";
import {
  AppDisplayTitle,
  AppEyebrow,
  AppGoldRule,
  AppPanel,
} from "../../../client/components/brand/AppChrome";
import { Button } from "../../../client/components/ui/button";
import { useAuth } from "wasp/client/auth";
import { useActiveWorkspace } from "../../../client/hooks/useActiveWorkspace";
import { planCanCreateGroups } from "../../../shared/pricing";
import { buildBillingJourneyHref } from "../../lib/upgradeJourney";
import { PaymentPlanId } from "../../../payment/plans";

export function MemberDashboard() {
  const { t } = useTranslation("groups");
  const { data: user } = useAuth();
  const { workspacePlan, isPersonal } = useActiveWorkspace();
  const canCreate = planCanCreateGroups(workspacePlan);
  const firstName = user?.firstName || "";
  const { data: mine = [] } = useQuery(listPastoralGroups, { mine: true });

  const createHref = canCreate
    ? "/app/grupos/novo"
    : buildBillingJourneyHref({
        planId: isPersonal ? PaymentPlanId.Single : PaymentPlanId.Unlimited,
        reason: "group_limit",
        source: "onboarding",
        required: true,
      });

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AppEyebrow>{t("home_eyebrow")}</AppEyebrow>
        <AppDisplayTitle as="h1">
          {firstName ? t("home_hello", { name: firstName }) : t("home_hello_default")}
        </AppDisplayTitle>
        <AppGoldRule />
        <p className="max-w-xl text-sm text-muted-foreground">{t("home_subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AppPanel>
          <p className="text-sm font-semibold text-brand-ink">{t("title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("home_groups_hint")}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/app/grupos">{t("tab_discover")}</Link>
          </Button>
        </AppPanel>
        <AppPanel>
          <p className="text-sm font-semibold text-brand-ink">{t("home_bible")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("home_bible_hint")}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/app/bible">
              <BookMarked className="mr-2 h-4 w-4" />
              {t("open_bible")}
            </Link>
          </Button>
        </AppPanel>
        <AppPanel>
          <p className="text-sm font-semibold text-brand-ink">{t("home_catechism")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("home_catechism_hint")}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/app/catechism">
              <ScrollText className="mr-2 h-4 w-4" />
              {t("open_catechism")}
            </Link>
          </Button>
        </AppPanel>
      </div>

      <AppPanel className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-brand-ink">{t("tab_mine")}</h2>
          <Button asChild size="sm">
            <Link to={createHref}>
              <Plus className="mr-2 h-4 w-4" />
              {canCreate ? t("create") : t("upgrade_to_create")}
            </Link>
          </Button>
        </div>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty_mine")}</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {mine.slice(0, 6).map((group: any) => (
              <li key={group.id}>
                <Link
                  to={`/app/grupos/${group.id}`}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="flex items-center gap-2 font-medium text-brand-ink">
                    <UsersRound className="h-4 w-4" />
                    {group.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(`kinds.${group.kind}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AppPanel>
    </div>
  );
}
