import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCollaborative } from "./CollaborativeContext";
import { Button } from "../../../client/components/ui/button";
import { Card } from "../../../client/components/ui/card";
import { Badge } from "../../../client/components/ui/badge";
import {
  AppEyebrow,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import { Lightbulb, Loader2, Feather, Check } from "lucide-react";
import { getPedagogicalHooks } from "wasp/client/operations";

export function PedagogicalHooksPanel() {
  const { t } = useTranslation("collaborative");
  const { contentItem, sendMessage } = useCollaborative();
  const [hooks, setHooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const theme = contentItem?.theme || "";
  let ageGroup = "Crisma: 12-15 anos";
  try {
    if (contentItem?.aiPrompt) {
      const parsed = JSON.parse(contentItem.aiPrompt);
      if (parsed.ageGroup) ageGroup = parsed.ageGroup;
    }
  } catch {}

  const handleFetch = async () => {
    setLoading(true);
    setError("");
    setHooks([]);
    try {
      const result = await getPedagogicalHooks({ theme, ageGroup });
      setHooks((result as any)?.hooks || []);
    } catch (e: any) {
      setError(e?.message || t("tools.hooks.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleUse = (hook: any) => {
    sendMessage(
      `Use este gancho pedagógico para iniciar o encontro: "${hook.title}". ` +
        `Descrição: ${hook.description}. Materiais: ${hook.materials}.`,
    );
  };

  return (
    <Card className="space-y-3 rounded-sm border-border/70 p-4">
      <div className="space-y-1.5">
        <AppEyebrow className="flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 text-[#D39A2B]" />
          {t("tools.hooks.title")}
        </AppEyebrow>
        <AppGoldRule className="w-6" />
        <p className="text-xs text-muted-foreground">
          {t("tools.hooks.description")}
        </p>
      </div>

      {hooks.length === 0 && !loading && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={handleFetch}
        >
          <Feather className="h-3.5 w-3.5 mr-1" /> {t("tools.hooks.generate")}
        </Button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
          {t("tools.hooks.generating")}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {hooks.length > 0 && (
        <div className="space-y-2">
          {hooks.map((hook, i) => (
            <Card
              key={i}
              className="space-y-1.5 rounded-sm border-border/70 p-3"
            >
              <h4
                className="text-xs font-semibold tracking-tight text-[#071A2D]"
                style={{ fontFamily: "var(--font-brand-display)" }}
              >
                {hook.title}
              </h4>
              <p className="text-xs text-muted-foreground">
                {hook.description}
              </p>
              <p className="text-overline text-muted-foreground italic">
                {t("tools.hooks.materials")}: {hook.materials || "Nenhum"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-overline w-full"
                onClick={() => handleUse(hook)}
              >
                <Check className="h-3 w-3 mr-1" /> {t("tools.hooks.use")}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}
