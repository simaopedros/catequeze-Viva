import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import { useQuery, getSocialTopics, getSocialPublishAccess } from "wasp/client/operations";
import { SocialFeed } from "../components/social/SocialFeed";
import { SocialTopicPills } from "../components/social/SocialTopicPills";
import {
  SocialAccessNotice,
  type SocialAccessReason,
} from "../components/social/SocialAccessNotice";

/**
 * Public Comunidade feed — no authentication required. Visitors read, open and
 * share posts; reacting and commenting prompt them to sign in and subscribe.
 */
export default function PublicCommunityPage() {
  const { t } = useTranslation("social");
  const navigate = useNavigate();
  const params = useParams<{ topic?: string }>();
  const { data: user } = useAuth();

  const [topicSlug, setTopicSlug] = useState<string | null>(params.topic ?? null);
  const [showNotice, setShowNotice] = useState(false);

  const { data: topics } = useQuery(getSocialTopics);
  // Only signed-in visitors have an entitlement to resolve.
  const { data: access } = useQuery(getSocialPublishAccess, undefined, {
    enabled: Boolean(user),
  });

  useEffect(() => {
    setTopicSlug(params.topic ?? null);
  }, [params.topic]);

  useEffect(() => {
    document.title = `${t("title")} · Catequese Viva`;
  }, [t]);

  const canInteract = Boolean(
    access?.authenticated && !access?.banned && access?.plan !== "catechist_free",
  );

  const selectTopic = (slug: string | null) => {
    setTopicSlug(slug);
    navigate(slug ? `/comunidade/t/${slug}` : "/comunidade");
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("publicSubtitle")}</p>
      </header>

      {showNotice && (
        <div className="mb-5">
          <SocialAccessNotice
            reason={
              (user ? access?.reason ?? "subscription" : "anonymous") as SocialAccessReason
            }
          />
        </div>
      )}

      <div className="mb-5">
        <SocialTopicPills
          topics={topics ?? []}
          activeSlug={topicSlug}
          onSelect={selectTopic}
        />
      </div>

      <SocialFeed
        topicSlug={topicSlug}
        canInteract={canInteract}
        onRequireAccess={() => setShowNotice(true)}
      />
    </main>
  );
}
