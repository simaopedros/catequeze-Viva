import { Navigate, useLocation } from "react-router";
import {
  SOCIAL_DISABLED_APP_REDIRECT,
  SOCIAL_DISABLED_REDIRECT,
  isSocialAppPath,
} from "../../shared/socialFeatures";

/**
 * Stand-in for every Comunidade route while the module is parked.
 * Keeps bookmarked and previously shared URLs from rendering the feed.
 */
export default function RedirectDisabledSocial() {
  const location = useLocation();
  const target = isSocialAppPath(location.pathname)
    ? SOCIAL_DISABLED_APP_REDIRECT
    : SOCIAL_DISABLED_REDIRECT;

  return <Navigate to={target} replace />;
}
