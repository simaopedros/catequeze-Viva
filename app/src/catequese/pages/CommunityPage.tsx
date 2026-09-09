import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  useQuery,
  getSocialTopics,
  getSocialPublishAccess,
  previewSocialShare,
} from "wasp/client/operations";
import { AppPageHeader } from "../../client/components/brand/AppChrome";
import { SocialComposer } from "../components/social/SocialComposer";
import { SocialFeed } from "../components/social/SocialFeed";
import { SocialTopicPills } from "../components/social/SocialTopicPills";
import {
  SocialAccessNotice,
  type SocialAccessReason,
} from "../components/social/SocialAccessNotice";
import {
  SocialFeedTabs,
  type SocialFeedMode,
} from "../components/social/SocialFeedTabs";
import { SocialShareEmbed } from "../components/social/SocialShareEmbed";
import { isSocialShareKind, type SocialShareDraft } from "../../shared/socialShare";

/** Authenticated Comunidade feed: read for everyone, publish for subscribers. */
export default function CommunityPage() {
  const { t } = useTranslation("social");
  const [searchParams, setSearchParams] = useSearchParams();
  const [topicSlug, setTopicSlug] = useState<string | null>(null);
  const [mode, setMode] = useState<SocialFeedMode>("recent");
  const [reloadToken, setReloadToken] = useState(0);

  const { data: topics } = useQuery(getSocialTopics);
  const { data: access, refetch: refetchAccess } = useQuery(getSocialPublishAccess);

  const incomingShare = useMemo<SocialShareDraft | null>(() => {
    const kind = searchParams.get("share");
    const sourceId = searchParams.get("sourceId");
    if (!kind || !sourceId || !isSocialShareKind(kind)) return null;
    return { kind, sourceId };
  }, [searchParams]);

  const { data: sharePreview } = useQuery(
    previewSocialShare,
    incomingShare ?? { kind: "VERSE", sourceId: "" },
    { enabled: Boolean(incomingShare) },
  );

  const canPublish = Boolean(access?.canPublish);
  const canInteract = Boolean(
    access?.authenticated && !access?.banned && access?.plan !== "catechist_free",
  );

  const clearIncomingShare = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("share");
    next.delete("sourceId");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-5">
      <AppPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        documentTitle={t("title")}
      />

      {canPublish && access?.limits ? (
        <div className="space-y-3">
          {sharePreview && incomingShare && (
            <SocialShareEmbed share={sharePreview as any} compact />
          )}
          <SocialComposer
            topics={topics ?? []}
            limits={access.limits}
            quotaLeft={access.quotaLeft ?? null}
            initialShare={incomingShare}
            onPublished={() => {
              setReloadToken((value) => value + 1);
              void refetchAccess();
              clearIncomingShare();
            }}
          />
        </div>
      ) : (
        <SocialAccessNotice reason={(access?.reason ?? null) as SocialAccessReason} />
      )}

      <div className="space-y-3">
        <SocialFeedTabs mode={mode} onChange={setMode} showFollowing />
        <SocialTopicPills
          topics={topics ?? []}
          activeSlug={topicSlug}
          onSelect={setTopicSlug}
        />
      </div>

      <SocialFeed
        topicSlug={topicSlug}
        canInteract={canInteract}
        reloadToken={reloadToken}
        sort={mode === "trending" ? "trending" : "recent"}
        following={mode === "following"}
        showFollow
        emptyTitle={mode === "following" ? t("discovery.emptyFollowing") : undefined}
        emptyDescription={
          mode === "following" ? t("discovery.emptyFollowingDescription") : undefined
        }
      />
    </div>
  );
}
