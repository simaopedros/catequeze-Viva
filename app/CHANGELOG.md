# Changelog

## 2026-06-12 — Sprint de Correções UI/UX (31 ficheiros, +560/−192 linhas)

### 🔴 Segurança

- **2FA QR Code local** (`TwoFactorSetup.tsx`): Substituída chamada à API externa `api.qrserver.com` pelo componente `QRCodeSVG` da biblioteca `qrcode.react`. A chave secreta TOTP deixou de trafegar para terceiros.
- **Error Boundary** (`App.tsx`): Substituído o fallback bare `<p>Ocorreu um erro.</p>` do Sentry pelo componente `ErrorBoundary` completo com i18n, detalhes técnicos e botões de recuperação.

### ⚡ Performance — Eliminação de N+1 Queries

- **`getClassAttendanceMatrix`** (nova query): Retorna todas as reuniões de uma turma com os registos de presença numa só query Prisma (`include: { attendance: {...} }`). Substitui o loop que disparava 1 chamada por reunião no `AttendancePage.tsx`.
- **`listMeetingsForClasses`** (nova query): Retorna reuniões de múltiplas turmas numa só query (`where: { classId: { in: classIds } }`). Substitui o `Promise.all` de N chamadas individuais no `CalendarPage.tsx`.

### 🛡️ Prevenção de Crash

- **`AIPlannerPage.tsx`**: Proteção contra `NaN` quando `loadingPhrases.length === 0` (crashava o renderizador React se as traduções não tivessem carregado).
- **`SacramentalJourneyDetailPage.tsx`**: Validação de tamanho máximo de ficheiro (2MB) antes da conversão para Base64, prevenindo crash do servidor Node por consumo de memória.

### 🖱️ Usabilidade

- **Bulk actions em presenças** (`AttendancePage.tsx`): Botões "Marcar todos Presente/Ausente" por reunião.
- **Touch targets WCAG** (`AttendancePage.tsx`): Células de presença aumentadas para `min-w-[44px] min-h-[44px]`.
- **Scroll reset na navegação** (`App.tsx` + `AppShell.tsx`): Scroll volta ao topo ao mudar de rota (área pública e dashboard).
- **Menu mobile fecha ao navegar** (`NavBar.tsx`): `useEffect` no `location.pathname` fecha o Sheet.
- **Pesquisa sem race condition** (`TopBar.tsx`): `onBlur` do input de busca com `setTimeout(150ms)` para não fechar a dropdown antes do clique no resultado.
- **Workspace selector sem flicker** (`WorkspaceSelectorPage.tsx`): Loading state impede flash de "Sem dados".
- **Checkout com botão manual** (`CheckoutResultPage.tsx`): Além do redirect automático, o utilizador pode clicar "Ir para Minha Conta".

### 🌐 Internacionalização (i18n)

- **Checkout** (`CheckoutResultPage.tsx` + `billing.json`): 4 chaves em pt-BR, en, es.
- **Admin Billing** (`AdminBillingPage.tsx` + `billing.json`): 8+4 chaves para cabeçalhos de tabela, status e labels.
- Total: ~16 novas chaves i18n em 3 idiomas.

### ♿ Acessibilidade

- **Nested buttons desaninhados** (`SacramentsPage.tsx`): `<Link>` externo removido do card; apenas o nome do aluno é link. Elementos interativos internos usam `e.stopPropagation()`.
- **File inputs acessíveis** (`SacramentalJourneyDetailPage.tsx`): `className="hidden"` → `className="sr-only"` (visually hidden mas navegável por teclado).
- **Dark mode aria-label** (`DarkModeSwitcher.tsx`): `aria-label="Alternar modo escuro"` no checkbox.
- **Bottom nav notification badge** (`BottomNav.tsx`): Contador de notificações não lidas com polling de 15s.

### 📱 Chat & Comunicação (já existente, verificado)

- Auto-scroll ao fundo em novas mensagens
- Enter para enviar, Shift+Enter para nova linha
- Textarea sem resize manual (`resize-none`)
- Badges de mensagens não lidas na lista de conversas

---

## Verificação

