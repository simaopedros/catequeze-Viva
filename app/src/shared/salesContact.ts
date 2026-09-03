/** Sales WhatsApp for plan and subscription questions. Display: (11) 93624-4752 */
export const SALES_WHATSAPP_E164 = "5511936244752";
export const SALES_WHATSAPP_DISPLAY = "(11) 93624-4752";

export function getSalesWhatsAppUrl(prefillMessage?: string): string {
  const base = `https://wa.me/${SALES_WHATSAPP_E164}`;
  const text = prefillMessage?.trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}
