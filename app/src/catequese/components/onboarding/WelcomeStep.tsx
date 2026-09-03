import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import { ArrowRight } from "lucide-react";
import { cn } from "../../../client/utils";
import {
  AppEyebrow,
  AppDisplayTitle,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";

interface WelcomeStepProps {
  onPersonal: () => void;
  onManager: () => void;
  onDiocese?: () => void;
  launchCatequistaOnly?: boolean;
}

export function WelcomeStep({
  onPersonal,
  onManager,
  onDiocese,
  launchCatequistaOnly = false,
}: WelcomeStepProps) {
  const { t } = useTranslation("onboarding");
  const { data: user } = useAuth();
  const firstName = user?.firstName || "";
  const showInstitutional = !launchCatequistaOnly;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AppEyebrow>{t("welcome.eyebrow")}</AppEyebrow>
        <AppDisplayTitle as="h2">
          {firstName
            ? t("welcome.hello", { name: firstName })
            : t("welcome.hello_default")}
        </AppDisplayTitle>
        <AppGoldRule />
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {showInstitutional
            ? t("welcome.question")
            : t("welcome.launch_question")}
        </p>
      </div>

      <div className="divide-y divide-border/70 border-y border-border/70">
        <PathOption
          label={t("welcome.personal_title")}
          description={t("welcome.personal_desc")}
          onClick={onPersonal}
        />
        {showInstitutional && (
          <PathOption
            label={t("welcome.manager_title")}
            description={t("welcome.manager_desc")}
            onClick={onManager}
          />
        )}
        {showInstitutional && onDiocese && (
          <PathOption
            label={t("welcome.diocese_title")}
            description={t("welcome.diocese_desc")}
            onClick={onDiocese}
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {showInstitutional
          ? t("welcome.helper")
          : t("welcome.launch_helper")}
      </p>
      {showInstitutional && (
        <p className="text-xs text-muted-foreground">
          {t("welcome.invite_hint")}
        </p>
      )}
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
        "hover:bg-muted/30",
      )}
    >
      <span className="min-w-0 space-y-1.5">
        <span className="block text-body font-semibold tracking-tight text-brand-ink group-hover:text-brand-ink-soft">
          {label}
        </span>
        <span className="block text-sm leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-ink" />
    </button>
  );
}
