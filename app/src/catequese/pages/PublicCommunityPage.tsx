import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import { SocialCommunityBoard } from "../components/social/SocialCommunityBoard";

/**
 * Public Comunidade feed — no authentication required. Visitors read, open and
 * share posts; reacting and commenting prompt them to sign in and subscribe.
 */
export default function PublicCommunityPage() {
  const { t } = useTranslation("social");
  const navigate = useNavigate();
  const params = useParams<{ topic?: string }>();
  const { data: user } = useAuth();
  const [topicSlug, setTopicSlug] = useState<string | null>(
    params.topic ?? null,
  );

  useEffect(() => {
    setTopicSlug(params.topic ?? null);
  }, [params.topic]);

  const selectTopic = (slug: string | null) => {
    setTopicSlug(slug);
    navigate(slug ? `/comunidade/t/${slug}` : "/comunidade");
  };

  return (
    <main className="mx-auto w-full px-4 py-6 sm:py-10">
      <SocialCommunityBoard
        topicSlug={topicSlug}
        onSelectTopic={selectTopic}
        showFollowing={Boolean(user)}
        calendarTo={user ? "/app/calendar" : "/login"}
        membersTo="/comunidade"
        promoTo="/pricing"
        subtitle={t("publicSubtitle")}
      />
    </main>
  );
}
