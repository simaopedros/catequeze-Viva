/** Institutional avatar tokens — ink on white, not multi-color SaaS chips. */
export const AVATAR_COLORS = [
  "border border-border/70 bg-muted/30 text-brand-ink",
  "border border-brand-ink/15 bg-brand-ink/[0.06] text-brand-ink",
  "border border-brand-gold/30 bg-brand-gold/10 text-brand-ink",
  "border border-border/70 bg-white text-brand-ink",
  "border border-brand-ink/20 bg-muted/40 text-brand-ink-soft",
];

export function getAvatarColorClass(name: string | undefined | null): string {
  if (!name) return AVATAR_COLORS[0];
  const charCode = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[Math.abs(charCode) % AVATAR_COLORS.length];
}
