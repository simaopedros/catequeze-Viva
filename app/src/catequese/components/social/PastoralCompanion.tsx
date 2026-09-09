import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { SOCIAL_FEATURES_ENABLED } from "../../../shared/socialFeatures";
import { cn } from "../../../client/utils";

export type PastoralCompanionSurface =
  | "announcements"
  | "messages"
  | "calendar"
  | "library"
  | "formation"
  | "bible";

export function PastoralCompanion({
  surface,
  className,
}: {
  surface: PastoralCompanionSurface;
  className?: string;
}) {
  const { t } = useTranslation("social");

  if (!SOCIAL_FEATURES_ENABLED) return null;

  return (
    <aside
      data-testid={`pastoral-companion-${surface}`}
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-brand-gold/35 bg-[#fff8eb] px-3.5 py-3 sm:flex-row sm:items-center sm:gap-3",
        className,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff0cf] text-brand-gold-muted">
        <Sparkles className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tracking-tight text-brand-ink">
          {t(`companion.${surface}.title`)}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(`companion.${surface}.body`)}
        </p>
      </div>
      <Link
        to="/app/comunidade"
        className="shrink-0 text-xs font-bold text-brand-ink underline-offset-4 hover:underline"
      >
        {t("companion.cta")}
      </Link>
    </aside>
  );
}
