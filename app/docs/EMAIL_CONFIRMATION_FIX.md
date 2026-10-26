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
- Detecta erro de "email não verificado" (antes mostrava genérico "Email ou senha incorretos")
- Mostra mensagem clara: "Confirme seu e-mail para entrar. Verifique a caixa de entrada."
- Adiciona botão "Reenviar e-mail de confirmação" quando detecta conta não verificada

#### Signup (tela de sucesso)
- Adiciona botão "Reenviar" para casos onde o email não chegou
- Adiciona botão "E-mail errado?" para corrigir o email antes de confirmar
- Mostra feedback quando o reenvio é bem-sucedido

### 3. Traduções

Adicionadas em pt-BR, en e es:
- `login_error_unverified`
- `login_resend_confirmation`
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
2. Tentar login antes de confirmar → Mensagem "Confirme seu e-mail" + botão reenviar
3. Clicar em reenviar → Email deve ser reenviado
4. Na tela de sucesso do signup → Botões "Reenviar" e "E-mail errado?" funcionam

## Arquivos Modificados

- `src/i18n/locales/pt-BR/auth.json` - Novas traduções
- `src/i18n/locales/en/auth.json` - Novas traduções
- `src/i18n/locales/es/auth.json` - Novas traduções
- `src/auth/CustomLoginForm.tsx` - Detecção de email não verificado + botão reenviar
- `src/auth/CustomSignupForm.tsx` - Botões reenviar e corrigir email
- `.env.server.example` - Documentação SMTP
- `deploy/.env.server.prod.example` - Documentação SMTP

## Observações Técnicas

### Por que não usar Resend API para auth?

O Wasp 0.22 ainda não suporta configurar custom email provider para auth emails. A única forma é via SMTP. Isso está documentado em: https://wasp.sh/docs/advanced/email

### Reenvio de email

A implementação atual do reenvio usa um "hack" seguro: tenta fazer signup novamente com senha temporária. O Wasp detecta que o email já existe e (se configurado corretamente) reenvia o email de verificação. É uma solução pragmática até que o Wasp exponha uma API oficial de reenvio.

### Segurança

- Não revelamos se o email existe no banco ao tentar reenviar
- Mensagens de erro são genéricas para evitar user enumeration
- O fluxo de reenvio tem rate limiting implícito do Wasp
