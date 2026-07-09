import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import { ArrowRight } from "lucide-react";
import { cn } from "../../../client/utils";

interface WelcomeStepProps {
  onPersonal: () => void;
  onManager: () => void;
}

export function WelcomeStep({ onPersonal, onManager }: WelcomeStepProps) {
  const { t } = useTranslation("onboarding");
  const { data: user } = useAuth();
  const firstName = user?.firstName || "";

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("welcome.eyebrow")}
        </p>
        <h2
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          style={{ fontFamily: "var(--font-brand-display)" }}
        >
          {firstName ? t("welcome.hello", { name: firstName }) : t("welcome.hello_default")}
        </h2>
        <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("welcome.question")}
        </p>
      </div>

      <div className="divide-y divide-border/70 border-y border-border/70">
        <PathOption
          label={t("welcome.personal_title")}
          description={t("welcome.personal_desc")}
          onClick={onPersonal}
        />
        <PathOption
          label={t("welcome.manager_title")}
          description={t("welcome.manager_desc")}
          onClick={onManager}
        />
      </div>

      <p className="text-xs text-muted-foreground">{t("welcome.helper")}</p>
    </div>
  );
}

function PathOption({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-start justify-between gap-4 py-5 text-left transition-colors",
        "hover:bg-muted/30"
      )}
    >
      <span className="min-w-0 space-y-1.5">
        <span className="block text-[0.95rem] font-semibold text-foreground group-hover:text-[#071A2D]">
          {label}
        </span>
        <span className="block text-sm leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[#071A2D]" />
    </button>
  );
}
