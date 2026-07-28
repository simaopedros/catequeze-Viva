import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router";
import {
  Feather,
  FilePenLine,
  ArrowLeft,
  MessageSquareText,
  Pencil,
  Puzzle,
  Smartphone,
  RefreshCw,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { InteractiveCard } from "../../../client/components/InteractiveCard";
import { AppPageHeader } from "../../../client/components/brand/AppChrome";

const RECENT_FLOWS_KEY = "cv-aihub-recent";

function loadRecentFlows(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_FLOWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentFlow(flowKey: string) {
  const flows = loadRecentFlows().filter((f) => f !== flowKey);
  flows.unshift(flowKey);
  localStorage.setItem(RECENT_FLOWS_KEY, JSON.stringify(flows.slice(0, 5)));
}

type HubStep = "menu" | "existing";

interface SubOption {
  key: string;
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
  mode: string;
  intent?: string;
}

const EXISTING_OPTIONS: SubOption[] = [
  {
    key: "improve",
    titleKey: "hub.existing_improve",
    descKey: "hub.existing_improve_desc",
    icon: Pencil,
    mode: "improve-content",
    intent: "improve",
  },
  {
    key: "activity",
    titleKey: "hub.existing_activity",
    descKey: "hub.existing_activity_desc",
    icon: Puzzle,
    mode: "generate-activity",
  },
  {
    key: "whatsapp",
    titleKey: "hub.existing_whatsapp",
    descKey: "hub.existing_whatsapp_desc",
    icon: Smartphone,
    mode: "generate-whatsapp",
  },
  {
    key: "adapt",
    titleKey: "hub.existing_adapt",
    descKey: "hub.existing_adapt_desc",
    icon: RefreshCw,
    mode: "improve-content",
    intent: "adapt",
  },
];

export function AIHubHome() {
  const { t } = useTranslation("ai");
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<HubStep>("menu");

  const handleCreateNew = () => {
    setSearchParams({ mode: "create-meeting" });
  };

  const handleCreateManual = () => {
    navigate("/app/content-library/new");
  };

  const handleExisting = () => {
    setStep("existing");
  };

  const handleSubOption = (option: SubOption) => {
    setSearchParams(
      option.intent
        ? { mode: option.mode, intent: option.intent }
        : { mode: option.mode },
    );
  };

  const handleAskAssistant = () => {
    setSearchParams({ assistant: "open" });
    window.dispatchEvent(new CustomEvent("open-ai-widget"));
  };

  const handleBack = () => {
    setStep("menu");
  };

  // ── Step 2: "Usar um conteúdo já criado" sub-options ──────────────────
  if (step === "existing") {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-8 px-1 py-4 sm:px-0">
        <AppPageHeader
          eyebrow={t("hub.eyebrow", { defaultValue: "Encontros" })}
          title={t("hub.existing_title")}
          subtitle={t("hub.existing_subtitle")}
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {EXISTING_OPTIONS.map((option) => (
            <InteractiveCard
              key={option.key}
              icon={option.icon}
              title={t(option.titleKey)}
              description={t(option.descKey)}
              onClick={() => handleSubOption(option)}
              showArrow
              flat
              className="h-full rounded-sm border-border/70 bg-white p-5 hover:bg-muted/20"
            />
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common:back")}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: main menu ──────────────────────────────────────────
  const recentFlows = loadRecentFlows();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-1 py-4 sm:px-0">
      <AppPageHeader
        eyebrow={t("hub.eyebrow", { defaultValue: "Encontros" })}
        title={t("hub.title")}
        subtitle={t("hub.subtitle")}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <InteractiveCard
          icon={FilePenLine}
          title={t("hub.create_manual", {
            defaultValue: "Criar manualmente",
          })}
          description={t("hub.create_manual_desc", {
            defaultValue:
              "Monte o encontro no editor visual, adicione referências e recursos, com apoio editorial só se precisar.",
          })}
          onClick={handleCreateManual}
          showArrow
          flat
          className="h-full rounded-sm border-border/70 bg-white p-5 hover:bg-muted/20"
        >
          <p className="mt-3 max-w-[28ch] text-sm leading-relaxed text-muted-foreground">
            {t("hub.create_manual_hint", {
              defaultValue: "Começar do zero e editar os blocos manualmente",
            })}
          </p>
        </InteractiveCard>
        <InteractiveCard
          icon={Feather}
          title={t("hub.create_new")}
          description={t("hub.create_new_desc")}
          onClick={() => {
            saveRecentFlow("create-meeting");
            handleCreateNew();
          }}
          showArrow
          flat
          className="h-full rounded-sm border-border/70 bg-white p-5 hover:bg-muted/20"
        >
          <p className="mt-3 max-w-[28ch] text-sm leading-relaxed text-muted-foreground">
            {t("hub.example_create")}
          </p>
        </InteractiveCard>
        <InteractiveCard
          icon={FilePenLine}
          title={t("hub.use_existing")}
          description={t("hub.use_existing_desc")}
          onClick={handleExisting}
          showArrow
          flat
          className="h-full rounded-sm border-border/70 bg-white p-5 hover:bg-muted/20"
        >
          <p className="mt-3 max-w-[28ch] text-sm leading-relaxed text-muted-foreground">
            {t("hub.example_existing")}
          </p>
        </InteractiveCard>
      </div>

      {recentFlows.length > 0 && (
        <div className="border-t border-border/70 pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {t("hub.recent_flows")}
          </p>
          <div className="flex flex-wrap gap-2">
            {recentFlows.map((flow) => {
              const label = t(`hub.recent_${flow}`, flow);
              const mode =
                flow === "create-meeting"
                  ? "create-meeting"
                  : "improve-content";
              return (
                <button
                  key={flow}
                  onClick={() => setSearchParams({ mode })}
                  className="rounded-sm border border-border/70 bg-white px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-brand-ink"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-border/70 pt-4 text-center">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t("hub.assistant_context")}
        </p>
        <button
          onClick={handleAskAssistant}
          className="inline-flex items-center gap-2 rounded-sm border border-dashed border-border/80 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-brand-ink/40 hover:bg-muted/20 hover:text-brand-ink"
        >
          <MessageSquareText className="h-4 w-4" />
          <span>{t("hub.ask_cta")}</span>
        </button>
      </div>
    </div>
  );
}
