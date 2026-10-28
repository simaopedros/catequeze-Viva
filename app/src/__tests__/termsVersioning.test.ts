import { beforeEach, describe, expect, it, vi } from "vitest";
const { transaction } = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("wasp/server", () => ({
  prisma: { $transaction: transaction },
  env: { ADMIN_EMAILS: [] },
  HttpError: class extends Error {
    constructor(
      public statusCode: number,
      message?: string,
    ) {
      super(message);
    }
  },
}));
vi.mock("wasp/auth/providers/types", () => ({
  defineUserSignupFields: (fields: any) => fields,
}));
import {
  acceptAccountTerms,
  getAccountTermsStatus,
} from "../server/operations/termsOperations";
import {
  getEmailUserFields,
  getGoogleUserFields,
} from "../auth/userSignupFields";

beforeEach(() => vi.clearAllMocks());
function fixture(required: boolean | null = true) {
  const rows: any[] = [];
  const User = {
    findUnique: vi.fn(async () => ({ termsAcceptanceRequired: required })),
    update: vi.fn(async ({ data }: any) => {
      required = data.termsAcceptanceRequired;
    }),
  };
  const TermsAcceptance = {
    findFirst: vi.fn(async ({ where }: any) =>
      rows.find(
        (r) =>
          r.userId === where.userId &&
          r.kind === where.kind &&
          r.version === where.version,
      ),
    ),
    create: vi.fn(async ({ data }: any) => {
      const row = {
        id: `terms-${rows.length}`,
        ...data,
        acceptedAt: new Date(),
      };
      rows.push(row);
      return row;
    }),
  };
  transaction.mockImplementation((callback) =>
    callback({ user: User, termsAcceptance: TermsAcceptance }),
  );
  return {
    context: { user: { id: "actor" }, entities: { User, TermsAcceptance } },
    rows,
  };
}
describe("account terms", () => {
  it("requires authentication", async () => {
    await expect(
      acceptAccountTerms({ accepted: true }, {}),
    ).rejects.toMatchObject({ statusCode: 401 });
    await expect(getAccountTermsStatus(undefined, {})).rejects.toMatchObject({
      statusCode: 401,
    });
  });
  it("requires explicit true", async () => {
    const { context } = fixture();
    for (const accepted of [false, undefined, "true"]) {
      await expect(
        acceptAccountTerms({ accepted: accepted as any }, context),
      ).rejects.toMatchObject({ statusCode: 400 });
    }
    expect(transaction).not.toHaveBeenCalled();
  });
  it("records account terms v1 with the authenticated user and date", async () => {
    const { context, rows } = fixture();
    expect(await getAccountTermsStatus(undefined, context)).toEqual({
      required: true,
    });
    await acceptAccountTerms({ accepted: true }, context);
    expect(rows).toEqual([
      expect.objectContaining({
        userId: "actor",
        kind: "ACCOUNT_TERMS",
        version: "1",
        acceptedAt: expect.any(Date),
      }),
    ]);
    expect(await getAccountTermsStatus(undefined, context)).toEqual({
      required: false,
    });
  });
  it("keeps earlier versions intact and makes retries idempotent", async () => {
    const { context, rows } = fixture();
    rows.push({
      id: "old",
      userId: "actor",
      kind: "ACCOUNT_TERMS",
      version: "0",
      acceptedAt: new Date(0),
    });
    const old = { ...rows[0] };
    await acceptAccountTerms({ accepted: true }, context);
    const v1 = { ...rows[1] };
    await acceptAccountTerms({ accepted: true }, context);
    expect(rows).toEqual([old, v1]);
  });
  it("leaves old accounts without a record unblocked until they choose to accept", async () => {
    const { context, rows } = fixture(null);
    expect(await getAccountTermsStatus(undefined, context)).toEqual({
      required: false,
    });
    expect(rows).toHaveLength(0);
    await acceptAccountTerms({ accepted: true }, context);
    expect(rows[0].version).toBe("1");
  });
  it("marks new email and Google accounts for first-access acceptance", () => {
    expect((getEmailUserFields as any).termsAcceptanceRequired({})).toBe(true);
    expect((getGoogleUserFields as any).termsAcceptanceRequired({})).toBe(true);
  });
  it("validates the email signup checkbox on the server", () => {
    expect(() =>
      (getEmailUserFields as any).email({ email: "account@example.test" }),
    ).toThrow();
    expect(
      (getEmailUserFields as any).email({
        email: "account@example.test",
        acceptedTerms: true,
      }),
    ).toBe("account@example.test");
  });
});
