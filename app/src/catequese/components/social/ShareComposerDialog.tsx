import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useQuery, getSocialTopics, getSocialPublishAccess, previewSocialShare } from "wasp/client/operations";
import type { SocialShareDraft, SocialShareSnapshot } from "../../../shared/socialShare";
import { SocialComposer } from "./SocialComposer";

export function ShareComposerDialog({
  draft,
  onPublished,
}: {
  draft: SocialShareDraft;
  onPublished: () => void;
}) {
  const { t } = useTranslation("social");
  const { data: topics } = useQuery(getSocialTopics);
  const { data: access, refetch } = useQuery(getSocialPublishAccess);
  const [preview, setPreview] = useState<SocialShareSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    previewSocialShare(draft)
      .then((result) => {
        if (!cancelled) setPreview(result as SocialShareSnapshot);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || t("nativeShare.previewFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [draft.kind, draft.sourceId, t]);

  if (!access?.canPublish || !access.limits) {
    return null;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!preview) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("feed.loading")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <SocialComposer
        topics={topics ?? []}
        limits={access.limits}
        quotaLeft={access.quotaLeft ?? null}
        initialShare={draft}
        onPublished={() => {
          void refetch();
          onPublished();
        }}
      />
    </div>
  );
}
