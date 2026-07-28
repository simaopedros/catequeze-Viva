import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { signOut } from "../client/auth/signOut";
import { Link as WaspRouterLink } from "wasp/client/router";
import { type User } from "wasp/entities";
import { userMenuItems } from "./constants";
import { isFamilyPortalHost } from "../shared/portal";

export const UserMenuItems = ({
  user,
  onItemClick,
}: {
  user?: Partial<User>;
  onItemClick?: () => void;
}) => {
  const { t } = useTranslation("topbar");

  const handleSignOut = async () => {
    onItemClick?.();
    try {
      await signOut();
    } finally {
      window.location.replace(isFamilyPortalHost() ? "/entrar" : "/login");
    }
  };

  return (
    <>
      {userMenuItems.map((item) => {
        if (item.isAuthRequired && !user) return null;
        if (item.isAdminOnly && (!user || !user.isAdmin)) return null;

        return (
          <li key={item.labelKey}>
            <WaspRouterLink
              to={item.to}
              onClick={onItemClick}
              className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium leading-7 text-brand-ink transition-colors hover:bg-accent hover:text-brand-ink-soft"
            >
              <item.icon size="1.1rem" />
              {t(item.labelKey)}
            </WaspRouterLink>
          </li>
        );
      })}
      <li>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium leading-7 text-brand-ink transition-colors hover:bg-accent hover:text-brand-ink-soft"
        >
          <LogOut size="1.1rem" />
          {t("sign_out")}
        </button>
      </li>
    </>
  );
};
