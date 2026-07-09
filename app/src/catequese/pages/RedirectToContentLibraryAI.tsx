import { Navigate } from "react-router";

export default function RedirectToContentLibraryAI() {
  return <Navigate to="/app/content-library?filter=ai" replace />;
}
