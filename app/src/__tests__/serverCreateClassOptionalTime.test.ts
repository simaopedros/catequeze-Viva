import { describe, expect, it, vi } from "vitest";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

describe("server createClassSchema optional times", () => {
  it("accepts empty startTime/endTime from onboarding", async () => {
    const { createClassSchema } = await import("../server/validation");
    const parsed = createClassSchema.parse({
      name: "Turma de Crisma",
      parishId: "11111111-1111-4111-8111-111111111111",
      dayOfWeek: "",
      startTime: "",
      endTime: "",
    });
    expect(parsed.startTime).toBeUndefined();
    expect(parsed.endTime).toBeUndefined();
    expect(parsed.dayOfWeek).toBeUndefined();
  });

  it("accepts communityId null to unlink a class from a community", async () => {
    const { createClassSchema } = await import("../server/validation");
    const parsed = createClassSchema.parse({
      name: "Turma de Crisma",
      parishId: "11111111-1111-4111-8111-111111111111",
      communityId: null,
    });
    expect(parsed.communityId).toBeNull();
  });

  it("accepts null startTime/endTime", async () => {
    const { createClassSchema } = await import("../server/validation");
    const parsed = createClassSchema.parse({
      name: "Turma de Crisma",
      parishId: "11111111-1111-4111-8111-111111111111",
      startTime: null,
      endTime: null,
    });
    expect(parsed.startTime).toBeUndefined();
    expect(parsed.endTime).toBeUndefined();
  });
});
