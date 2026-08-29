import { Navigate } from "react-router";
import { AI_APP_HOME } from "../../shared/aiFeatures";

/**
 * Launch-phase stand-in for AI product routes.
 * Keeps bookmarked /app/ai-hub (and sibling) URLs from rendering the old hub.
 */
export default function RedirectDisabledAiToApp() {
  return <Navigate to={AI_APP_HOME} replace />;
}
