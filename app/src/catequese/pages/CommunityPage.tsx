import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { SocialCommunityBoard } from "../components/social/SocialCommunityBoard";
import { useUserContext } from "../../client/hooks/useUserContext";
import { communityTopicPath } from "../../shared/socialProfile";

/** Authenticated Comunidade feed: read for everyone, publish for subscribers. */
export default function CommunityPage() {
  const { t } = useTranslation("social");
  const { userRole, isAdmin } = useUserContext();
  const navigate = useNavigate();
  const params = useParams<{ topic?: string }>();
  const [topicSlug, setTopicSlug] = useState<string | null>(
    params.topic ?? null,
  );

  useEffect(() => {
    setTopicSlug(params.topic ?? null);
  }, [params.topic]);

  const selectTopic = (slug: string | null) => {
    setTopicSlug(slug);
    navigate(communityTopicPath(slug, "/app/comunidade"));
  };

  return (
    <SocialCommunityBoard
      topicSlug={topicSlug}
      onSelectTopic={selectTopic}
      showFollowing
      alwaysShowAccessNotice
      calendarTo="/app/calendar"
      membersTo="/app/comunidade"
      promoTo="/pricing"
      subtitle={t("subtitle")}
      viewerRole={userRole}
      viewerIsAdmin={isAdmin}
    />
  );
}
