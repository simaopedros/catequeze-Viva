import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getClientIpFromRequest } from "../server/security/clientIp";
import { maskInviteEmail } from "../server/security/inviteEmailMask";

describe("familia audit alta — PII stripping (source)", () => {
  const catechumenOps = readFileSync(
    resolve(__dirname, "../server/operations/catechumenOperations.ts"),
    "utf8",
  );
  const documentOps = readFileSync(
    resolve(__dirname, "../server/operations/documentOperations.ts"),
    "utf8",
  );
  const memberOps = readFileSync(
    resolve(__dirname, "../server/operations/memberOperations.ts"),
    "utf8",
  );
  const familySignup = readFileSync(
    resolve(__dirname, "../catequese/pages/family/FamilySignupPage.tsx"),
    "utf8",
  );

  it("listCatechumens uses select and never returns uploadToken", () => {
    const start = catechumenOps.indexOf("export const listCatechumens");
    const block = catechumenOps.slice(start, start + 5500);
    expect(block).toContain("never return uploadToken");
    expect(block).toMatch(/select:\s*\{/);
    expect(block).not.toMatch(/uploadToken:\s*true/);
    expect(block).not.toMatch(/\binclude,\s*$/m);
    // All findMany branches should use select, not include of full scalars
    expect(block).toContain("select,");
    expect(block).not.toContain("include,");
  });

  it("getCatechumenProfile documents select omits s3Key", () => {
    const start = catechumenOps.indexOf("export const getCatechumenProfile");
    const block = catechumenOps.slice(start, start + 2800);
    expect(block).toContain("Never expose s3Key");
    expect(block).toMatch(/documents:\s*\{\s*select:/);
    expect(block).not.toMatch(/documents:\s*true/);
    expect(block).not.toMatch(/s3Key:\s*true/);
  });

  it("listDocuments uses documentClientSelect without s3Key", () => {
    expect(documentOps).toContain("documentClientSelect");
    expect(documentOps).toContain("never include s3Key");
    const selectStart = documentOps.indexOf("const documentClientSelect");
    const selectBlock = documentOps.slice(selectStart, selectStart + 900);
    expect(selectBlock).not.toMatch(/s3Key:\s*true/);
    expect(documentOps).toContain("select: documentClientSelect");
    expect(documentOps).not.toMatch(/include:\s*baseInclude/);
  });

  it("getInvitationByToken returns masked email only (no inviteEmail)", () => {
    const start = memberOps.indexOf("export const getInvitationByToken");
    const block = memberOps.slice(start, start + 2200);
    expect(block).toContain("maskInviteEmail");
    expect(block).toContain("emailMasked");
    expect(block).not.toMatch(/inviteEmail:/);
    expect(familySignup).not.toContain("inviteEmail");
    expect(familySignup).toContain("emailMasked");
  });

  it("invite create/resend/accept assert persistent rate limits", () => {
    expect(memberOps).toContain("INVITE_CREATE_RATE_LIMIT");
    expect(memberOps).toContain("INVITE_RESEND_RATE_LIMIT");
    expect(memberOps).toContain("INVITE_ACCEPT_RATE_LIMIT");
    expect(memberOps).toContain("INVITE_LOOKUP_RATE_LIMIT");
    expect(memberOps).toContain("assertPersistentRateLimit");
  });
});

describe("familia audit alta — client IP", () => {
  it("ignores raw CF-Connecting-IP and uses resolved req.ip", () => {
    expect(
      getClientIpFromRequest({
        headers: {
          "cf-connecting-ip": "203.0.113.50",
          "x-forwarded-for": "198.51.100.1, 10.0.0.1",
        },
        ip: "10.0.0.2",
      }),
    ).toBe("10.0.0.2");
  });

  it("ignores raw X-Forwarded-For and uses resolved req.ip", () => {
    expect(
      getClientIpFromRequest({
        headers: { "x-forwarded-for": "198.51.100.9, 10.0.0.1" },
        ip: "10.0.0.2",
      }),
    ).toBe("10.0.0.2");
  });

  it("falls back to req.ip / unknown", () => {
    expect(getClientIpFromRequest({ ip: "127.0.0.1" })).toBe("127.0.0.1");
    expect(getClientIpFromRequest(null)).toBe("unknown");
  });
});

describe("familia audit alta — maskInviteEmail", () => {
  it("masks local and domain labels (keeps TLD)", () => {
    expect(maskInviteEmail("joao.silva@diocese.com")).toBe("j***@d***.com");
    expect(maskInviteEmail("a@b.co")).toBe("a***@b***.co");
  });

  it("handles invalid input safely", () => {
    expect(maskInviteEmail("")).toBe("***");
    expect(maskInviteEmail("not-an-email")).toBe("***");
  });
});

describe("familia audit alta — persistent rate limit fail-open", () => {
  it("documents fail-open on DB errors in source", () => {
    const src = readFileSync(
      resolve(__dirname, "../server/security/persistentRateLimit.ts"),
      "utf8",
    );
    expect(src).toContain("fail-open");
    expect(src).toContain("failedOpen: true");
    expect(src).toContain("RateLimitBucket");
    expect(src).toContain("AUTH_FAIL_EMAIL_RATE_LIMIT");
    expect(src).toContain("AUTH_FAIL_IP_RATE_LIMIT");
    expect(src).toContain("peekPersistentRateLimit");
  });
});

describe("familia audit alta — Caddy + App noindex", () => {
  const caddy = readFileSync(
    resolve(__dirname, "../../deploy/Caddyfile"),
    "utf8",
  );
  const app = readFileSync(resolve(__dirname, "../client/App.tsx"), "utf8");
  const homolog = readFileSync(
    resolve(__dirname, "../../deploy/Caddyfile.homolog"),
    "utf8",
  );
  const schema = readFileSync(
    resolve(__dirname, "../../schema.prisma"),
    "utf8",
  );
  const migration = readFileSync(
    resolve(
      __dirname,
      "../../migrations/20261027120000_rate_limit_bucket/migration.sql",
    ),
    "utf8",
  );

  it("adds security headers only on production Caddyfile", () => {
    expect(caddy).toContain("prod_security_headers");
    expect(caddy).toContain(
      'Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    );
    expect(caddy).toContain(
      'Content-Security-Policy "frame-ancestors \'none\'"',
    );
    expect(caddy).toContain('X-Content-Type-Options "nosniff"');
    expect(caddy).toContain(
      'Referrer-Policy "strict-origin-when-cross-origin"',
    );
    expect(caddy).toContain('X-Frame-Options "DENY"');
    expect(homolog).not.toContain("prod_security_headers");
    expect(homolog).not.toContain("Strict-Transport-Security");
  });

  it("familia block has robots Disallow and X-Robots-Tag", () => {
    const familiaStart = caddy.indexOf("familia.catechis.app");
    const familiaBlock = caddy.slice(familiaStart, familiaStart + 1200);
    expect(familiaBlock).toContain('X-Robots-Tag "noindex, nofollow"');
    expect(familiaBlock).toContain("Disallow: /");
    expect(familiaBlock).toContain("handle /robots.txt");
    // Staff block must not get X-Robots-Tag
    const staffStart = caddy.indexOf("catechis.app, www.catechis.app");
    const staffBlock = caddy.slice(staffStart, caddy.indexOf("familia.catechis.app"));
    expect(staffBlock).not.toContain("X-Robots-Tag");
  });

  it("App sets meta robots noindex on family host only", () => {
    expect(app).toContain('ensureMeta("robots", "noindex, nofollow")');
    expect(app).toContain("isFamilyPortal");
  });

  it("adds RateLimitBucket table via additive migration only", () => {
    expect(schema).toContain("model RateLimitBucket");
    expect(migration).toContain('CREATE TABLE "RateLimitBucket"');
    expect(migration.toLowerCase()).not.toContain("drop table");
    expect(migration.toLowerCase()).not.toContain("delete from");
  });

  it("wires authRateLimiter + trust proxy", () => {
    const globalMw = readFileSync(
      resolve(__dirname, "../server/globalMiddleware.ts"),
      "utf8",
    );
    const setup = readFileSync(
      resolve(__dirname, "../server/setup.ts"),
      "utf8",
    );
    expect(globalMw).toContain("authRateLimiter");
    expect(setup).toContain("trust proxy");
  });
});
