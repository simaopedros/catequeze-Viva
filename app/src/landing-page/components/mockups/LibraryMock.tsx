import { BookOpen, FileText, Search, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LibraryMock({ ns = "landing" }: { ns?: string }) {
  const { t } = useTranslation(ns);
  return (
    <div className="h-full overflow-hidden p-3 sm:p-4 space-y-3 bg-background text-overline sm:text-xs">
      <div>
        <p className="font-brand-display text-sm font-semibold tracking-tight text-brand-ink">
          {t("mockup_library.title")}
        </p>
        <p className="text-muted-foreground">{t("mockup_library.subtitle")}</p>
      </div>

      <div className="flex gap-1 rounded-sm border border-border/70 bg-muted/30 p-1">
        {[
          { label: t("mockup_library.bible"), icon: BookOpen, active: true },
          {
            label: t("mockup_library.catechism"),
            icon: ScrollText,
            active: false,
          },
          {
            label: t("mockup_library.directory"),
            icon: FileText,
            active: false,
          },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`flex flex-1 items-center justify-center gap-1 rounded-sm py-1.5 text-overline font-medium ${
              tab.active ? "bg-white text-brand-ink" : "text-muted-foreground"
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <div className="rounded-sm border border-border/70 bg-white pl-7 pr-3 py-2 text-muted-foreground">
          {t("mockup_library.search_placeholder")}
        </div>
      </div>

      <div className="rounded-sm border border-border/70 bg-white p-3 space-y-2">
        <p className="font-brand-display font-semibold tracking-tight text-brand-ink">
          João 3:16
        </p>
        <p className="leading-relaxed text-muted-foreground italic">
          "Porque Deus amou tanto o mundo, que deu o seu Filho unigênito..."
        </p>
        <div className="flex flex-wrap gap-1 pt-1">
          {[
            t("mockup_library.cic_ref"),
            t("mockup_library.dir_ref"),
            t("mockup_library.plan_ref"),
          ].map((ref) => (
            <span
              key={ref}
              className="rounded-sm bg-brand-ink/8 text-brand-ink px-2 py-0.5 text-overline"
            >
              {ref}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-sm border border-border/70 bg-white p-2">
        <p className="mb-1 font-semibold tracking-tight text-brand-ink">
          {t("mockup_library.plan_title")}
        </p>
        <div className="flex items-center gap-2">
          <span className="rounded-sm border border-border/70 bg-muted/40 px-2 py-0.5 text-overline font-semibold tracking-tight text-brand-ink">
            {t("mockup_library.published")}
          </span>
          <span className="text-muted-foreground">
            {t("mockup_library.plan_detail")}
          </span>
        </div>
      </div>
    </div>
  );
}
