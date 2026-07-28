import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  CollaborativeProvider,
  useCollaborative,
} from "../collaborative/CollaborativeContext";
import { CoPilotPanel } from "../collaborative/CoPilotPanel";
import { MeetingEditor } from "../collaborative/MeetingEditor";
import { QuickSetupPanel } from "../collaborative/QuickSetupPanel";
import { AiHubLayout } from "./AiHubLayout";
import { Button } from "../../../client/components/ui/button";
import { Circle, UsersRound, RotateCcw, Pencil } from "lucide-react";
import { useNavigate } from "react-router";

function CreateMeetingWorkspace() {
  const { t } = useTranslation("ai");
  const { t: tc } = useTranslation("collaborative");
  const { setupComplete, creditsLeft, contentItemId } = useCollaborative();
  const navigate = useNavigate();

  if (!setupComplete) {
    return <QuickSetupPanel mode="create-meeting" />;
  }

  const handleStartOver = () => {
    navigate("/app/ai-hub?mode=create-meeting");
  };

  return (
    <AiHubLayout
      title={t("hub.create_meeting")}
      subtitle={tc("workspace.subtitle")}
      creditsLeft={creditsLeft}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 border-b border-border/70 bg-white px-3 py-2 shrink-0 lg:px-4">
          <div className="inline-flex items-center gap-2 rounded-sm border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-semibold tracking-tight text-brand-ink">
            <Circle className="h-2 w-2 fill-current text-brand-gold" />
            {tc("workspace.live_status")}
          </div>
          <div className="inline-flex items-center gap-2 rounded-sm border border-border/70 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            <UsersRound className="h-3.5 w-3.5" />
            {tc("workspace.presence")}
          </div>
        </div>
        <div className="flex-1 flex min-h-0 flex-col overflow-hidden lg:flex-row">
          <div className="min-h-[42vh] shrink-0 overflow-hidden border-b lg:min-h-0 lg:w-[360px] xl:w-[400px] lg:border-b-0 lg:border-r">
            <CoPilotPanel />
          </div>
          <div className="min-h-[58vh] flex-1 overflow-hidden flex flex-col min-w-0 lg:min-h-0">
            <MeetingEditor />
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-border/70 bg-white px-3 py-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleStartOver}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            {t("planner.generate_new")}
          </Button>
          {contentItemId && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/app/content-library/${contentItemId}/edit`}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                {t("planner.edit_publish")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </AiHubLayout>
  );
}

export function CreateMeetingFlow() {
  return (
    <CollaborativeProvider>
      <CreateMeetingWorkspace />
    </CollaborativeProvider>
  );
}