| Verificação | Resultado |
|-------------|-----------|
| `wasp compile` | ✅ Sem erros |
| `npm run i18n:check` | ✅ 34 namespaces, 3 idiomas |
| `npm run test:unit` | ✅ 18/18 testes |
| `wasp start` | ✅ Frontend :3000 + Backend :3001 |

---

## 2026-06-12 (Round 3) — Sprint Final de Polimento (12 ficheiros)

### 🤖 AIPlannerPage
- **i18n**: Labels de tom (pastoral/lúdico/didático), "min" e textos do slider extraídos para `ai.json` (3 locales).
- **Slider ARIA**: Adicionado `role="slider"`, `aria-valuenow/min/max`, `aria-label`, e navegação por teclado (← → ↑ ↓).
- **Skeleton loading**: Spinner full-screen substituído por placeholder pulsante na área do documento. Sidebar e inputs permanecem visíveis.
- **Unsaved changes**: Bloqueio de navegação (`useBlocker`) quando há conteúdo gerado por editar, com diálogo de confirmação.

### 📅 AttendancePage
- **Arrow key navigation**: Setas ↑↓←→ navegam entre células da grelha de presenças (evita 600× Tab).
- **Student filter**: Input de busca/filtro de alunos aparece quando há > 10 catequizandos.

### 📖 BiblePage
- **Responsive**: Layout colapsa para coluna única em mobile (`flex-col lg:flex-row`).

### 💳 BillingPage
- **Stripe loading state**: Botão "Gerenciar Pagamento" mostra spinner e desativa durante o redirect.
- **Progress bars ARIA**: `role="progressbar"`, `aria-valuenow/min/max`, `aria-label` nas barras de quota.

### 📅 CalendarPage
- **Mobile agenda view**: Alterna automaticamente para vista de lista (`< 768px`) em vez do grid mensal ilegível.

### 👨‍👩‍👧 ClassDetailPage
- **Mobile overflow**: `overflow-x-auto` + `min-w-0` nos grids de alunos e catequistas.

### 👪 FamilyDetailPage
- **Copy toast**: Botão de copiar link de convite mostra toast "Link copiado!".

