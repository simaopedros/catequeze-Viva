import { cn } from "../../../client/utils";
import { socialAuthorInitials } from "./socialAppearance";

export function SocialAvatar({
  name,
  url,
  size = "md",
  className,
}: {
  name: string;
  url?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dimension =
    size === "sm"
      ? "h-8 w-8 text-[10px]"
      : size === "lg"
        ? "h-11 w-11 text-sm"
        : size === "xl"
          ? "h-16 w-16 text-lg"
          : "h-10 w-10 text-xs";

  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        className={cn(
          "shrink-0 rounded-full object-cover",
          dimension,
          className,
        )}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-brand-ink font-bold text-white",
        dimension,
        className,
      )}
    >
      {socialAuthorInitials(name)}
    </div>
  );
}
