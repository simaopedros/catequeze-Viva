# Correção: Email de Confirmação Não Enviado

## Problema Identificado

### Sintomas
1. Usuário faz cadastro em `/signup` com email+senha
2. Sistema mostra "Confirme seu email"
3. **Email nunca chega** (verificado no dashboard Resend: 0 tentativas de envio)
4. Login com as mesmas credenciais retorna "Email ou senha incorretos" em vez de "Confirme seu email"
5. Não há opção de reenviar email de confirmação

### Causa Raiz

O Wasp usa **duas formas separadas de envio de email**:

1. **SMTP** (configurado em `main.wasp` com `emailSender: { provider: SMTP }`)
   - Usado APENAS para emails de autenticação (confirmação e reset de senha)
   - Requer variáveis: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`
   - **Estas variáveis não estavam configuradas no Vercel em produção**

2. **Resend API** (sistema customizado em `src/server/email/`)
   - Usado para emails transacionais do app (convites, notificações, etc.)
   - Requer variável: `RESEND_API_KEY`
   - Esta estava configurada, mas **NÃO é usada pelo Wasp para auth**

**Resultado**: Como o SMTP não estava configurado, nenhum email de confirmação foi enviado. O app não logava o erro, então falhou silenciosamente.

## Correção Implementada

### 1. Configuração SMTP (CRÍTICO)

Adicionar no Vercel (Environment Variables):

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Mesma API key do Resend
```

**⚠️ IMPORTANTE**: O `SMTP_PASSWORD` deve ser a **API key do Resend** (começa com `re_`). O Resend aceita qualquer valor como username, mas convencionalmente usa-se `resend`.

### 2. Melhorias na UX

#### Login
- O login do Wasp devolve o mesmo erro ("Invalid credentials") para senha errada e para e-mail não confirmado, então não dá para distinguir os dois casos no cliente
- Depois de qualquer erro de credenciais, oferece "Reenviar e-mail de confirmação", com o aviso de que a senha continua a mesma

#### Signup (tela de sucesso)
- Adiciona botão "Reenviar" para casos onde o email não chegou
- Adiciona botão "E-mail errado?" para corrigir o email antes de confirmar
- Mostra feedback quando o reenvio é bem-sucedido

### 3. Traduções

Adicionadas em pt-BR, en e es:
- `login_resend_confirmation`
- `login_resend_hint`
- `login_resend_sent`
- `login_resend_error`
- `signup_success_wrong_email`
- `signup_success_resend`
- `signup_success_resend_sent`
- `signup_success_resend_error`

## Configuração Manual Necessária

**Simão deve configurar no Vercel**:

1. Acessar Settings > Environment Variables do projeto
2. Adicionar (se não existirem):
   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USERNAME=resend
   SMTP_PASSWORD=<API_KEY_DO_RESEND>
   ```
3. Redeploy da aplicação (ou aguardar próximo deploy automático)

**Verificação**:
- Após deploy, fazer cadastro de teste em https://catechis.app/signup
- Verificar no dashboard Resend se o email foi enviado
- Se ainda falhar, verificar logs do Vercel/Neon

## Testes

### Testar localmente
```bash
# Em .env.server, adicionar:
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=<sua_api_key>

# Rodar o app
wasp start
```

### Casos de teste
1. Cadastro novo → Email deve chegar
2. Tentar login antes de confirmar → Mensagem de credenciais + botão reenviar
3. Clicar em reenviar → Email deve ser reenviado e **a senha original continua funcionando** depois de confirmar
4. Na tela de sucesso do signup → Botões "Reenviar" e "E-mail errado?" funcionam

## Arquivos Modificados

- `src/i18n/locales/pt-BR/auth.json` - Novas traduções
- `src/i18n/locales/en/auth.json` - Novas traduções
- `src/i18n/locales/es/auth.json` - Novas traduções
- `src/auth/email-and-pass/resendVerificationEmail.ts` + `resendVerificationCore.ts` - action pública `resendVerificationEmail`
- `src/auth/CustomLoginForm.tsx` - Botão reenviar após erro de credenciais
- `src/auth/CustomSignupForm.tsx` - Botões reenviar e corrigir email
- `.env.server.example` - Documentação SMTP
- `deploy/.env.server.prod.example` - Documentação SMTP

## Observações Técnicas

### Por que não usar Resend API para auth?

O Wasp 0.22 ainda não suporta configurar custom email provider para auth emails. A única forma é via SMTP. Isso está documentado em: https://wasp.sh/docs/advanced/email

### Reenvio de email

O reenvio usa a action `resendVerificationEmail` (`auth: false`). Ela procura a identidade de e-mail e, se ela existir e ainda não estiver confirmada, gera um novo link com `createEmailVerificationLink` e envia com `sendEmailVerificationEmail`, as APIs públicas de `wasp/server/auth`. Ela nunca cria, apaga ou altera o usuário nem a senha.

Não use `signup()` para reenviar: para um e-mail não confirmado, o signup do Wasp apaga o usuário e cria outro com a senha enviada, o que trocaria a senha da pessoa por uma senha temporária.

### Segurança

- A action responde `{ ok: true }` em todos os casos (e-mail desconhecido, já confirmado, limite atingido ou enviado), então não revela se o e-mail existe
- Mensagens de erro são genéricas para evitar user enumeration
- Limite de um reenvio por minuto por e-mail, com base em `emailVerificationSentAt`
