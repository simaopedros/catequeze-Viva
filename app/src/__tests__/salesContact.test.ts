import { describe, expect, it } from "vitest";
import {
  SALES_WHATSAPP_DISPLAY,
  SALES_WHATSAPP_E164,
  getSalesWhatsAppUrl,
} from "../shared/salesContact";

describe("sales WhatsApp contact", () => {
  it("uses the published sales number", () => {
    expect(SALES_WHATSAPP_DISPLAY).toBe("(11) 93624-4752");
    expect(SALES_WHATSAPP_E164).toBe("5511936244752");
  });

  it("builds a wa.me link with optional prefilled message", () => {
    expect(getSalesWhatsAppUrl()).toBe("https://wa.me/5511936244752");
    expect(getSalesWhatsAppUrl("Olá! Quero saber mais sobre os planos.")).toBe(
      "https://wa.me/5511936244752?text=Ol%C3%A1%21%20Quero%20saber%20mais%20sobre%20os%20planos.",
    );
  });
});
