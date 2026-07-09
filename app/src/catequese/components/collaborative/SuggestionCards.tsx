import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCollaborative } from "./CollaborativeContext";
import { Button } from "../../../client/components/ui/button";
import { Card } from "../../../client/components/ui/card";
import {
  Lightbulb,
  RefreshCw,
  Feather,
  Users,
  Heart,
  Home,
  Church,
  MessageCircle,
  BookOpen,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  Heart,
  Home,
  Church,
  MessageCircle,
  BookOpen,
};

export function SuggestionCards() {
  const { t } = useTranslation("collaborative");
  const { suggestions, refreshSuggestions, sendMessage } = useCollaborative();

  useEffect(() => {
    refreshSuggestions();
  }, []);

  const handleClick = async (action: string) => {
    await sendMessage(action);
  };

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Lightbulb className="h-4 w-4 text-[#D39A2B]" />
          {t("suggestions.title")}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => refreshSuggestions()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {suggestions.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          {t("suggestions.empty")}
        </p>
      )}

      {suggestions.map((suggestion) => {
        const Icon = ICON_MAP[suggestion.icon] || Feather;
        return (
          <button
            key={suggestion.id}
            onClick={() => handleClick(suggestion.action)}
            className="w-full text-left"
          >
            <Card className="p-3 hover:border-[#071A2D]/40 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#071A2D]" />
                <span className="text-xs leading-relaxed">
                  {suggestion.label}
                </span>
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
