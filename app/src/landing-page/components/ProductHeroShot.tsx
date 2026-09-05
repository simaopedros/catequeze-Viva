/**
 * Real product screenshot for the landing hero — the live Painel, not a CSS mock.
 */
export function ProductHeroShot({ alt }: { alt: string }) {
  return (
    <img
      src="/landing/dashboard-hero.webp"
      srcSet="/landing/dashboard-hero-960.webp 960w, /landing/dashboard-hero.webp 1600w"
      sizes="(max-width: 1024px) 100vw, 900px"
      width={1600}
      height={728}
      alt={alt}
      fetchPriority="high"
      decoding="async"
      className="h-auto w-full bg-white"
      data-testid="app-product-shot"
    />
  );
}
