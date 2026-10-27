import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("pastoral email unsubscribe", () => {
  const service = readFileSync(
    resolve(__dirname, "../server/email/service.ts"),
    "utf8",
  );
  const announce = readFileSync(
    resolve(__dirname, "../server/operations/announcementEmailOperations.ts"),
    "utf8",
  );
  const message = readFileSync(
    resolve(__dirname, "../server/operations/sendMessageOperation.ts"),
    "utf8",
  );

  it("resolves userId from email when enqueueing non-transactional mail", () => {
    expect(service).toContain("resolveUserIdForEmail");
    expect(service).toContain("ensureUnsubscribePayload");
    expect(service).toMatch(/userId = await resolveUserIdForEmail/);
  });

  it("announcements pass guardian userId into enqueueEmail", () => {
    expect(announce).toContain("userId");
    expect(announce).toContain("user: { select: { id: true, email: true } }");
  });

  it("sendMessageEmail looks up recipient userId", () => {
    const start = message.indexOf("export const sendMessageEmail");
    const block = message.slice(start, start + 1600);
    expect(block).toContain("userId");
    expect(block).toContain("enqueueEmail");
  });
});
