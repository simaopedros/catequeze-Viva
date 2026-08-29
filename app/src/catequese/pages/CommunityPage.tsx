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

/** Authenticated Comunidade feed: read for everyone, publish for subscribers. */
export default function CommunityPage() {
  const { t } = useTranslation("social");
  const [topicSlug, setTopicSlug] = useState<string | null>(null);
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

      <SocialTopicPills
        topics={topics ?? []}
        activeSlug={topicSlug}
        onSelect={setTopicSlug}
      />

      <SocialFeed
        topicSlug={topicSlug}
        canInteract={canInteract}
        reloadToken={reloadToken}
      />
    </div>
  );
}
