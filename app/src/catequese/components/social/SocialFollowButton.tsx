import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toggleSocialFollow } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { toast } from "../../../client/hooks/use-toast";

export function SocialFollowButton({
  authorId,
  authorName,
  initiallyFollowing,
}: {
  authorId: string;
  authorName: string;
  initiallyFollowing: boolean;
}) {
  const { t } = useTranslation("social");
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      const result = await toggleSocialFollow({ authorId });
      setFollowing(result.following);
      toast({
        title: result.following
          ? t("discovery.followSuccess", { name: authorName })
          : t("discovery.unfollowSuccess", { name: authorName }),
      });
    } catch (error: any) {
      toast({ title: error?.message || t("discovery.follow"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={following ? "outline" : "secondary"}
      size="sm"
      onClick={toggle}
      disabled={busy}
    >
      {following ? t("discovery.following") : t("discovery.follow")}
    </Button>
  );
}
