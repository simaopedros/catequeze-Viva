import { Navigate, useParams } from "react-router";
import { useAuth } from "wasp/client/auth";
import { communityFeedPath, communityPostPath } from "../../shared/socialProfile";

/**
 * Client fallback for /c/:slug.
 *
 * In production Caddy proxies /c/* to the server, which serves Open Graph tags
 * to crawlers and redirects browsers. This route covers environments without
 * that proxy (local dev) so shared links still resolve.
 *
 * Logged-in visitors stay in the app shell; anonymous visitors land on the
 * public post page.
 */
export default function SocialShortLinkPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: user, isLoading } = useAuth();

  if (!slug) {
    return <Navigate to={communityFeedPath(user ? "/app" : "/comunidade")} replace />;
  }
  if (isLoading) return null;

  return (
    <Navigate
      to={communityPostPath(slug, user ? "/app/comunidade" : "/comunidade")}
      replace
    />
  );
}
