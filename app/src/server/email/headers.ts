import { isTransactionalMessage, type EmailMessageId } from "../../shared/emailCatalog";
import { serverBaseUrl } from "./config";

export function unsubscribeUrl(token: string): string {
  return `${serverBaseUrl()}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function listUnsubscribeHeaders(token: string, messageId: EmailMessageId) {
  if (isTransactionalMessage(messageId)) return {};
  const url = unsubscribeUrl(token);
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
