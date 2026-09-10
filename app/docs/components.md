# Componentes — Catequese Viva

## Linguagem visual: "papel litúrgico"

A marca institucional (ink `#071A2D` + gold `#D39A2B` + paper `#FFF7E7`) e a
serifa `Cormorant Garamond` são a identidade. A linguagem de superfície é
**editorial e litúrgica**, não SaaS genérico:

- **Público (landings, auth, blog):** canvas `bg-brand-paper`, halo
  (`liturgical-halo`) e grain só em hero/auth. Cormorant é a voz de display.
- **Produto e admin:** canvas creme quente (`--background: 38 32% 97%`),
  cards branco puro, hairline ink. Inter no miolo operacional; Cormorant em
  títulos de página, diálogos e empty states.
- **Hierarquia por papel + hairline**, não por card flutuante. Sombra é
  apoio curto; a borda `border-brand-ink/10` faz o trabalho.
- **Sombras tingidas de ink**, nunca preto puro.
- **Raio suave**: todo o app usa `rounded-sm`; a escala deriva de `--radius`.
- **Gold como metal litúrgico**, raro: foco sagrado (`ring-sacred`,
  `sacred-selected`), progresso sacramental, `AppGoldRule`. Não preencher
  botões primários de ouro.

Tema **claro apenas**. Não expandir UX escura. Classes `dark:` mortas devem
ser removidas, não reativadas.

Utilitários de atmosfera: `surface-paper`, `canvas-public`,
`liturgical-halo`, `grain-overlay`, `ring-sacred`, `sacred-selected`.

## Escala de raio

Derivada de `--radius: 0.75rem`. Não introduza valores avulsos.

| Utility | Valor | Uso |
|---|---|---|
| `rounded-xs` | 4px | Marcadores mínimos |
| `rounded-sm` | 8px | Padrão do app; chips, itens de lista, campos densos |
| `rounded-md` | 10px | Botões, inputs, selects, itens de menu |
| `rounded-lg` | 12px | Cards, painéis, popovers, alertas |
| `rounded-2xl` | 20px | Diálogos e sheets |
| `rounded-full` | — | Selos de status, avatares, indicadores |

## Biblioteca base (shadcn/ui — `src/client/components/ui/`)

