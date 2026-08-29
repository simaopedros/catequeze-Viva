import { Navigate } from "react-router";

/** Bookmarked /app/dashboard should land on the canonical dashboard. */
export default function RedirectDashboardToApp() {
  return <Navigate to="/app" replace />;
}
