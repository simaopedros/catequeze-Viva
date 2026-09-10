# Identidade Visual

## Conceito

A marca da Catequese Viva combina tres referencias centrais do produto:

- janela/igreja: pertencimento e vida eclesial;
- cruz em negativo: centralidade do anuncio cristao;
- livro/caminho na base: jornada catequetica viva, progressiva e acompanhada.

## Paleta

- `#071A2D` `brand-ink`: azul profundo, institucional e contemplativo.
- `#153A63` `brand-midnight`: apoio para gradientes e superfícies hero.
- `#D39A2B` `brand-gold`: calor, liturgia e destaque.
- `#F4CF7A` `brand-light-gold`: halo, bordas e acentos.
- `#FFF7E7` `brand-paper`: canvas das superfícies públicas e miolo do símbolo.

## Superfícies

- Landings, auth e blog usam `brand-paper` como fundo (`canvas-public`).
- O app logado e o admin usam o canvas creme de `--background` (não o paper
  pleno) para tabelas e formulários densos manterem contraste WCAG AA.
- Prefira `bg-brand-paper`, `bg-brand-midnight`, `text-brand-ink-muted` em
  vez de hex avulsos.

## Arquivos

- `public/brand/catequese-viva-mark.svg`: icone principal.
- `public/brand/catequese-viva-logo.svg`: lockup horizontal.
- `public/brand/catequese-viva-seal.svg`: selo para materiais de campanha.
- `public/favicon.svg`: favicon da aplicacao.

## Uso

- Prefira `BrandLockup` no produto quando houver espaco para nome + selo `Viva`.
- Use `BrandMark` em areas compactas, favicon e estados colapsados.
- Evite reutilizar `Cross` do Lucide como logo. Ele continua valido como iconografia funcional do dominio sacramental, nao como marca.