| Componente | Variantes | Tamanhos | Ficheiro |
|---|---|---|---|
| **Button** | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`, `brand`, `subtle` | `xs`, `sm`, `default`(md), `lg`, `xl`, `icon` | `button.tsx` |
| **Card** | `default`, `accent`, `bento`, `interactive`, `flat` | — | `card.tsx` |
| **Badge** | `default`, `secondary`, `destructive`, `outline`, `brand`, `success`, `warning`, `info`, `dot` | `sm`, `md`, `lg` | `badge.tsx` |
| **Input** | `default`, `filled`; estados: `default`, `error`, `success` | — | `input.tsx` |
| **Table** | — | — | `table.tsx` |
| **Tabs** | (composable: `TabsList`, `TabsTrigger`, `TabsContent`) | — | `tabs.tsx` |
| **Tooltip** | (composable: `TooltipTrigger`, `TooltipContent`) | — | `tooltip.tsx` |
| **Dialog** | — | — | `dialog.tsx` |
| **Sheet** | `top`, `bottom`, `left`, `right` | — | `sheet.tsx` |

## Componentes de aplicação (`src/client/components/`)

| Componente | Props principais | Ficheiro |
|---|---|---|
| **StatCard** | `icon`, `label`, `value`, `delta`, `trend`(up/down/neutral), `color`, `href`, `variant`(default/centered/minimal) | `StatCard.tsx` |
| **SectionCard** | `title`, `description`, `icon`, `action`, `children` | `SectionCard.tsx` |
| **FilterBar** | `searchPlaceholder`, `searchValue`, `onSearchChange`, `filters[]`, `actions` | `FilterBar.tsx` |
| **ChartCard** | `title`, `description`, `action`, `children`, `loading`, `className` | `ChartCard.tsx` |
| **PageHeader** | `title`, `subtitle`, `breadcrumbs[]`, `tabs`, `backTo`, `compact`, `children` | `PageHeader.tsx` |
| **EmptyState** | `icon`, `title`, `description`, `children`, `compact`, `minimal`, `inline` | `EmptyState.tsx` |
| **ShellBase** | `variant`(app/public/auth/family), `children` | `ShellBase.tsx` |

## Tokens semânticos

| Categoria | Tokens |
|---|---|
| **Superfície** | `surface-base` → `bg-surface-base`, `surface-subtle` → `bg-surface-subtle`, `surface-elevated` → `bg-surface-elevated` |
| **Texto** | `text-primary` → `text-text-primary`, `text-secondary` → `text-text-secondary`, `text-tertiary` → `text-text-tertiary` |
| **Borda** | `stroke-default` → `border-stroke-default`, `stroke-strong` → `border-stroke-strong` |
| **Marca** | `brand-ink`, `brand-gold`, `brand-paper`, `brand-midnight`, `brand-light-gold` |
| **Feedback** | `feedback-success`, `feedback-warning`, `feedback-error`, `feedback-info` |

## Escala tipográfica

Os graus de título carregam `letter-spacing` negativo progressivo (−0.025em no
`xxl` até −0.01em no `xsm`): em Inter, quanto maior o corpo, mais fechado o
espacejamento precisa ser para o título parecer desenhado e não esticado.

| Utility | Font-size | Uso |
|---|---|---|
| `text-title-xxl` | 44px | Hero headline |
| `text-title-xl` | 36px | Page titles |
| `text-title-xl2` | 32px | Hero secundário |
| `text-title-lg` | 28px | Section headers |
| `text-title-md2` | 26px | Section headers alternativo |
| `text-title-md` | 24px | Métricas, títulos de seção |
| `text-title-sm` | 20px | Títulos de página no app |
| `text-title-xsm` | 18px | Títulos de card e de diálogo |
| `text-body-lg` | 17px | Lead paragraphs |
| `text-body` | 15px | Body |
| `text-body-sm` | 14px | Descriptions |
| `text-body-xs` | 12px | Captions |
| `text-caption` | 12px | Small labels |
| `text-overline` | 12px | Overline (com tracking 0.05em) |
| `text-micro` | 10px | Selos `size="sm"`, metadados densos |

## Elevação

Cada degrau é uma sombra curta tingida de ink. A hierarquia vem da hairline e
do contraste papel/branco, não do card flutuante.

| Utility | Uso |
|---|---|
| `shadow-elevation-xs` | Inputs, selects, botões em repouso |
| `shadow-elevation-sm` | Cards e painéis padrão |
| `shadow-elevation-md` | Card interativo em hover, tooltip |
| `shadow-elevation-lg` | Toasts |
| `shadow-elevation-dropdown` | Menus e conteúdo de select |
| `shadow-elevation-xl` | Reservado a sobreposições altas |
| `shadow-elevation-modal` | Diálogos e sheets |
| `shadow-elevation-sticky` | Headers fixos |

## Selos de status (`Badge`)

Antes `success`, `info` e `secondary` renderizavam todas em ink — visualmente
indistinguíveis, o que anulava o propósito de variantes semânticas. Agora cada
uma carrega cor tonal própria: fundo na cor a 10%, borda a 20%, texto na cor
cheia. `default` continua sendo o único preenchimento sólido.

## Banco de prova

`.design-preview/` roda os componentes reais contra o `Main.css` real, sem
banco, sem auth e sem Wasp — útil para verificar tokens e variantes isolados:

```bash
npx vite --config .design-preview/vite.config.ts
```

Para conferir as telas do app logado (exige `wasp start` e o banco no ar):

```bash
node .design-preview/screens.mjs /tmp/telas
```

Ele navega **clicando na navegação**, não com `page.goto`. Com recarga completa
a app às vezes devolve o Painel na rota pedida — um guard de workspace/permissão
ganha a corrida do boot — e a captura registrava a tela errada em silêncio. Cada
captura só acontece depois que o `<h1>` confere, e o script reporta overflow
horizontal, que é o sintoma clássico de mudança de densidade que apertou layout.

## Z-index

| Utility | Uso |
|---|---|
| `z-dropdown` | Dropdowns (50) |
| `z-sticky` | Headers, bottom nav (100) |
| `z-overlay` | Sidebar overlay (200) |
| `z-modal` | Dialogs, sheets (500) |
| `z-toast` | Toasts (1000) |
