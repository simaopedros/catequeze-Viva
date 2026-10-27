# Base legal LGPD — e-mails de lifecycle / recuperação

Os e-mails de ativação, trial e win-back (lifecycle) e mensagens correlatas de recuperação usam como base legal a **LGPD art. 7º, inciso IX — legítimo interesse**.

## Notas de balancing

- Destinatários são apenas titulares de conta (usuários que se cadastraram no serviço).
- O conteúdo é relacionado ao serviço contratado/avaliado (onboarding, trial, reconquista do produto).
- Todo e-mail de lifecycle inclui link de descadastro no HTML (`renderLifecycleEmailHtml` em `src/server/lifecycle/templates.ts`) e cabeçalhos `List-Unsubscribe` / `List-Unsubscribe-Post` para mensagens não transacionais (`src/server/email/headers.ts`, aplicados em `src/server/email/service.ts`).
- Opt-out é respeitado via preferências de e-mail (`EmailPreference` / tópico lifecycle).
- No máximo **1** e-mail de lifecycle por dia por usuário (`alreadySentToday` em `selectCampaign` / job de nudge).
