import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus, Sparkles, Upload, UserPlus } from "lucide-react";
import {
  AppEyebrow,
  AppPanel,
} from "../../../client/components/brand/AppChrome";
import { cn } from "../../../client/utils";
import { AI_FEATURES_ENABLED } from "../../../shared/aiFeatures";
import { SOCIAL_FEATURES_ENABLED } from "../../../shared/socialFeatures";

type QuickAction = {
  id: string;
  to: string;
  icon: LucideIcon;
  iconClass: string;
  title: string;
  description: string;
};

function QuickActionTile({ action }: { action: QuickAction }) {
  const Icon = action.icon;
  return (
    <Link
      to={action.to}
      className="group flex min-h-11 min-w-0 flex-col items-center gap-2 rounded-lg border border-border/70 bg-surface-elevated p-3 text-center transition-[box-shadow,border-color] duration-150 hover:border-input hover:shadow-elevation-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full",
          action.iconClass,
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="max-w-full break-words text-xs font-semibold leading-snug tracking-tight text-brand-ink">
        {action.title}
      </span>
      <span className="hidden max-w-full break-words text-[11px] leading-snug text-muted-foreground sm:block">
        {action.description}
      </span>
    </Link>
  );
}

interface QuickActionsGridProps {
  className?: string;
}

export function QuickActionsGrid({ className }: QuickActionsGridProps) {
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation("common");

  const actions: QuickAction[] = [
    {
      id: "new-catechumen",
      to: "/app/catechumens/new",
      icon: UserPlus,
      iconClass: "bg-info/10 text-info",
      title: tc("create_catechumen"),
      description: t("quick_new_catechumen_desc"),
    },
    {
      id: "new-class",
      to: "/app/classes/new",
      icon: Plus,
      iconClass: "bg-success/10 text-success",
      title: t("create_class"),
      description: t("quick_new_class"),
    },
    {
      id: "import",
      to: "/app/catechumens/import",
      icon: Upload,
      iconClass: "bg-brand-ink/8 text-brand-ink",
      title: t("quick_import_list"),
      description: t("quick_import_list_desc"),
    },
  ];
  if (SOCIAL_FEATURES_ENABLED) {
    actions.push({
      id: "community",
      to: "/app/comunidade",
      icon: Sparkles,
      iconClass: "bg-brand-gold/12 text-brand-gold-muted",
      title: t("quick_community"),
      description: t("quick_community_desc"),
    });
  }
  if (AI_FEATURES_ENABLED) {
    actions.push({
      id: "ai",
      to: "/app/ai-hub",
      icon: Sparkles,
      iconClass: "bg-brand-gold/12 text-brand-gold-muted",
      title: t("quick_ai"),
      description: t("quick_ai_desc"),
    });
  }

  return (
    <AppPanel
      density="compact"
      className={cn("min-w-0 space-y-3", className)}
      data-testid="dashboard-quick-actions"
    >
      <AppEyebrow>{t("quick_actions")}</AppEyebrow>
      <div
        className={cn(
          "grid gap-2",
          actions.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
        )}
      >
        {actions.map((a) => (
          <QuickActionTile key={a.id} action={a} />
        ))}
      </div>
    </AppPanel>
  );
}
