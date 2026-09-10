import { MessageCircleMore } from "lucide-react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery, getContactUnreadCount } from "wasp/client/operations";

const MessageButton = () => {
  const { t } = useTranslation("admin");
  const { data: unread = 0 } = useQuery(getContactUnreadCount);

  return (
    <li className="relative">
      <NavLink
        to="/admin/support"
        className="relative flex h-9 w-9 items-center justify-center rounded-sm border border-border/70 bg-white text-brand-ink transition-colors hover:bg-muted/40"
        aria-label={t("sidebar.support")}
      >
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-sm bg-brand-gold">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-sm bg-brand-gold opacity-75" />
          </span>
        )}
        <MessageCircleMore className="size-5" />
      </NavLink>
    </li>
  );
};

export default MessageButton;
