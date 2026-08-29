import { Navigate } from "react-router";
import { AI_FEATURES_ENABLED } from "../../shared/aiFeatures";

export default function RedirectToContentLibraryAI() {
  return (
    <Navigate
      to={
        AI_FEATURES_ENABLED
          ? "/app/content-library?filter=ai"
          : "/app/content-library"
      }
      replace
    />
  );
}
