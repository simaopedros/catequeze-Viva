import { useEffect } from "react";
import { useAuth } from "wasp/client/auth";
import { signOut } from "../client/auth/signOut";
import { ImpersonationBanner } from "../admin/ImpersonationBanner";
import { isImpersonating } from "../admin/impersonation";

export function PlatformSessionGuards() {
  const { data: user } = useAuth();

  useEffect(() => {
    const suspendedAt = (user as { suspendedAt?: string | Date | null } | null)
      ?.suspendedAt;
    if (!user || !suspendedAt) return;
    if (isImpersonating()) return;
    void signOut().then(() => {
      window.location.replace("/login");
    });
  }, [user]);

  return <ImpersonationBanner />;
}
