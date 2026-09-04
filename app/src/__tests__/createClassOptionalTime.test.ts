import { describe, expect, it } from "vitest";
import { createClassSchema } from "../client/validation/schemas";

describe("createClass optional schedule", () => {
  it("accepts a class with only a name when times are blank", () => {
    const parsed = createClassSchema.parse({
      name: "Crisma 2026",
      dayOfWeek: "",
      startTime: "",
      endTime: "",
      location: "",
    });
    expect(parsed.startTime).toBeUndefined();
    expect(parsed.endTime).toBeUndefined();
    expect(parsed.dayOfWeek).toBeUndefined();
  });

  it("accepts null schedule fields", () => {
    const parsed = createClassSchema.parse({
      name: "Crisma 2026",
      dayOfWeek: null,
      startTime: null,
      endTime: null,
      location: null,
    });
    expect(parsed.startTime).toBeUndefined();
    expect(parsed.endTime).toBeUndefined();
    expect(parsed.dayOfWeek).toBeUndefined();
  });

  it("normalizes HH:mm:ss to HH:mm", () => {
    const parsed = createClassSchema.parse({
      name: "Crisma 2026",
      startTime: "09:00:00",
      endTime: "10:30:00",
    });
    expect(parsed.startTime).toBe("09:00");
    expect(parsed.endTime).toBe("10:30");
  });
});
