# Catequese Viva — app Expo

Aplicação TypeScript (iOS / Android / web Expo) da plataforma de catequese. Fala com a API Bearer `/mobile/*` do backend Wasp — a mesma conta, os mesmos espaços (diocese → paróquia → comunidade → turma) e o mesmo domínio da web: turmas, catequizandos, famílias, biblioteca, encontros, presença, comunicados, formação, sacramentos, Bíblia, catecismo, diretório, relatórios, grupos e Comunidade · Rhema.

A UI está em **pt-BR**, alinhada à web (`Email`/`Senha`, `Presente`/`Ausente`/`Atrasado`/`Justificado`, `Configurações`). Os textos bíblicos e do catecismo pedem-se com `locale=pt-BR`.

A barra inferior replica a web: **Início, Comunidade, Turmas, Calendário** + **Mais**. Mensagens ficam no menu Mais, como na folha da web.

## Pré-requisitos

- Node 22
- Conta na Catequese Viva (o login é o mesmo da web)
- Backend Wasp a correr (`cd app && wasp start`), em geral em `http://localhost:3001`

## Arranque

```bash
cd mobile
cp .env.example .env
# No dispositivo físico, use o IP da máquina em vez de localhost:
# EXPO_PUBLIC_API_URL=http://192.168.1.10:3001
npm install
npx expo start
```

Atalhos: `npm start`, `npm run android`, `npm run ios`, `npm run web`.

No celular: app Expo Go e o QR code. A sessão (Bearer) fica em `expo-secure-store`. O 2FA, quando ativo na conta, pede o código TOTP antes de abrir as tabs.

Senha das contas de seed de testes: `Teste@123`.

## Ecrãs

| Rota | Função | API |
| --- | --- | --- |
| Entrar / 2FA / recuperar | Auth persistente | live |
| Início | Painel, presença média, chamada pendente, aniversários, encontros | live |
| Comunidade | Feed Rhema, tópicos, perfil `@`, seguir/bloquear | live |
| Turmas | Lista, detalhe, inscritos, encontro, presença | live |
| Calendário | Encontros da turma + eventos litúrgicos | live |
| Mensagens (Mais) | Conversas e envio | live |
| Catequizandos / famílias / equipe / convites | Pessoas do espaço ativo | live |
| Biblioteca / pasta oficial / modelos de jornada | Conteúdos e recursos | live |
| Comunicados / formação / sacramentos / anos | Pedagogia | live |
| Bíblia / catecismo / diretório | Referências (dados em pt-BR) | live |
| Relatórios / aniversariantes / paróquias | Presença e gestão | live |
| Consentimentos | Autorizações (responsável) | live |
| Grupos | Grupos pastorais | live |
| Documentos / notificações | Arquivos e avisos | live |
| Assinatura | Plano e estado (só leitura) | live (leitura) |
| Assistência editorial | Placeholder oculto no Mais | **não live** — a IA está desativada na web nesta fase |
| Checkout, PIX, portal, criar turma/conteúdo, enviar convites, upload de documentos, editar conta/2FA | — | **web only** |

Não há dados inventados no cliente: listas vazias ou erros HTTP mostram o estado real da API. O único ecrã deliberadamente estático é a assistência editorial.

## Testes

```bash
npm test
npm run typecheck
npx expo export --platform web --output-dir dist
```

Não há simulador iOS/Android neste ambiente de CI: a usabilidade nativa (gestos, teclado, partilha do SO) fica por verificar no dispositivo. O `expo export` web confirma que o bundler fecha; não substitui um device.

## API

Cliente em `src/api/client.ts`. Rotas alinhadas a `app/main.wasp` (região Mobile API), incluindo:

- `GET /mobile/content`, `/mobile/calendar`, `/mobile/announcements`, `/mobile/formation`, `/mobile/sacraments`
- `GET /mobile/catechism`, `/mobile/directory`, `/mobile/reports`, `/mobile/birthdays`
- `GET /mobile/official-library`, `/mobile/groups`, `/mobile/team`, `/mobile/communities`
- `GET /mobile/billing`, `/mobile/catechetical-years`
- `GET /mobile/meetings/:id/attendance` (folha de chamada)
- `GET /mobile/family-invites`, `/mobile/journey-templates`, `/mobile/parishes`, `/mobile/consents`
- `POST /mobile/announcements/:id/ack`
- as rotas de auth, turmas, presença, mensagens, social e Bíblia já existentes
