# Catequese Viva — app Expo

Aplicação TypeScript para smartphone (iOS/Android/web Expo) que fala com a API Bearer `/mobile/*` do backend Wasp.

## Pré-requisitos

- Node 22
- Conta na plataforma (o login é o mesmo da web)
- Backend Wasp a correr (`cd app && wasp start`), em geral em `http://localhost:3001`

## Arranque

```bash
cd mobile
cp .env.example .env
# Ajuste se o servidor Wasp não estiver em localhost:3001
# EXPO_PUBLIC_API_URL=http://192.168.1.10:3001
npm install
npm start
```

No telemóvel: app Expo Go e o QR code. Emulador: `npm run android` ou `npm run ios`.

A sessão (Bearer) fica em `expo-secure-store`. O 2FA, quando activo na conta, pede o código TOTP antes de abrir as tabs.

## Ecrãs

| Tab / rota | Função |
| --- | --- |
| Entrar / 2FA / recuperar | Auth persistente |
| Início | Painel, encontros, notificações |
| Comunidade | Feed, tópicos, perfil `@`, seguir/bloquear, compositor |
| Turmas | Lista, detalhe, encontro, presença |
| Mensagens | Conversas e envio |
| Mais | Bíblia, documentos, perfil público, workspace, logout |

Partilhar um versículo: Bíblia → capítulo → «Partilhar na Comunidade». Publicar continua a exigir assinatura (o feed, seguir e copiar/ler são livres).

## Testes

```bash
npm test
npm run typecheck
npx expo export --platform web --output-dir dist
```

Não há simulador iOS/Android neste ambiente de CI: a usabilidade nativa (gestos, teclado, partilha do SO) fica por verificar no dispositivo. O `expo export` web confirma que o bundler fecha; não substitui um device.

## Build e publicação (EAS)

Pré-requisitos: conta Expo e o CLI (`npm i -g eas-cli`). Na primeira vez:

```bash
cd mobile
eas login
eas init            # liga o projeto e escreve extra.eas.projectId no app.json
```

Perfis definidos em `eas.json`:

| Perfil | Uso |
| --- | --- |
| `development` | dev client interno, API em localhost |
| `preview` | builds internos (APK Android) para testes |
| `production` | store builds com `autoIncrement` |

```bash
eas build --profile preview --platform android     # APK de teste
eas build --profile production --platform all      # AAB + IPA
eas submit --profile production                    # Play Store / App Store
```

Checklist de release:

1. `EXPO_PUBLIC_API_URL` a apontar para a API de produção no perfil de build.
2. Push: credenciais FCM (Android) e APNs (iOS) registadas no EAS (`eas credentials`).
3. Universal links: definir `APPLE_TEAM_ID` e `ANDROID_SHA256_CERT_FINGERPRINT` no servidor — o backend serve `/.well-known/apple-app-site-association` e `/.well-known/assetlinks.json` (404 enquanto não configurados).
4. Ícones/splash reais já estão em `assets/` (1024×1024).
5. Privacidade: `ios.privacyManifests` e textos de permissão já configurados em `app.json`; publicar a política de privacidade em https://catechis.app antes da submissão.

## API

Cliente em `src/api/client.ts`. Rotas alinhadas a `app/main.wasp` (região Mobile API), incluindo:

- `POST /mobile/auth/login|logout` e `GET /mobile/auth/session`
- `POST /mobile/auth/two-factor/verify`
- `GET /mobile/dashboard|classes|meetings|messages|documents|notifications`
- `POST /mobile/messages/conversations` e `GET /mobile/messages/contacts` (nova conversa)
- `GET /mobile/catechumens|families` e detalhes (`/catechumens/:id`, `/families/:id`)
- `GET /mobile/social/feed|access|topics|me|profile/:handle`
- `POST /mobile/social/posts|follow|block|share/preview`
- `POST /mobile/social/images|videos` e `POST /mobile/profile/avatar` (uploads multipart)
- `POST|DELETE /mobile/push-token` (Expo push notifications)
- `GET /mobile/bible/books/:bookId/chapters/:chapter`
