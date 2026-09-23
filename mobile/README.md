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

No telemóvel: app **Expo Go** e o QR code. Emulador: `npm run android` ou `npm run ios`.

### Expo Go vs development build (blur)

Efeitos de desfoque (`expo-backdrop`) **não** existem no Expo Go nem na web. O app usa fallbacks (`expo-blur` / overlay escuro) para manter o mesmo fluxo sem crash.

Para testar blur nativo (folhas modais, borda de scroll na Comunidade):

```bash
cd mobile
npm install
npm run prebuild          # gera android/ e ios/ (pastas ignoradas no git)
npm run android:dev       # ou npm run ios:dev — requer SDK nativo local
```

Dependências: `expo-dev-client`, `expo-backdrop`. O plugin `expo-dev-client` está em `app.json`. Em CI/EAS, use um [development build](https://docs.expo.dev/develop/development-builds/introduction/) em vez do Go.

### EAS Build na nuvem

1. Crie um **Access Token** em [expo.dev → Access tokens](https://expo.dev/settings/access-tokens).
2. No **Cloud Agent** (ou CI), configure o secret `EXPO_TOKEN` com esse valor.
3. (Opcional) Defina `EXPO_PUBLIC_API_URL` no perfil `development` em `eas.json` ou via `eas secret:create`, para o telemóvel alcançar a API em produção/staging.
4. Na pasta `mobile`:

```bash
npm run build:dev:android
```

O script associa o projeto (`eas init`) na primeira vez e dispara um **APK** de dev client. Instale o link que a EAS envia; depois use `npm start` e abra no app instalado (não no Expo Go).

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

## API

Cliente em `src/api/client.ts`. Rotas alinhadas a `app/main.wasp` (região Mobile API), incluindo:

- `POST /mobile/auth/login|logout` e `GET /mobile/auth/session`
- `POST /mobile/auth/two-factor/verify`
- `GET /mobile/dashboard|classes|meetings|messages|documents|notifications`
- `GET /mobile/social/feed|access|topics|me|profile/:handle`
- `POST /mobile/social/posts|follow|block|share/preview`
- `GET /mobile/bible/books/:bookId/chapters/:chapter`
