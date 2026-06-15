# Componentes — Catequese Viva

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
| **Marca** | `brand-primary`, `brand-warm`, `brand-support` |
| **Feedback** | `feedback-success`, `feedback-warning`, `feedback-error`, `feedback-info` |

## Escala tipográfica

| Utility | Font-size | Uso |
|---|---|---|
| `text-title-xxl` | 44px | Hero headline |
| `text-title-xl` | 36px | Page titles |
| `text-title-lg` | 28px | Section headers |
| `text-title-md` | 24px | Card titles |
| `text-title-sm` | 20px | Subsection |
| `text-title-xsm` | 18px | Compact titles |
| `text-body-lg` | 17px | Lead paragraphs |
| `text-body` | 15px | Body |
| `text-body-sm` | 13px | Descriptions |
| `text-body-xs` | 12px | Captions |
| `text-caption` | 11px | Small labels |
| `text-overline` | 10px | Overline / micro text |

## Elevação

| Utility | Uso |
|---|---|
| `shadow-elevation-xs` | Cards subtis, inputs |
| `shadow-elevation-sm` | Cards padrão |
| `shadow-elevation-md` | Cards interactivos |
| `shadow-elevation-lg` | Dropdowns |
| `shadow-elevation-xl` | Modals |
| `shadow-elevation-sticky` | Headers fixos |

## Z-index

| Utility | Uso |
|---|---|
| `z-dropdown` | Dropdowns (50) |
| `z-sticky` | Headers, bottom nav (100) |
| `z-overlay` | Sidebar overlay (200) |
| `z-modal` | Dialogs, sheets (500) |
| `z-toast` | Toasts (1000) |
