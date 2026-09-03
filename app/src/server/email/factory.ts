import { fakeEmailAdapter } from "./adapters/fake";
import { resendEmailAdapter } from "./adapters/resend";
import { resolveEmailProviderName } from "./config";
import type { EmailProvider } from "./port";

export function getEmailProvider(): EmailProvider {
  return resolveEmailProviderName() === "resend"
    ? resendEmailAdapter
    : fakeEmailAdapter;
}
