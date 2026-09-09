import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import {
  useQuery,
  getSocialTopics,
  getSocialPublishAccess,
} from "wasp/client/operations";
import { SocialComposer } from "./SocialComposer";
import { SocialFeed } from "./SocialFeed";
import { SocialTopicPills } from "./SocialTopicPills";
import {
  SocialAccessNotice,
  type SocialAccessReason,
} from "./SocialAccessNotice";
import { SocialFeedTabs, type SocialFeedMode } from "./SocialFeedTabs";
import { RhemaShortsFeed } from "./RhemaShortsFeed";
import { SocialHero } from "./SocialHero";
import { SocialRail } from "./SocialRail";

export function SocialCommunityBoard({
  topicSlug,
  onSelectTopic,
  showFollowing,
  alwaysShowAccessNotice = false,
  calendarTo = "/app/calendar",
  membersTo = "/comunidade",
  promoTo = "/pricing",
  subtitle,
}: {
  topicSlug: string | null;
  onSelectTopic: (slug: string | null) => void;
  showFollowing: boolean;
  alwaysShowAccessNotice?: boolean;
  calendarTo?: string;
  membersTo?: string;
  promoTo?: string;
  subtitle?: string;
}) {
  const { t } = useTranslation("social");
  const { data: user } = useAuth();
  const [mode, setMode] = useState<SocialFeedMode>("foryou");
  const [reloadToken, setReloadToken] = useState(0);
  const [showNotice, setShowNotice] = useState(false);

  const { data: topics } = useQuery(getSocialTopics);
  const { data: access, refetch: refetchAccess } = useQuery(
    getSocialPublishAccess,
    undefined,
    { enabled: Boolean(user) || alwaysShowAccessNotice },
  );

  const canPublish = Boolean(access?.canPublish);
  const canInteract = Boolean(
    access?.authenticated &&
      !access?.banned &&
      access?.plan !== "catechist_free",
  );

  const noticeReason = ((): SocialAccessReason => {
    if (canPublish) return null;
    if (user) return (access?.reason ?? null) as SocialAccessReason;
    if (showNotice) return "anonymous";
    if (alwaysShowAccessNotice && access) {
      return (access.reason ?? "anonymous") as SocialAccessReason;
    }
    return null;
  })();

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-3.5">
      <SocialHero subtitle={subtitle} />

      <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_270px]">
        <div className="min-w-0 space-y-3.5">
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
          ) : noticeReason ? (
            <SocialAccessNotice reason={noticeReason} />
          ) : null}

          <SocialFeedTabs
            mode={mode}
            onChange={setMode}
            showFollowing={showFollowing}
          />

          {mode !== "shorts" ? (
            <SocialTopicPills
              topics={topics ?? []}
              activeSlug={topicSlug}
              onSelect={onSelectTopic}
            />
          ) : null}

          {mode === "shorts" ? (
            <RhemaShortsFeed
              topicSlug={topicSlug}
              canInteract={canInteract}
              onRequireAccess={() => setShowNotice(true)}
              reloadToken={reloadToken}
              showFollow={Boolean(user)}
            />
          ) : (
            <SocialFeed
              topicSlug={topicSlug}
              canInteract={canInteract}
              onRequireAccess={() => setShowNotice(true)}
              reloadToken={reloadToken}
              sort={
                mode === "trending"
                  ? "trending"
                  : mode === "foryou"
                    ? "foryou"
                    : "recent"
              }
              following={mode === "following"}
              showFollow={Boolean(user)}
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

        <SocialRail
          onSelectTopic={(slug) => onSelectTopic(slug)}
          calendarTo={calendarTo}
          membersTo={membersTo}
          promoTo={promoTo}
          signedIn={Boolean(user)}
        />
      </div>
    </div>
  );
}
