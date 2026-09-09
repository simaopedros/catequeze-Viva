import { useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Ban, Copy, Globe, Loader2 } from "lucide-react";
import { useAuth } from "wasp/client/auth";
import {
  useQuery,
  getSocialProfile,
  getSocialPublishAccess,
  toggleSocialBlock,
} from "wasp/client/operations";
import { Button } from "../../client/components/ui/button";
import { EmptyState } from "../../client/components/EmptyState";
import { toast } from "../../client/hooks/use-toast";
import { SocialFeed } from "../components/social/SocialFeed";
import { SocialFollowButton } from "../components/social/SocialFollowButton";
import { ScrollFade } from "../../client/components/ui/scroll-fade";
import { profilePath } from "../../shared/socialProfile";

export default function PublicSocialProfilePage() {
  const { t } = useTranslation("social");
  const params = useParams<{ handle: string }>();
  const { data: viewer } = useAuth();
  const [blocked, setBlocked] = useState(false);

  const { data: profile, isLoading, error } = useQuery(getSocialProfile, {
    handle: params.handle || "",
  });
  const { data: access } = useQuery(getSocialPublishAccess, undefined, {
    enabled: Boolean(viewer),
  });

  const canInteract = Boolean(
    access?.authenticated && !access?.banned && access?.plan !== "catechist_free",
  );

  const copyLink = async () => {
    if (!profile?.handle) return;
    const url = `${window.location.origin}${profilePath(profile.handle)}`;
    await navigator.clipboard.writeText(url);
    toast({ title: t("profile.linkCopied") });
  };

  const toggleBlock = async () => {
    if (!profile) return;
    try {
      const result = await toggleSocialBlock({ userId: profile.id });
      setBlocked(result.blocked);
      toast({
        title: result.blocked
          ? t("discovery.blockSuccess", { name: profile.displayName })
          : t("discovery.unblockSuccess", { name: profile.displayName }),
      });
    } catch (err: any) {
      toast({ title: err?.message || t("discovery.block"), variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("feed.loading")}
        </p>
      </main>
    );
  }

  if (error || !profile || blocked) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <EmptyState
          title={t("profile.notFound")}
          description={t("profile.notFoundDescription")}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:py-12">
      <header className="flex items-start gap-4">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary"
          >
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {profile.displayName}
          </h1>
          {profile.handle && (
            <p className="text-sm text-muted-foreground">@{profile.handle}</p>
          )}
          {profile.bio && (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
              {profile.bio}
            </p>
          )}
          {profile.websiteUrl && (
            <a
              href={profile.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
            >
              <Globe className="h-3.5 w-3.5" aria-hidden />
              {profile.websiteUrl.replace(/^https?:\/\//, "")}
            </a>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {t("profile.stats", {
              posts: profile.postCount,
              followers: profile.followerCount,
              following: profile.followingCount,
            })}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {profile.handle && (
          <Button variant="outline" size="sm" onClick={copyLink} className="gap-1">
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {t("profile.copyLink")}
          </Button>
        )}
        {profile.isOwn ? (
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/settings">{t("profile.edit")}</Link>
          </Button>
        ) : (
          <>
            {viewer && (
              <SocialFollowButton
                authorId={profile.id}
                authorName={profile.displayName}
                initiallyFollowing={profile.isFollowing}
              />
            )}
            {viewer && (
              <Button variant="ghost" size="sm" onClick={toggleBlock} className="gap-1">
                <Ban className="h-3.5 w-3.5" aria-hidden />
                {t("discovery.block")}
              </Button>
            )}
          </>
        )}
      </div>

      <ScrollFade maxHeight="min(70vh, 40rem)" className="pr-1">
        <SocialFeed
          authorId={profile.id}
          canInteract={canInteract}
          showFollow={false}
          emptyTitle={t("profile.emptyPosts")}
          emptyDescription={t("profile.emptyPostsDescription")}
        />
      </ScrollFade>
    </main>
  );
}
