import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { generateActivityForMeeting } from "../../lib/aiOperations";
import { AiHubLayout } from "./AiHubLayout";
import { ContentSourcePicker } from "./ContentSourcePicker";
import { ActivityResultPanel } from "./ActivityResultPanel";
import { Button } from "../../../client/components/ui/button";
import { Card } from "../../../client/components/ui/card";
import { Label } from "../../../client/components/ui/label";
import { Feather, Loader2, FileText } from "lucide-react";
import { toast } from "../../../client/hooks/use-toast";

const ACTIVITY_TYPES = [
  { value: "QUIZ", labelKey: "activity.type_quiz" },
  { value: "GUIDED_REFLECTION", labelKey: "activity.type_reflection" },
  { value: "GROUP_DYNAMIC", labelKey: "activity.type_dynamic" },
  { value: "FAMILY_ACTIVITY", labelKey: "activity.type_family" },
  { value: "BIBLE_READING", labelKey: "activity.type_bible" },
  { value: "OPEN_QUESTION", labelKey: "activity.type_open" },
];

export function GenerateActivityFlow() {
  const { t } = useTranslation("ai");
  const [searchParams, setSearchParams] = useSearchParams();
  const contentId = searchParams.get("contentId");
  const contentTitle = searchParams.get("contentTitle");
  const meetingId = searchParams.get("meetingId");

  const [generating, setGenerating] = useState(false);
  const [activity, setActivity] = useState<any>(null);
  const [error, setError] = useState("");
  const [activityType, setActivityType] = useState("QUIZ");
  const [step, setStep] = useState<"pick_content" | "configure" | "result">(
    contentId ? "configure" : "pick_content",
  );

  const handleContentSelected = (
    cid: string,
    ctitle: string,
    ctheme?: string,
  ) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("contentId", cid);
      next.set("contentTitle", ctitle);
      if (ctheme) next.set("contentTheme", ctheme);
      return next;
    });
    setStep("configure");
  };

  const handleGenerate = async () => {
    if (!contentId) {
      setError(t("activity.no_content"));
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const result: any = await generateActivityForMeeting({
        contentId,
        activityType,
        meetingId: meetingId || undefined,
      });
      setActivity(result.activity || result);
      setStep("result");
    } catch (e: any) {
      const msg = e?.message || t("activity.error");
      setError(msg);
      toast({
        title: t("activity.error_title"),
        description: msg,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (step === "pick_content") {
    return (
      <AiHubLayout title={t("hub.existing_activity")}>
        <ContentSourcePicker
          mode="generate-activity"
          onSelect={handleContentSelected}
        />
      </AiHubLayout>
    );
  }

  if (step === "result" && activity) {
    return (
      <AiHubLayout title={t("hub.existing_activity")}>
        <ActivityResultPanel
          activity={activity}
          contentId={contentId || ""}
          onRegenerate={handleGenerate}
          onBack={() => setStep("configure")}
        />
      </AiHubLayout>
    );
  }

  return (
    <AiHubLayout
      title={t("hub.existing_activity")}
      subtitle={t("activity.config_subtitle")}
    >
      <div className="flex items-center justify-center px-3 py-6">
        <div className="w-full max-w-2xl space-y-6">
          {contentTitle && (
            <Card className="rounded-sm border-border/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-brand-ink">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("activity.source_content")}
                  </p>
                  <h3 className="truncate text-sm font-semibold tracking-tight text-brand-ink">
                    {decodeURIComponent(contentTitle)}
                  </h3>
                  <div className="h-px w-6 bg-brand-gold" aria-hidden />
                </div>
              </div>
            </Card>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-sm px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("activity.type_label")}
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map((at) => (
                <button
                  key={at.value}
                  onClick={() => setActivityType(at.value)}
                  className={`rounded-sm border px-3 py-2.5 text-sm font-medium transition-colors ${
                    activityType === at.value
                      ? "border-brand-ink bg-muted/30 font-semibold tracking-tight text-brand-ink"
                      : "border-border/70 hover:border-brand-ink/30"
                  }`}
                >
                  {t(at.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !contentId}
            className="w-full gap-2"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />{" "}
                {t("activity.generating")}
              </>
            ) : (
              <>
                <Feather className="h-5 w-5" /> {t("activity.generate")}
              </>
            )}
          </Button>
        </div>
      </div>
    </AiHubLayout>
  );
}
