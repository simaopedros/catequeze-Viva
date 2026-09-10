import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban, Copy, Loader2 } from "lucide-react";
import { useAuth } from "wasp/client/auth";
import {
  useQuery,
  getSocialProfile,
  getSocialPublishAccess,
  toggleSocialBlock,
} from "wasp/client/operations";
import { AppPageHeader } from "../../client/components/brand/AppChrome";
import { Button } from "../../client/components/ui/button";
import { EmptyState } from "../../client/components/EmptyState";
import { toast } from "../../client/hooks/use-toast";
import { SocialFeed } from "../components/social/SocialFeed";
import { SocialFollowButton } from "../components/social/SocialFollowButton";
import { SocialAvatar } from "../components/social/SocialAvatar";
import { invalidateSocialFollowQueries } from "../../client/hooks/socialQueryCache";
import { canSocialInteract } from "../../shared/socialFeatures";
import { communityProfilePath, profilePath } from "../../shared/socialProfile";

export default function SocialProfilePage() {
  const { t } = useTranslation("social");
  const params = useParams<{ handle: string }>();
  const location = useLocation();
  const { data: user } = useAuth();
  const inApp = location.pathname.startsWith("/app/");
  const [blocked, setBlocked] = useState(false);

  const { data, isLoading, error } = useQuery(getSocialProfile, {
    handle: params.handle || "",
  });
  const { data: access } = useQuery(getSocialPublishAccess, undefined, {
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (typeof data?.profile?.isBlocked === "boolean") {
      setBlocked(data.profile.isBlocked);
    }
  }, [data?.profile?.isBlocked]);

  useEffect(() => {
    const handle = data?.profile?.socialHandle;
    document.title = handle
      ? `@${handle} · ${t("title")}`
      : `${t("profile.title")} · Catequese Viva`;
  }, [data, t]);

  const canInteract = canSocialInteract(access);

  if (user && !inApp && params.handle) {
    return (
      <Navigate
        to={communityProfilePath(params.handle, "/app/comunidade")}
        replace
      />
    );
  }

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
    <EmptyState
      title={t("profile.notFound")}
      description={t("profile.notFoundDescription")}
    />
  ) : (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <SocialAvatar
            name={data.profile.displayName}
            url={data.profile.avatarUrl}
            size="xl"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("eyebrow")}
            </p>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight">
              {data.profile.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              @{data.profile.socialHandle}
            </p>
            {data.profile.socialBio ? (
              <p className="mt-3 max-w-xl whitespace-pre-wrap break-words text-sm leading-relaxed">
                {data.profile.socialBio}
              </p>
            ) : null}
            {data.profile.websiteUrl ? (
              <p className="mt-2 max-w-xl truncate text-sm">
                <a
                  href={data.profile.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {data.profile.websiteUrl.replace(/^https?:\/\//, "")}
                </a>
              </p>
            ) : null}
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {data.profile.followersCount}
              </span>{" "}
              {t("discovery.followers")}
              <span className="mx-2">·</span>
              <span className="font-medium text-foreground">
                {data.profile.followingCount}
              </span>{" "}
              {t("discovery.following")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.profile.socialHandle ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={async () => {
                const handle = data.profile.socialHandle;
                if (!handle) return;
                const url = `${window.location.origin}${profilePath(handle)}`;
                await navigator.clipboard.writeText(url);
                toast({ title: t("profile.linkCopied") });
              }}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {t("profile.copyLink")}
            </Button>
          ) : null}
          {user && !data.profile.isOwn && !blocked ? (
            <SocialFollowButton
              authorId={data.profile.id}
              authorName={data.profile.displayName}
              initiallyFollowing={data.isFollowing}
            />
          ) : null}
          {user && !data.profile.isOwn ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              data-testid="social-block-toggle"
              onClick={async () => {
                try {
                  const result = await toggleSocialBlock({
                    userId: data.profile.id,
                  });
                  setBlocked(result.blocked);
                  void invalidateSocialFollowQueries();
                  toast({
                    title: result.blocked
                      ? t("discovery.blockSuccess", {
                          name: data.profile.displayName,
                        })
                      : t("discovery.unblockSuccess", {
                          name: data.profile.displayName,
                        }),
                  });
                } catch (err: any) {
                  toast({
                    title: err?.message || t("discovery.block"),
                    variant: "destructive",
                  });
                }
              }}
            >
              <Ban className="h-3.5 w-3.5" aria-hidden />
              {blocked ? t("discovery.unblock") : t("discovery.block")}
            </Button>
          ) : null}
        </div>
      </header>

      {blocked ? (
        <p className="rounded-sm border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {t("profile.blockedNotice")}
        </p>
      ) : (
        <SocialFeed
          authorId={data.profile.id}
          canInteract={canInteract}
          showFollow={false}
        />
      )}
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
