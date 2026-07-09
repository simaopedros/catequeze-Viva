import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import {
  AppPageHeader,
  AppPanel,
} from "../../../client/components/brand/AppChrome";
import { EmptyState } from "../../../client/components/EmptyState";
import { Eye, Library } from "lucide-react";

interface ReviewerDashboardProps {
  stats: any;
}

export function ReviewerDashboard({ stats }: ReviewerDashboardProps) {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={t("reviewer_title")}
        title={t("reviewer_title")}
        subtitle={t("reviewer_subtitle")}
        actions={
          <Button asChild className="h-10 rounded-sm shadow-none">
            <Link to="/app/content-library">
              <Library className="mr-2 h-4 w-4" />
              {t("go_to_library")}
            </Link>
          </Button>
        }
      />

      {stats?.reviewQueue?.length > 0 ? (
        <AppPanel padded={false} className="divide-y divide-border/70">
          {stats.reviewQueue.map((c: any) => (
            <Link
              key={c.id}
              to={`/app/content-library/${c.id}`}
              className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/20 group"
            >
              <div className="min-w-0 flex-1 mr-3">
                <p
                  className="truncate font-semibold tracking-tight text-foreground transition-colors group-hover:text-[#071A2D]"
                  style={{ fontFamily: "var(--font-brand-display)" }}
                >
                  {c.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.theme} · {t("by")} {c.createdBy?.firstName}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 rounded-sm">
                {t("pending_review")}
              </Badge>
            </Link>
          ))}
        </AppPanel>
      ) : (
        <EmptyState
          compact
          icon={Eye}
          title={t("no_pending_review")}
          description={t("no_pending_review_desc")}
        />
      )}
    </div>
  );
}
