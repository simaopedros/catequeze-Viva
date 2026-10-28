import { beforeEach, describe, expect, it, vi } from "vitest";
const { transaction } = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("wasp/server", () => ({
  prisma: { $transaction: transaction },
  HttpError: class extends Error {
    constructor(
      public statusCode: number,
      message?: string,
    ) {
      super(message);
    }
  },
}));
import {
  listConsents,
  saveConsent,
} from "../server/operations/consentOperations";

function fixture() {
  const records: any[] = [];
  const events: any[] = [];
  const entities = {
    GuardianProfile: {
      findUnique: vi.fn().mockResolvedValue({ householdId: "family" }),
    },
    ConsentRecord: {
      findMany: vi.fn(async () => records),
      upsert: vi.fn(async ({ create, update }: any) => {
        if (records.length) Object.assign(records[0], update);
        else records.push({ id: "record", ...create });
        return records[0];
      }),
    },
    ConsentEvent: {
      create: vi.fn(async ({ data }: any) => {
        events.push({ ...data, createdAt: new Date() });
      }),
    },
  };
  transaction.mockImplementation(async (callback) => {
    const before = structuredClone({ records, events });
    try {
      return await callback({
        guardianProfile: entities.GuardianProfile,
        consentRecord: entities.ConsentRecord,
        consentEvent: entities.ConsentEvent,
      });
    } catch (error) {
      records.splice(0, records.length, ...before.records);
      events.splice(0, events.length, ...before.events);
      throw error;
    }
  });
  return { context: { user: { id: "actor" }, entities }, records, events };
}
beforeEach(() => vi.clearAllMocks());
describe("consent versioning", () => {
  it("rejects invalid types with 400 before querying or writing", async () => {
    const { context } = fixture();
    for (const type of ["INVALID", "toString", "", null]) {
      await expect(
        saveConsent({ type: type as any, granted: true }, context),
      ).rejects.toMatchObject({ statusCode: 400 });
    }
    expect(transaction).not.toHaveBeenCalled();
  });
  it("requires a boolean", async () => {
    fixture();
    for (const granted of ["false", 1, null, undefined]) {
      await expect(
        saveConsent(
          { type: "IMAGE_USAGE", granted: granted as any },
          { user: { id: "actor" } },
        ),
      ).rejects.toMatchObject({ statusCode: 400 });
    }
    expect(transaction).not.toHaveBeenCalled();
  });
  it("requires authentication for read and write", async () => {
    await expect(
      saveConsent({ type: "IMAGE_USAGE", granted: true }, {}),
    ).rejects.toMatchObject({ statusCode: 401 });
    await expect(listConsents(undefined, {})).rejects.toMatchObject({
      statusCode: 401,
    });
  });
  it("preserves grants and revocations as separate events with actor, version and date", async () => {
    const { context, records, events } = fixture();
    await saveConsent({ type: "IMAGE_USAGE", granted: true }, context);
    const original = { ...events[0] };
    await saveConsent({ type: "IMAGE_USAGE", granted: false }, context);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      granted: false,
      grantedAt: null,
      textVersion: "1",
    });
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(original);
    expect(events[0]).toMatchObject({
      granted: true,
      actorUserId: "actor",
      textVersion: "1",
      householdId: "family",
      consentRecordId: "record",
      createdAt: expect.any(Date),
    });
    expect(events[1]).toMatchObject({ granted: false, textVersion: "1" });
  });
  it("returns version and acceptance date scoped to the authenticated guardian", async () => {
    const { context } = fixture();
    await saveConsent({ type: "COMMUNICATION", granted: true }, context);
    expect(await listConsents(undefined, context)).toEqual([
      expect.objectContaining({
        textVersion: "1",
        grantedAt: expect.any(Date),
      }),
    ]);
    expect(context.entities.ConsentRecord.findMany).toHaveBeenCalledWith({
      where: { household: { guardians: { some: { userId: "actor" } } } },
    });
  });
  it("does not save state when the event insert fails", async () => {
    const { context, records, events } = fixture();
    context.entities.ConsentEvent.create.mockRejectedValueOnce(
      new Error("insert failed"),
    );
    await expect(
      saveConsent({ type: "DOCUMENTS", granted: true }, context),
    ).rejects.toThrow("insert failed");
    expect(records).toEqual([]);
    expect(events).toEqual([]);
  });
  it("rejects a guardian without a household", async () => {
    const { context } = fixture();
    context.entities.GuardianProfile.findUnique.mockResolvedValueOnce(null);
    await expect(
      saveConsent({ type: "DOCUMENTS", granted: true }, context),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(context.entities.ConsentRecord.upsert).not.toHaveBeenCalled();
  });
});
