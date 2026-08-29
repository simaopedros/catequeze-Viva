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

  it("keeps valid HH:mm times", () => {
    const parsed = createClassSchema.parse({
      name: "Crisma 2026",
      startTime: "09:00",
      endTime: "10:30",
    });
    expect(parsed.startTime).toBe("09:00");
    expect(parsed.endTime).toBe("10:30");
  });
});
