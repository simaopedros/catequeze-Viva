# Submissão pública de inscrições

`GET /api/public/inscricoes/:slug/form-token` retorna `{ formToken }` para campanha aberta dentro do período e com plano e flag habilitados. O token assinado deve ser usado após oito segundos e em até duas horas. A resposta não é armazenável em cache.

`POST /api/public/inscricoes/:slug/submissions` recebe JSON de até 64 KB, com `requestKey` UUID, `mode` (`FAMILY` ou `ADULT`), contato opcional, consentimento, `formToken`, `captchaToken` e os inscritos com oferta e janelas. A resposta 201 contém somente `protocol`, `status` e `emailConfirmationRequired`. A mesma chave e conteúdo retornam o mesmo protocolo; conteúdo diferente retorna 409. Campanhas indisponíveis retornam 404 uniforme. Erros de validação retornam 400, limitação retorna 429 e dependência indisponível retorna 503.

As defesas incluem restrição de método e tipo de conteúdo, limite do corpo, verificação da campanha e do plano, limites persistentes por IP e campanha, honeypot, token assinado com tempo mínimo e limite por token, CAPTCHA, validação de opções e limite por contato. Os limites falham fechados. O endereço IP considerado é o resolvido pelo servidor, sem leitura direta de cabeçalhos encaminhados. O teto por IP é 200 envios por minuto e por campanha e IP é 100 por minuto. O limite por token é 10 por hora e por contato e campanha é 3 por hora.

Com e-mail, a inscrição fica `PENDING_EMAIL` e um link de confirmação é enfileirado após a transação. Sem e-mail, fica `RECEIVED`. A outbox contém o link até a entrega e deve receber a mesma proteção de acesso e retenção aplicada aos demais dados sensíveis. O link leva o token no fragmento da URL.

Variáveis de ambiente: `REGISTRATIONS_ENABLED`, `LIFECYCLE_EMAIL_SECRET`, `JWT_SECRET`, `MAINTENANCE_SECRET`, `TURNSTILE_SECRET_KEY`, `WASP_WEB_CLIENT_URL`, `EMAIL_PROVIDER`.

`POST /api/public/inscricoes/confirm` recebe `{ token }` em JSON de até 4 KB. O token resolve a campanha e é consumido uma única vez; a inscrição passa a `RECEIVED`, o contato é verificado e a retenção passa a 180 dias após o encerramento da campanha. A resposta contém `status: "confirmed"` e `protocol`. Links inválidos, expirados, revogados, já usados ou de campanha indisponível recebem a mesma resposta 400. O limite por IP falha fechado. Os slugs `confirm` e `confirmar` são reservados.

`POST /api/public/inscricoes/:slug/resend-confirmation` recebe `{ protocol, email }` em JSON de até 4 KB. Retorna 202 com `status: "accepted"` para solicitações existentes, inexistentes, já confirmadas ou limitadas por contato. Limites por IP e campanha e IP retornam 429 ou 503. O limite por contato e campanha é compartilhado com o envio inicial, totalizando três por hora. Um reenvio elegível revoga os tokens ativos anteriores e cria outro com validade de 24 horas. Não exige CAPTCHA.

O token de confirmação é armazenado somente como hash na tabela de credenciais. O payload da outbox contém o link com token até a entrega ou purga. Ainda não há mecanismo de limpeza desse payload após o envio: é necessário implementar a limpeza ou expurgo de `EmailMessage.payload` para essas mensagens. A confirmação pode enfileirar um recibo sem dados dos inscritos. A falha de enfileiramento não desfaz a confirmação.

O formulário público é aberto somente em campanhas abertas e busca o token de formulário ao abrir. Ele oferece inscrição familiar ou de adulto, contato opcional, preferências ordenadas entre as janelas divulgadas e consentimento `registration-consent-v1`. Os dados permanecem apenas na memória da página. O cliente usa `REACT_APP_TURNSTILE_SITE_KEY` como chave pública do Turnstile e carrega o script do provedor somente após a abertura do formulário. Sem essa variável, o envio fica indisponível. A confirmação remove o token do fragmento da URL antes de enviá-lo ao servidor.

A conferência pela equipe, conversão em cadastro e matrícula, documentos e acesso privado ficam para os próximos PRs. A limpeza do payload da outbox mencionada acima também permanece pendente.
