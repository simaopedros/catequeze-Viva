import { MessageCircleMore } from "lucide-react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";

const MessageButton = () => {
  return (
    <li className="relative" x-data="{ dropdownOpen: false, notifying: true }">
      <WaspRouterLink
        className="relative flex h-9 w-9 items-center justify-center rounded-sm border border-border/70 bg-white text-[#071A2D] transition-colors hover:bg-muted/40"
        to={routes.AppMessagesRoute.to}
      >
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-sm bg-[#D39A2B]">
          {/* TODO: only animate if there are new messages */}
          <span className="absolute inline-flex h-full w-full animate-ping rounded-sm bg-[#D39A2B] opacity-75"></span>
        </span>
        <MessageCircleMore className="size-5" />
      </WaspRouterLink>
    </li>
  );
};

export default MessageButton;
