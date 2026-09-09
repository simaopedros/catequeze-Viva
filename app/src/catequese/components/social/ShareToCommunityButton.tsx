import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import { SOCIAL_FEATURES_ENABLED } from "../../../shared/socialFeatures";
import { buildCommunitySharePath } from "../../../shared/socialShare";

export function ShareToCommunityButton({
  body,
  topic,
  source,
  variant = "outline",
  size = "sm",
  className,
}: {
  body: string;
  topic?: string;
  source?: string;
  variant?: "outline" | "ghost" | "default" | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
}) {
  const { t } = useTranslation("social");

  if (!SOCIAL_FEATURES_ENABLED || !body.trim()) return null;

  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={className}
      data-testid="share-to-community"
    >
      <Link to={buildCommunitySharePath({ body, topic, source })}>
        <Sparkles className="h-4 w-4" aria-hidden />
        {t("share.toCommunity")}
      </Link>
    </Button>
  );
}
