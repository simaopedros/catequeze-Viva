import { describe, expect, it } from "vitest";
import { resolveClassLocationLabel } from "../shared/classLocationDisplay";

describe("resolveClassLocationLabel", () => {
  const notInformed = "Local não informado";

  it("returns not-informed when location is empty", () => {
    expect(resolveClassLocationLabel("", "Catequese de Ana", notInformed)).toBe(
      notInformed,
    );
    expect(
      resolveClassLocationLabel(null, "Catequese de Ana", notInformed),
    ).toBe(notInformed);
    expect(
      resolveClassLocationLabel("   ", "Catequese de Ana", notInformed),
    ).toBe(notInformed);
  });

  it("treats workspace name stored as location as missing", () => {
    expect(
      resolveClassLocationLabel(
        "Catequese de Catequista",
        "Catequese de Catequista",
        notInformed,
      ),
    ).toBe(notInformed);
    expect(
      resolveClassLocationLabel(
        "catequese de catequista",
        "Catequese de Catequista",
        notInformed,
      ),
    ).toBe(notInformed);
  });

  it("keeps a real place name", () => {
    expect(
      resolveClassLocationLabel(
        "Salão Paroquial",
        "Catequese de Ana",
        notInformed,
      ),
    ).toBe("Salão Paroquial");
  });
});
