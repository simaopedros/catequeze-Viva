import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "wasp/client/auth";
import { useQuery, getSocialProfile, getSocialPublishAccess } from "wasp/client/operations";
import { AppPageHeader } from "../../client/components/brand/AppChrome";
import { Button } from "../../client/components/ui/button";
import { EmptyState } from "../../client/components/EmptyState";
import { SocialFeed } from "../components/social/SocialFeed";
import { SocialFollowButton } from "../components/social/SocialFollowButton";

export default function SocialProfilePage() {
  const { t } = useTranslation("social");
  const params = useParams<{ handle: string }>();
  const location = useLocation();
  const { data: user } = useAuth();
  const inApp = location.pathname.startsWith("/app/");

  const { data, isLoading, error } = useQuery(getSocialProfile, {
    handle: params.handle || "",
  });
  const { data: access } = useQuery(getSocialPublishAccess, undefined, {
    enabled: Boolean(user),
  });

  useEffect(() => {
    const handle = data?.profile?.socialHandle;
    document.title = handle
      ? `@${handle} · ${t("title")}`
      : `${t("profile.title")} · Catequese Viva`;
  }, [data, t]);

  const canInteract = Boolean(
    access?.authenticated && !access?.banned && access?.plan !== "catechist_free",
  );

  const header = (
    <Button asChild variant="ghost" size="sm" className="mb-4 gap-2">
      <Link to={inApp ? "/app/comunidade" : "/comunidade"}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("post.backToFeed")}
      </Link>
    </Button>
  );

  const body = isLoading ? (
    <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {t("feed.loading")}
    </p>
  ) : error || !data?.profile ? (
    <EmptyState title={t("profile.notFound")} description={t("profile.notFoundDescription")} />
  ) : (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {data.profile.displayName}
          </h1>
          <p className="text-sm text-muted-foreground">@{data.profile.socialHandle}</p>
          {data.profile.socialBio ? (
            <p className="mt-3 max-w-xl text-sm leading-relaxed">{data.profile.socialBio}</p>
          ) : null}
          {data.profile.websiteUrl ? (
            <p className="mt-2 text-sm">
              <a
                href={data.profile.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {data.profile.websiteUrl}
              </a>
            </p>
          ) : null}
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{data.profile.followersCount}</span>{" "}
            {t("discovery.followers")}
            <span className="mx-2">·</span>
            <span className="font-medium text-foreground">{data.profile.followingCount}</span>{" "}
            {t("discovery.following")}
          </p>
        </div>
        {user && !data.profile.isOwn ? (
          <SocialFollowButton
            authorId={data.profile.id}
            authorName={data.profile.displayName}
            initiallyFollowing={data.isFollowing}
          />
        ) : null}
      </header>

      <SocialFeed
        authorId={data.profile.id}
        canInteract={canInteract}
        showFollow={false}
      />
    </div>
  );

  if (inApp) {
    return (
      <div className="space-y-4">
        <AppPageHeader
          eyebrow={t("eyebrow")}
          title={data?.profile?.displayName || t("profile.title")}
          documentTitle={t("profile.title")}
        />
        {header}
        {body}
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      {header}
      {body}
    </main>
  );
}
