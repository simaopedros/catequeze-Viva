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
