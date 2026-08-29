import { Navigate } from "react-router";
import { AI_APP_HOME, AI_FEATURES_ENABLED } from "../../shared/aiFeatures";

export default function RedirectToAiHub() {
  return (
    <Navigate
      to={AI_FEATURES_ENABLED ? "/app/ai-hub" : AI_APP_HOME}
      replace
    />
  );
}