### 🚪 OnboardingPage (WelcomeStep)
- **Keyboard nav**: Cards de seleção de perfil com `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space).

### 💬 MessagesPage
- **Loading skeleton**: Placeholder de mensagens enquanto a conversa carrega.

### 🌐 i18n — Novas chaves
- **ai.json**: `minutes_abbr`, `step_tone`, `tone_label`, `tone_pastoral`, `tone_playful`, `tone_didactic`, `generating_skeleton`, `unsaved_changes_warning`, `unsaved_changes_title`
- **billing.json**: `manage_payment`, `manage_payment_loading`

---

## 2026-06-12 (Round 4) — Performance Profunda: Bundle Splitting & Query Parallelization

### ⚡ i18n Code Splitting (—270 KB do bundle inicial)

- **`scripts/build-i18n.mjs`**: Gera 3 ficheiros separados (`resources_pt_BR.ts`, `resources_en.ts`, `resources_es.ts`) em vez de um monolítico de 409 KB. Só o idioma detetado é carregado no boot.
- **`src/i18n/config.ts`**: Importa apenas `pt-BR` em modo síncrono. Exporta `loadLanguageBundle(lang)` que faz `import()` dinâmico de `en`/`es`.
- **`src/i18n/useLocale.ts`**: Dispara `loadLanguageBundle()` antes de `i18n.changeLanguage()` para idiomas não-default.

### ⚡ Lazy Loading das Landing Pages

- **4 landing pages** (`LandingPage.tsx`, `LandingSistema.tsx`, `LandingIa.tsx`, `LandingPresenca.tsx`): Secções below-the-fold passam a `React.lazy()` + `<Suspense>`. Hero + Navbar + Footer mantêm-se síncronos (above-the-fold).

### ⚡ Query Parallelization — Backend

- **`dashboardOperations.ts`** (`getDashboardStats`): Refatorado em 3 fases. Query `myClassLinks` duplicada foi unificada. 8 queries independentes (fase 2) e 5 queries dependentes (fase 3) correm em `Promise.all`.
- **`institutionalDashboardOperations.ts`** (`getInstitutionalAlerts`): 11 queries de alertas passam de execução sequencial para um único `Promise.all`. Redução de 10 roundtrips → 1.

### ⚡ Vendor Chunk Splitting

- **`vite.config.ts`**: `manualChunks` (função) isola `recharts` + `apexcharts` + `react-apexcharts` num chunk `charts` separado (406 kB). Páginas públicas (login/landing) não carregam gráficos.
- **Fix**: Objeto `manualChunks` trocado por função — o build SSR do Wasp marca `recharts` como externo, conflitando com o formato objeto. Função só é chamada para módulos internos.

### 🚀 Deploy Produção (v1.0.2)

- **Tag**: `v1.0.2` → CI build + Docker push (`prod-078a3ac`)
- **Build Vite**: SSR 305 módulos (5.2s) + client 4406 módulos (17s)
  - `charts-BQwnbJ1X.js` → 406 kB (isolado)
  - `resources_en` → 103 kB, `resources_es` → 110 kB (chunks separados)
  - Landing pages: ~4 kB cada (eram ~30 kB)
- **Incidente**: Migration `20260612070000_add_locale_to_content_models` falhada (pré-existente) bloqueou arranque. Resolvida com `prisma migrate resolve --rolled-back`.
- **Health check**: `{"status":"ok","database":"ok","ai":"ok"}` ✅

### 🧪 Testes

- **`src/__tests__/i18n.test.ts`**: Adaptado para verificar os 3 bundles separados em vez do antigo `resources.ts`.

---

## 2026-06-13 — Correção: Plano de subscrição não refletido em limites e mensagens

### 🐛 Bug — `context.user` cacheado (stale subscription data)

- **`workspaceOperations.ts`** (`listWorkspaces`, `getInstitutionalManageContext`): `context.user` do Wasp é carregado no login e nunca atualizado. Alterações manuais de plano na DB não eram refletidas. Adicionado `findUnique` fresco à DB antes de ler `subscriptionPlan`/`subscriptionStatus`.
- **`billingEnforcement.ts`** (`resolveNewParishBilling`, `assertCanCreateParish`): Mesmo problema — `context.user` substituído por fetch fresco da DB.

### 🐛 Bug — Workspace pessoal sempre via limites do plano grátis na UI

- **`ClassDetailPage.tsx`**: Resolvia o plano exclusivamente pelo `TenantBilling` da paróquia, que não existe para workspaces pessoais → plano sempre `CATECHIST_FREE`. Corrigido para usar `getPersonalPlanId(user)` quando `isPersonal === true`.

### 🐛 Bug — Sugestão de upgrade "Paróquia" em vez de "Catequista Pro"

- **`PlanLimitBanner.tsx`**: Comparação `plan === 'catechist_free'` era case-sensitive, mas `getEffectiveBillingPlan` retorna `'CATECHIST_FREE'` (uppercase). Adicionado `resolvePlanIdOrFree()` para normalizar antes da comparação.

### Verificação

| Verificação | Resultado |
|-------------|-----------|
| `wasp compile` | ✅ Sem erros |
| `npm run test:unit` | ✅ 18/18 |
| `npm run test:integration` (pricing) | ✅ 58/66 (8 falhas pré-existentes — dados de seed) |

---

## Balanço Final do Sprint (4 Rondas)

| Categoria | Itens |
|-----------|-------|
| 🔴 Segurança | 2 (QR local, Error Boundary) |
| ⚡ Performance | 2 aggregate queries (N+1 → 1) + 4 otimizações profundas (i18n code-split, lazy loading, query parallelization ×2, vendor chunks) |
| 🛡️ Crash prevention | 2 (NaN guard, file size guard) |
| 🖱️ UX/Usabilidade | 12 (bulk actions, touch targets, scroll reset, arrow nav, filters, etc.) |
| 🌐 i18n | ~30 novas chaves em 3 idiomas + code-splitting dos bundles |
| ♿ Acessibilidade | 10 (nested buttons, ARIA, sr-only, keyboard nav, touch targets, etc.) |
| 📱 Mobile/Responsivo | 5 (agenda view, bible layout, overflow fixes, touch targets) |
| **Total** | **~56 ficheiros alterados** |
