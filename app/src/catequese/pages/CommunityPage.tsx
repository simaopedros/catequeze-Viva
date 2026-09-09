import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, getSocialTopics, getSocialPublishAccess } from "wasp/client/operations";
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
import { SocialSearch } from "../components/social/SocialSearch";
import { RhemaShortsFeed } from "../components/social/RhemaShortsFeed";

/** Authenticated Comunidade feed: read for everyone, publish for subscribers. */
export default function CommunityPage() {
  const { t } = useTranslation("social");
  const [topicSlug, setTopicSlug] = useState<string | null>(null);
  const [mode, setMode] = useState<SocialFeedMode>("foryou");
  const [reloadToken, setReloadToken] = useState(0);

  const { data: topics } = useQuery(getSocialTopics);
  const { data: access, refetch: refetchAccess } = useQuery(getSocialPublishAccess);

  const canPublish = Boolean(access?.canPublish);
  const canInteract = Boolean(access?.authenticated && !access?.banned && access?.plan !== "catechist_free");

  return (
    <div className="space-y-5">
      <AppPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        documentTitle={t("title")}
      />

      {canPublish && access?.limits ? (
        <SocialComposer
          topics={topics ?? []}
          limits={access.limits}
          quotaLeft={access.quotaLeft ?? null}
          onPublished={() => {
            setReloadToken((value) => value + 1);
            void refetchAccess();
          }}
        />
      ) : (
        <SocialAccessNotice reason={(access?.reason ?? null) as SocialAccessReason} />
      )}

      <SocialSearch />

      <div className="space-y-3">
        <SocialFeedTabs mode={mode} onChange={setMode} showFollowing />
        {mode !== "shorts" ? (
          <SocialTopicPills
            topics={topics ?? []}
            activeSlug={topicSlug}
            onSelect={setTopicSlug}
          />
        ) : null}
      </div>

      {mode === "shorts" ? (
        <RhemaShortsFeed
          topicSlug={topicSlug}
          canInteract={canInteract}
          reloadToken={reloadToken}
          showFollow
        />
      ) : (
        <SocialFeed
          topicSlug={topicSlug}
          canInteract={canInteract}
          reloadToken={reloadToken}
          sort={mode === "trending" ? "trending" : mode === "foryou" ? "foryou" : "recent"}
          following={mode === "following"}
          showFollow
          emptyTitle={
            mode === "following"
              ? t("discovery.emptyFollowing")
              : mode === "foryou"
                ? t("discovery.emptyForyou")
                : undefined
          }
          emptyDescription={
            mode === "following"
              ? t("discovery.emptyFollowingDescription")
              : mode === "foryou"
                ? t("discovery.emptyForyouDescription")
                : undefined
          }
        />
      )}
    </div>
  );
}
