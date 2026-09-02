import { useQuery, getMySupportMessages } from "wasp/client/operations";
import { useTranslation } from "react-i18next";
import { Mail, Inbox } from "lucide-react";
import {
  AppDisplayTitle,
  AppGoldRule,
  AppPageHeader,
} from "../../client/components/brand/AppChrome";
import { formatDateTime } from "../../i18n/format";
import { useLocale } from "../../i18n/useLocale";

export default function MySupportPage() {
  const { t } = useTranslation("common");
  const { currentLocale } = useLocale();
  const { data: messages = [], isLoading } = useQuery(getMySupportMessages);

  return (
    <div className="space-y-6">
      <AppPageHeader
        title={t("support_inbox.title")}
        subtitle={t("support_inbox.subtitle")}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#071A2D] border-t-transparent" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
            {t("support_inbox.empty_title")}
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {t("support_inbox.empty_desc")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg: any) => (
            <div
              key={msg.id}
              className="rounded-sm border border-border/70 bg-white p-5"
            >
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>{formatDateTime(msg.createdAt, currentLocale)}</span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("support_inbox.your_message")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#071A2D]">
                {msg.content}
              </p>
              {msg.replyBody ? (
                <div className="mt-4 rounded-sm border-l-[3px] border-[#D39A2B] bg-muted/40 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("support_inbox.our_reply")}
                  </p>
                  {msg.repliedAt && (
                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                      {formatDateTime(msg.repliedAt, currentLocale)}
                    </p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#071A2D]">
                    {msg.replyBody}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("support_inbox.waiting")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
