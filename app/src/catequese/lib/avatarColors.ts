/** Institutional avatar tokens — ink on white, not multi-color SaaS chips. */
export const AVATAR_COLORS = [
  "border border-border/70 bg-muted/30 text-[#071A2D]",
  "border border-[#071A2D]/15 bg-[#071A2D]/[0.06] text-[#071A2D]",
  "border border-[#D39A2B]/30 bg-[#D39A2B]/10 text-[#071A2D]",
  "border border-border/70 bg-white text-[#071A2D]",
  "border border-[#071A2D]/20 bg-muted/40 text-[#0a2540]",
];

export function getAvatarColorClass(name: string | undefined | null): string {
  if (!name) return AVATAR_COLORS[0];
  const charCode = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[Math.abs(charCode) % AVATAR_COLORS.length];
}
