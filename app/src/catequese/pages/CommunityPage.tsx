import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SocialCommunityBoard } from "../components/social/SocialCommunityBoard";

/** Authenticated Comunidade feed: read for everyone, publish for subscribers. */
export default function CommunityPage() {
  const { t } = useTranslation("social");
  const [topicSlug, setTopicSlug] = useState<string | null>(null);

  return (
    <SocialCommunityBoard
      topicSlug={topicSlug}
      onSelectTopic={setTopicSlug}
      showFollowing
      alwaysShowAccessNotice
      calendarTo="/app/calendar"
      membersTo="/app/comunidade"
      promoTo="/pricing"
      subtitle={t("subtitle")}
    />
  );
}
