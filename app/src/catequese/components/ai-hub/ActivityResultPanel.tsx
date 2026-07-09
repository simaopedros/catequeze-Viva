import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "../../../client/components/ui/button";
import { Card } from "../../../client/components/ui/card";
import { Badge } from "../../../client/components/ui/badge";
import {
  RotateCcw,
  Pencil,
  ArrowLeft,
  FileText,
  Clock,
  Star,
  Target,
} from "lucide-react";

interface ActivityResultPanelProps {
  activity: any;
  contentId: string;
  onRegenerate: () => void;
  onBack: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  QUIZ: "Quiz",
  OPEN_QUESTION: "Pergunta aberta",
  PARTICIPATION_CHECKLIST: "Checklist",
  GUIDED_REFLECTION: "Reflexão guiada",
  GROUP_DYNAMIC: "Dinâmica de grupo",
  FAMILY_ACTIVITY: "Atividade familiar",
  BIBLE_READING: "Leitura bíblica",
  MATCHING: "Associação",
  TASK_WITH_ATTACHMENT: "Tarefa com anexo",
};

export function ActivityResultPanel({
  activity,
  contentId,
  onRegenerate,
  onBack,
}: ActivityResultPanelProps) {
  const { t } = useTranslation("ai");
  const typeLabel = TYPE_LABELS[activity.type] || activity.type || "Atividade";
  const parsedData =
    typeof activity.data === "string"
      ? (() => {
          try {
            return JSON.parse(activity.data);
          } catch {
            return null;
          }
        })()
      : activity.data;

  return (
    <div className="flex items-center justify-center px-3 py-6">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="space-y-4 rounded-sm border-border/70 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {activity.title}
              </h2>
              <Badge
                variant="secondary"
                className="gap-1 rounded-sm border border-border/70 bg-muted/30 font-medium text-foreground"
              >
                {typeLabel}
              </Badge>
            </div>
            {activity.points > 0 && (
              <div className="flex items-center gap-1 text-sm font-medium text-[#8A6418] dark:text-[#D39A2B] shrink-0">
                <Star className="h-4 w-4 fill-current" />
                {activity.points} {t("activity.points")}
              </div>
            )}
          </div>

          {activity.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {t("activity.description")}
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {activity.description}
              </p>
            </div>
          )}

          {parsedData && (
            <div className="space-y-2">
              {parsedData.objective && (
                <div className="flex items-start gap-2 text-sm">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#071A2D]" />
                  <span className="text-muted-foreground">
                    {parsedData.objective}
                  </span>
                </div>
              )}
              {parsedData.estimatedTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {parsedData.estimatedTime}
                </div>
              )}
              {parsedData.materials && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground">
                    {t("activity.materials")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {parsedData.materials}
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("activity.back_config")}
          </Button>
          <Button variant="outline" size="sm" onClick={onRegenerate}>
            <RotateCcw className="mr-1 h-4 w-4" />
            {t("activity.regenerate")}
          </Button>
          <Button variant="default" size="sm" asChild>
            <Link to={`/app/content-library/${contentId}?tab=activities`}>
              <FileText className="mr-1 h-4 w-4" />
              {t("activity.view_content")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
