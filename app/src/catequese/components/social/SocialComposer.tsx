import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, Loader2, Video, X } from "lucide-react";
import { useAuth } from "wasp/client/auth";
import {
  createSocialPost,
  createSocialVideoUpload,
} from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Textarea } from "../../../client/components/ui/textarea";
import { Checkbox } from "../../../client/components/ui/checkbox";
import { toast } from "../../../client/hooks/use-toast";
import { cn } from "../../../client/utils";
import {
  readVideoDuration,
  uploadSocialImage,
  uploadSocialVideo,
} from "../../../client/utils/socialMediaUpload";
import {
  MAX_SOCIAL_VIDEO_BYTES,
  MAX_POST_BODY_LENGTH,
} from "../../../shared/socialConstants";
import { SocialAvatar } from "./SocialAvatar";
import { getUserDisplayFirstName } from "../../../shared/displayName";

interface DraftMedia {
  mediaId: string;
  kind: "IMAGE" | "VIDEO";
  previewUrl: string | null;
  uploading: boolean;
  progress: number;
}

export function SocialComposer({
  topics,
  limits,
  quotaLeft,
  onPublished,
}: {
  topics: { slug: string; name: string }[];
  limits: { maxMediaPerPost: number; maxVideoSeconds: number };
  quotaLeft: number | null;
  onPublished: () => void;
}) {
  const { t } = useTranslation("social");
  const { data: user } = useAuth();
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const authorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    getUserDisplayFirstName(user) ||
    t("title");

  const [body, setBody] = useState("");
  const [media, setMedia] = useState<DraftMedia[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const uploading = media.some((item) => item.uploading);
  const canSubmit =
    !publishing &&
    !uploading &&
    (body.trim().length > 0 || media.length > 0) &&
    (media.length === 0 || consent);

  const atMediaLimit = media.length >= limits.maxMediaPerPost;

  const pickImage = async (file: File) => {
    if (atMediaLimit) {
      toast({
        title: t("composer.tooManyMedia", { count: limits.maxMediaPerPost }),
        variant: "destructive",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const placeholder: DraftMedia = {
      mediaId: `pending-${Date.now()}`,
      kind: "IMAGE",
      previewUrl,
      uploading: true,
      progress: 0,
    };
    setMedia((current) => [...current, placeholder]);

    try {
      const uploaded = await uploadSocialImage(file);
      setMedia((current) =>
        current.map((item) =>
          item.mediaId === placeholder.mediaId
            ? {
                ...item,
                mediaId: uploaded.mediaId,
                uploading: false,
                progress: 100,
              }
            : item,
        ),
      );
    } catch (error: any) {
      setMedia((current) =>
        current.filter((item) => item.mediaId !== placeholder.mediaId),
      );
      toast({
        title: error?.message || t("composer.uploadFailed"),
        variant: "destructive",
      });
    }
  };

  const pickVideo = async (file: File) => {
    if (atMediaLimit) {
      toast({
        title: t("composer.tooManyMedia", { count: limits.maxMediaPerPost }),
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_SOCIAL_VIDEO_BYTES) {
      toast({
        title: t("composer.videoTooLarge"),
        variant: "destructive",
      });
      return;
    }

    const duration = await readVideoDuration(file);
    if (duration && duration > limits.maxVideoSeconds) {
      toast({
        title: t("composer.videoTooLong", {
          minutes: Math.floor(limits.maxVideoSeconds / 60),
        }),
        variant: "destructive",
      });
      return;
    }

    let ticket: any;
    try {
      ticket = await createSocialVideoUpload({
        title: file.name,
        durationSeconds: duration ?? undefined,
      });
    } catch (error: any) {
      toast({
        title: error?.message || t("composer.uploadFailed"),
        variant: "destructive",
      });
      return;
    }

    const draft: DraftMedia = {
      mediaId: ticket.mediaId,
      kind: "VIDEO",
      previewUrl: URL.createObjectURL(file),
      uploading: true,
      progress: 0,
    };
    setMedia((current) => [...current, draft]);

    uploadSocialVideo(file, ticket, {
      onProgress: (percent) =>
        setMedia((current) =>
          current.map((item) =>
            item.mediaId === ticket.mediaId
              ? { ...item, progress: percent }
              : item,
          ),
        ),
      onSuccess: () =>
        setMedia((current) =>
          current.map((item) =>
            item.mediaId === ticket.mediaId
              ? { ...item, uploading: false, progress: 100 }
              : item,
          ),
        ),
      onError: (error) => {
        setMedia((current) =>
          current.filter((item) => item.mediaId !== ticket.mediaId),
        );
        toast({
          title: error.message || t("composer.uploadFailed"),
          variant: "destructive",
        });
      },
    });
  };

  const removeMedia = (mediaId: string) => {
    setMedia((current) => current.filter((item) => item.mediaId !== mediaId));
  };

  const toggleTopic = (slug: string) => {
    setSelectedTopics((current) => {
      if (current.includes(slug))
        return current.filter((value) => value !== slug);
      if (current.length >= 3) return current;
      return [...current, slug];
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setPublishing(true);
    try {
      const result = await createSocialPost({
        body,
        mediaIds: media.map((item) => item.mediaId),
        topicSlugs: selectedTopics,
        mediaConsentAck: consent,
      });

      toast({
        title:
          result?.status === "PUBLISHED"
            ? t("composer.published")
            : t("composer.heldForReview"),
      });

      setBody("");
      setMedia([]);
      setSelectedTopics([]);
      setConsent(false);
      onPublished();
    } catch (error: any) {
      toast({
        title: error?.message || t("composer.publish"),
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-white p-4 shadow-[0_3px_16px_rgba(18,46,76,0.07)]"
    >
      <div className="flex items-start gap-3">
        <SocialAvatar
          name={authorName}
          url={
            (user as { avatarUrl?: string | null } | null | undefined)
              ?.avatarUrl
          }
          className="bg-[#edf0f3] text-[#637286]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="social-composer-body" className="sr-only">
              {t("composer.title")}
            </label>
            {quotaLeft !== null && (
              <span className="ml-auto text-[11px] text-muted-foreground">
                {t("composer.quotaLeft", { count: quotaLeft })}
              </span>
            )}
          </div>
          <Textarea
            id="social-composer-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("composer.placeholder")}
            rows={3}
            maxLength={MAX_POST_BODY_LENGTH}
            className="min-h-[62px] resize-none rounded-[11px] border-[#dce4ec] px-3.5 py-3 focus-visible:border-[#a8bad0] focus-visible:ring-[#edf3fa]"
          />
        </div>
      </div>

      {media.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {media.map((item) => (
            <li
              key={item.mediaId}
              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              {item.previewUrl ? (
                item.kind === "VIDEO" ? (
                  <video
                    src={item.previewUrl}
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Video
                    className="h-6 w-6 text-muted-foreground"
                    aria-hidden
                  />
                </div>
              )}

              {item.uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/80 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t("composer.uploading", { percent: item.progress })}
                </div>
              )}

              <button
                type="button"
                onClick={() => removeMedia(item.mediaId)}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow"
                aria-label={t("composer.remove")}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {topics.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {topics.map((topic) => {
            const active = selectedTopics.includes(topic.slug);
            return (
              <li key={topic.slug}>
                <button
                  type="button"
                  onClick={() => toggleTopic(topic.slug)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "border-brand-ink bg-brand-ink text-white"
                      : "border-[#e1e7ee] bg-white text-[#51657e] hover:border-[#bdcad7]",
                  )}
                >
                  {topic.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {media.length > 0 && (
        <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Checkbox
            checked={consent}
            onCheckedChange={(value) => setConsent(value === true)}
            className="mt-0.5"
          />
          <span>{t("composer.consent")}</span>
        </label>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={imageInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void pickImage(file);
          }}
        />
        <input
          ref={videoInput}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void pickVideo(file);
          }}
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => imageInput.current?.click()}
          disabled={atMediaLimit}
          className="gap-2 text-[#51657e]"
        >
          <ImageIcon className="h-4 w-4" aria-hidden />
          {t("composer.addImage")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => videoInput.current?.click()}
          disabled={atMediaLimit}
          className="gap-2"
        >
          <Video className="h-4 w-4" aria-hidden />
          {t("composer.addVideo")}
        </Button>

        <Button
          type="submit"
          disabled={!canSubmit}
          className="ml-auto rounded-[9px] bg-brand-ink px-4 font-bold text-white hover:bg-brand-ink-soft"
        >
          {publishing && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          )}
          {publishing ? t("composer.publishing") : t("composer.publish")}
        </Button>
      </div>
    </form>
  );
}
