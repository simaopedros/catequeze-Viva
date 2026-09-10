import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "../../../client/utils";

export interface SocialMediaItem {
  id: string;
  kind: "IMAGE" | "VIDEO";
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  imageUrl?: string | null;
  videoUrl?: string | null;
  embedUrl?: string | null;
  thumbnailUrl?: string | null;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export function isPlayableSocialVideo(media: SocialMediaItem): boolean {
  return media.kind === "VIDEO" && Boolean(media.embedUrl || media.videoUrl);
}

function MediaFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden rounded-xl border border-border bg-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}

function VideoItem({ media }: { media: SocialMediaItem }) {
  const { t } = useTranslation("social");

  if (media.status === "FAILED") {
    return (
      <MediaFrame className="flex aspect-video items-center justify-center">
        <p className="flex items-center gap-2 px-4 text-center text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {t("feed.videoFailed")}
        </p>
      </MediaFrame>
    );
  }

  if (media.status !== "READY" || (!media.embedUrl && !media.videoUrl)) {
    return (
      <MediaFrame className="flex aspect-video items-center justify-center">
        <p className="flex items-center gap-2 px-4 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("feed.processingVideo")}
        </p>
      </MediaFrame>
    );
  }

  if (media.videoUrl && !media.embedUrl) {
    return (
      <MediaFrame className="aspect-video">
        <video
          src={media.videoUrl}
          controls
          playsInline
          preload="metadata"
          poster={media.thumbnailUrl || undefined}
          className="absolute inset-0 h-full w-full bg-black object-contain"
        />
      </MediaFrame>
    );
  }

  return (
    <MediaFrame className="aspect-video">
      <iframe
        src={media.embedUrl ?? undefined}
        title={media.altText || t("title")}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </MediaFrame>
  );
}

export function SocialMediaGallery({ media }: { media: SocialMediaItem[] }) {
  if (media.length === 0) return null;

  const videos = media.filter((item) => item.kind === "VIDEO");
  const images = media.filter((item) => item.kind === "IMAGE");

  return (
    <div className="mt-3 space-y-2">
      {videos.map((item) => (
        <VideoItem key={item.id} media={item} />
      ))}

      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-2",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {images.map((item) => (
            <MediaFrame
              key={item.id}
              className={cn(
                images.length === 1 ? "max-h-[32rem]" : "aspect-square",
              )}
            >
              <img
                src={item.imageUrl || ""}
                alt={item.altText || ""}
                loading="lazy"
                className={cn(
                  "h-full w-full",
                  images.length === 1 ? "object-contain" : "object-cover",
                )}
              />
            </MediaFrame>
          ))}
        </div>
      )}
    </div>
  );
}
