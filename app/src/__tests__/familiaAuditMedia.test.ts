import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  maskEmail,
  maskStorageKey,
  scrubLogContext,
  scrubLogMessage,
} from "../server/privacy/maskPii";

describe("familia audit média — maskEmail / maskStorageKey", () => {
  it("masks email as j***@d***.com", () => {
    expect(maskEmail("joao.silva@diocese.com")).toBe("j***@d***.com");
    expect(maskEmail("a@b.co")).toBe("a***@b***.co");
    expect(maskEmail("")).toBe("***");
    expect(maskEmail(null)).toBe("***");
  });

  it("masks storage keys without leaking full paths", () => {
    expect(maskStorageKey("parish/abc/docs/certidao.pdf")).toMatch(/^pari…\(\d+\)$/);
    expect(maskStorageKey("")).toBe("[empty]");
    expect(maskStorageKey("short")).toBe("***");
  });

  it("scrubs logger context emails and s3Key", () => {
    expect(scrubLogContext({ to: "pai@familia.org", s3Key: "docs/menor/rg.pdf" })).toEqual({
      to: "p***@f***.org",
      s3Key: expect.stringMatching(/^docs…\(\d+\)$/),
    });
  });

  it("scrubs emails embedded in log messages", () => {
    expect(scrubLogMessage("failed for mae@paroquia.br")).toContain("m***@p***.br");
    expect(scrubLogMessage("failed for mae@paroquia.br")).not.toContain("mae@paroquia.br");
  });
});

describe("familia audit média — AuthZ ACTIVE for guardian ops", () => {
  const meetingOps = readFileSync(
    resolve(__dirname, "../server/operations/meetingOperations.ts"),
    "utf8",
  );
  const sacramentOps = readFileSync(
    resolve(__dirname, "../server/operations/sacramentOperations.ts"),
    "utf8",
  );
  const uploadApi = readFileSync(
    resolve(__dirname, "../server/api/authenticatedDocumentUpload.ts"),
    "utf8",
  );
  const wasp = readFileSync(resolve(__dirname, "../../main.wasp"), "utf8");
  const docsApi = readFileSync(
    resolve(__dirname, "../server/api/documents.ts"),
    "utf8",
  );
  const loggerSrc = readFileSync(
    resolve(__dirname, "../server/logger.ts"),
    "utf8",
  );

  it("justifyAbsence uses assertCanAccessCatechumenProfile", () => {
    const start = meetingOps.indexOf("export const justifyAbsence");
    const block = meetingOps.slice(start, start + 900);
    expect(block).toContain("assertCanAccessCatechumenProfile");
    expect(block).not.toContain("catechumen?.householdId !== guardian.householdId");
  });

  it("justifyAbsenceByMeeting uses assertCanAccessCatechumenProfile", () => {
    const start = meetingOps.indexOf("export const justifyAbsenceByMeeting");
    const block = meetingOps.slice(start, start + 1800);
    expect(block).toContain("assertCanAccessCatechumenProfile");
    expect(block).not.toContain(
      "catechumen.householdId !== guardian.householdId",
    );
  });

  it("getSacramentalJourney delegates to assertCanAccessCatechumenProfile", () => {
    const start = sacramentOps.indexOf("export const getSacramentalJourney");
    const block = sacramentOps.slice(start, start + 2200);
    expect(block).toContain("assertCanAccessCatechumenProfile");
    expect(block).not.toContain(
      "guardian.householdId === journey.catechumenProfile.householdId",
    );
  });

  it("authenticated guardian upload uses assertCanAccessCatechumenProfile", () => {
    expect(uploadApi).toContain("assertCanAccessCatechumenProfile");
    expect(uploadApi).not.toContain(
      "catechumen?.householdId !== guardian.householdId",
    );
  });

  it("declares Household on justifyAbsence and getSacramentalJourney entities", () => {
    const justify = wasp.slice(
      wasp.indexOf("action justifyAbsence"),
      wasp.indexOf("action justifyAbsence") + 350,
    );
    expect(justify).toContain("Household");
    const journey = wasp.slice(
      wasp.indexOf("query getSacramentalJourney"),
      wasp.indexOf("query getSacramentalJourney") + 400,
    );
    expect(journey).toContain("Household");
  });

  it("document serve logs never print raw s3Key", () => {
    expect(docsApi).toContain("maskStorageKey");
    expect(docsApi).not.toMatch(/s3Key="\$\{doc\.s3Key\}"/);
  });

  it("logger scrubs PII via maskPii helpers", () => {
    expect(loggerSrc).toContain("scrubLogContext");
    expect(loggerSrc).toContain("scrubLogMessage");
  });
});

describe("familia audit média — session cookie decision", () => {
  it("documents shared cookie analysis without forcing domain change", () => {
    const doc = readFileSync(
      resolve(__dirname, "../../docs/SECURITY_SESSION.md"),
      "utf8",
    );
    expect(doc).toContain("COOKIE_DOMAIN=.catechis.app");
    expect(doc).toContain("Não alterar");
    expect(doc).toContain("one-time");
  });
});

describe("familia audit média — Caddy nosniff on catechis.app", () => {
  it("staff production block imports prod_security_headers with nosniff", () => {
    const caddy = readFileSync(
      resolve(__dirname, "../../deploy/Caddyfile"),
      "utf8",
    );
    const homolog = readFileSync(
      resolve(__dirname, "../../deploy/Caddyfile.homolog"),
      "utf8",
    );
    expect(caddy).toContain('X-Content-Type-Options "nosniff"');
    const staffStart = caddy.indexOf("catechis.app, www.catechis.app");
    const familiaStart = caddy.indexOf("familia.catechis.app");
    const staffBlock = caddy.slice(staffStart, familiaStart);
    expect(staffBlock).toContain("import prod_security_headers");
    expect(homolog).not.toContain("prod_security_headers");
  });
});

describe("familia audit média — logger scrub live", () => {
  it("logger.warn masks email in context before console", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { logger } = await import("../server/logger");
    logger.warn("invite missing key", { to: "responsavel@email.com" });
    expect(spy).toHaveBeenCalled();
    const payload = String(spy.mock.calls[0]?.[0] ?? "");
    expect(payload).not.toContain("responsavel@email.com");
    expect(payload).toContain("r***@e***.com");
    spy.mockRestore();
  });
});
