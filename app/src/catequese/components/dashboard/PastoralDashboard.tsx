import { useTranslation } from "react-i18next";
import {
  AppPageHeader,
  AppMetric,
} from "../../../client/components/brand/AppChrome";

interface PastoralDashboardProps {
  stats: any;
}

export function PastoralDashboard({ stats }: PastoralDashboardProps) {
  const { t: tc } = useTranslation("common");
  const { t } = useTranslation("dashboard");

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={tc("pastoral_view")}
        title={tc("pastoral_view")}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <AppMetric
          label={t("active_catechumens")}
          value={stats?.activeCatechumens ?? 0}
        />
        <AppMetric
          label={t("active_classes")}
          value={stats?.activeClasses ?? 0}
        />
        <AppMetric
          label={t("pending_items")}
          value={stats?.pendingSacraments ?? 0}
        />
      </div>
    </div>
  );
}
