# ⚠️ Deploy Homolog — Manual Trigger Required

## 🚫 Bloqueador: GitHub Token Permissions

O Cloud Agent não tem permissões para disparar `workflow_dispatch` events via GitHub API.

**Erro**: `HTTP 403: Resource not accessible by integration`

---

## 🚀 Como Disparar o Deploy (Manual)

### Opção 1: Via GitHub UI (Recomendado)

1. **Ir para**: https://github.com/simaopedros/catequeze-Viva/actions/workflows/deploy-homolog.yml

2. **Clicar**: Botão verde **"Run workflow"** (canto direito superior)

3. **Configurar**:
   - **Branch**: Selecionar `cursor/launch-phase-catequista-only-6ddf`
   - **Branch input** (se aparecer): Deixar vazio ou repetir `cursor/launch-phase-catequista-only-6ddf`

4. **Clicar**: Botão verde **"Run workflow"** (confirmar)

5. **Aguardar**: ~5-10 minutos para build + deploy

6. **Monitorar**: A página irá recarregar mostrando o run em progresso

---

### Opção 2: Via GitHub CLI (Local)

Se você tiver `gh` CLI configurado localmente com suas credenciais:

```bash
gh workflow run deploy-homolog.yml \
  --ref cursor/launch-phase-catequista-only-6ddf \
  --field branch=cursor/launch-phase-catequista-only-6ddf

# Aguardar alguns segundos e então monitorar:
gh run watch $(gh run list --workflow=deploy-homolog.yml --limit=1 --json databaseId -q '.[0].databaseId')
```

---

## 📋 Após Deploy: Configurar Stripe TEST no VPS

**⚠️ IMPORTANTE**: Após o workflow completar com sucesso, você precisa configurar os Stripe TEST price IDs no VPS de homolog.

### SSH no VPS Homolog (Contabo 203223621)

```bash
ssh user@homolog-host
cd /opt/catechis
```

### Adicionar Stripe TEST Price IDs

```bash
# Editar .env.server
nano .env.server

# OU via sed (mais rápido):
sed -i 's|^STRIPE_SINGLE_PLAN_ID=.*|STRIPE_SINGLE_PLAN_ID=price_1U9lJjQ654W7D9A6bWCcgQBP|' .env.server
sed -i 's|^STRIPE_SINGLE_ANNUAL_PLAN_ID=.*|STRIPE_SINGLE_ANNUAL_PLAN_ID=price_1U9lJvQ654W7D9A6ji7lHdJi|' .env.server

# Se as variáveis não existirem ainda, adicionar:
grep -q "^STRIPE_SINGLE_PLAN_ID=" .env.server || \
  echo "STRIPE_SINGLE_PLAN_ID=price_1U9lJjQ654W7D9A6bWCcgQBP" >> .env.server
grep -q "^STRIPE_SINGLE_ANNUAL_PLAN_ID=" .env.server || \
  echo "STRIPE_SINGLE_ANNUAL_PLAN_ID=price_1U9lJvQ654W7D9A6ji7lHdJi" >> .env.server
```

### Verificar e Restart

```bash
# Verificar que as variáveis estão corretas
grep STRIPE_SINGLE .env.server
# Deve mostrar:
# STRIPE_SINGLE_PLAN_ID=price_1U9lJjQ654W7D9A6bWCcgQBP
# STRIPE_SINGLE_ANNUAL_PLAN_ID=price_1U9lJvQ654W7D9A6ji7lHdJi

# Restart server container
docker compose -f docker-compose.homolog.yml restart server

# Aguardar 10 segundos
sleep 10

# Health check
curl -fsS https://api-homolog.catechis.app/health
# Deve retornar: {"status":"ok"}
```

---

## ✅ Validação Final

### 1. Pricing Correto
```bash
curl -fsS https://homolog.catechis.app/pricing | grep -o 'R\$ [0-9,]*' | sort -u
```
**Esperado**: `R$ 9,90` (NÃO `R$ 29` ou `R$ 99`)

### 2. Landing Page Sem IA
```bash
# Não deve encontrar menções a IA:
curl -fsS https://homolog.catechis.app/ | grep -i "assistência editorial"
curl -fsS https://homolog.catechis.app/ | grep -i "créditos editoriais"
```
**Esperado**: Ambos comandos não retornam nada (exit code 1)

### 3. AI Routes Desabilitadas
```bash
curl -I https://homolog.catechis.app/app/ai-hub 2>&1 | grep "404"
curl -I https://homolog.catechis.app/app/ai-planner 2>&1 | grep "404"
```
**Esperado**: Ambos retornam 404

### 4. Checkout Stripe TEST (Manual)
1. Abrir https://homolog.catechis.app
2. Criar conta (sem cartão)
3. Ir para `/app/billing`
4. Clicar "Assinar Plano Único"
5. Verificar Stripe Checkout mostra:
   - ✅ Preço: R$ 9,90/mês (ou R$ 99/ano)
   - ✅ Banner "TEST MODE" visível
   - ❌ **NÃO concluir pagamento**

---

## 🔑 Stripe TEST Price IDs (Reference)

**⚠️ APENAS PARA HOMOLOG — NÃO USAR EM PRODUÇÃO**

| Plan | Interval | Price | Price ID |
|------|----------|-------|----------|
| Plano Único | Monthly | R$ 9,90 | `price_1U9lJjQ654W7D9A6bWCcgQBP` |
| Plano Único | Annual | R$ 99 | `price_1U9lJvQ654W7D9A6ji7lHdJi` |

**Stripe Account**: Navy Beam (TEST mode)  
**Product**: `prod_VA5UCaJ0fQvwMo`

---

## 📍 Ambientes

| Item | Homolog | Produção |
|------|---------|----------|
| **URL** | homolog.catechis.app | catechis.app |
| **API** | api-homolog.catechis.app | api.catechis.app |
| **Servidor** | Contabo 203223621 | Contabo 203365771 |
| **Database** | Aiven | Neon still-thunder-95479805 |
| **Stripe** | TEST | LIVE |
| **Status** | ✅ Deploy aqui | 🔒 Não tocar |

---

## 🔗 Links Úteis

- **Workflow**: https://github.com/simaopedros/catequeze-Viva/actions/workflows/deploy-homolog.yml
- **PR**: https://github.com/simaopedros/catequeze-Viva/pull/3
- **Branch**: `cursor/launch-phase-catequista-only-6ddf`
- **Docs**: [HOMOLOG_DEPLOY.md](./HOMOLOG_DEPLOY.md)

---

**Next Step**: Disparar workflow via GitHub UI (link acima) ↑
