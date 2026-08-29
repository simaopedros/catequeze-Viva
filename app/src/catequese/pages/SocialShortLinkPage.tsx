import { Navigate, useParams } from "react-router";

/**
 * Client fallback for /c/:slug.
 *
 * In production Caddy proxies /c/* to the server, which serves Open Graph tags
 * to crawlers and redirects browsers. This route covers environments without
 * that proxy (local dev) so shared links still resolve.
 */
export default function SocialShortLinkPage() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={slug ? `/comunidade/p/${slug}` : "/comunidade"} replace />;
}
