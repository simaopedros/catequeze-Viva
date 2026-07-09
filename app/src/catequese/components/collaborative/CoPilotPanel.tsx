import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCollaborative } from "./CollaborativeContext";
import { CollaborativeChat } from "./CollaborativeChat";
import { ContextShelf } from "./ContextShelf";
import { SuggestionCards } from "./SuggestionCards";
import { TheologicalDepthSlider } from "./TheologicalDepthSlider";
import { SaintStoryInjector } from "./SaintStoryInjector";
import { PedagogicalHooksPanel } from "./PedagogicalHooksPanel";
import { Button } from "../../../client/components/ui/button";
import {
  AppEyebrow,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import {
  MessageSquare,
  FileText,
  SlidersHorizontal,
  Circle,
  X,
} from "lucide-react";
import { cn } from "../../../client/utils";

type ViewMode = "briefing" | "refine";

export function CoPilotPanel() {
  const { t } = useTranslation("collaborative");
  const { t: ta } = useTranslation("ai");
  const [view, setView] = useState<ViewMode>("briefing");
  const [chatOpen, setChatOpen] = useState(false);
  const { contentItem, messages, attachments, suggestions, intent } =
    useCollaborative();

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b border-border/70 bg-white-subtle/60 px-3 py-2 shrink-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <AppEyebrow className="truncate">
              {intent
                ? ta(`hub.${intent}` as any, t("workspace.copilot"))
                : t("workspace.copilot")}
            </AppEyebrow>
            <p
              className="truncate text-sm font-semibold tracking-tight text-[#071A2D]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {contentItem?.theme || t("workspace.awaiting_theme")}
            </p>
            <AppGoldRule className="w-6" />
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-border/70 bg-white px-2 py-1 text-overline font-medium text-muted-foreground">
              <Circle className="h-2 w-2 fill-success text-success" />
              {t("workspace.ai_ready")}
            </span>
            <Button
              variant={chatOpen ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setChatOpen((c) => !c)}
              title={chatOpen ? "Fechar chat" : t("chat_toggle")}
            >
              {chatOpen ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* View tabs — hidden when chat is open */}
        {!chatOpen && (
          <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-border/70 bg-white">
            <button
              onClick={() => setView("briefing")}
              className={cn(
                "flex min-w-0 items-center justify-center gap-1.5 px-2 py-2 text-caption font-medium transition-colors",
                view === "briefing"
                  ? "bg-[#071A2D] text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate">{t("briefing")}</span>
            </button>
            <button
              onClick={() => setView("refine")}
              className={cn(
                "flex min-w-0 items-center justify-center gap-1.5 px-2 py-2 text-caption font-medium transition-colors",
                view === "refine"
                  ? "bg-[#071A2D] text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="truncate">{t("refine")}</span>
            </button>
          </div>
        )}

        {/* Stats bar */}
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-overline text-muted-foreground">
          <span className="truncate rounded bg-background px-2 py-1">
            {messages.length} {t("workspace.messages")}
          </span>
          <span className="truncate rounded bg-background px-2 py-1">
            {attachments.length} {t("workspace.sources")}
          </span>
          <span className="truncate rounded bg-background px-2 py-1">
            {suggestions.length} {t("workspace.ideas")}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {chatOpen ? (
          <CollaborativeChat />
        ) : view === "briefing" ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <ContextShelf />
            </div>
            <div className="border-t shrink-0 max-h-[40%] overflow-y-auto">
              <SuggestionCards />
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 overflow-y-auto h-full">
            <TheologicalDepthSlider />
            <SaintStoryInjector />
            <PedagogicalHooksPanel />
          </div>
        )}
      </div>
    </div>
  );
}
