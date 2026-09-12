import { useCallback, useMemo, useState } from "react";
import { useAuth } from "wasp/client/auth";
import { useQuery, getMySocialProfile } from "wasp/client/operations";
import { useUserContext } from "./useUserContext";
import { SOCIAL_FEATURES_ENABLED } from "../../shared/socialFeatures";
import {
  buildSocialInviteUrl,
  isSociallyLonely,
  readSocialInviteDismissedAt,
  shouldShowSocialInvitePrompt,
  writeSocialInviteDismissedAt,
} from "../../shared/socialInvitePrompt";

export function useSocialInvitePrompt() {
  const { data: user } = useAuth();
  const { needsOnboarding, isLoading: contextLoading } = useUserContext();
  const enabled =
    SOCIAL_FEATURES_ENABLED &&
    Boolean(user) &&
    !needsOnboarding &&
    !contextLoading;

  const { data: profile, isLoading: profileLoading } = useQuery(
    getMySocialProfile,
    undefined,
    { enabled },
  );

  const [dismissedAt, setDismissedAt] = useState<number | null>(() =>
    readSocialInviteDismissedAt(),
  );

  const lonely = isSociallyLonely({
    followerCount: profile?.followerCount,
    followingCount: profile?.followingCount,
  });

  const eligible =
    enabled &&
    Boolean(profile) &&
    !profileLoading &&
    !profile?.banned &&
    lonely;

  const visible = shouldShowSocialInvitePrompt({
    lonely: eligible,
    dismissedAt,
    now: Date.now(),
  });

  const inviteUrl = useMemo(
    () =>
      buildSocialInviteUrl({
        origin: typeof window !== "undefined" ? window.location.origin : "",
        handle: profile?.handle,
      }),
    [profile?.handle],
  );

  const dismiss = useCallback(() => {
    const timestamp = writeSocialInviteDismissedAt();
    setDismissedAt(timestamp);
  }, []);

  return { visible, inviteUrl, dismiss };
}
