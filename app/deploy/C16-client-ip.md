# C-16: implantação da correção de IP

O helper usa `req.ip` resolvido pelo Express e, na ausência dele, o socket. Cabeçalhos de IP brutos não são mais usados. O Node confia em um salto do Caddy, como antes, e deve continuar acessível apenas na rede interna do compose.

Os Caddyfiles de produção e homologação passam a confiar em `CF-Connecting-IP` somente quando o peer pertence às faixas Cloudflare listadas. Encaminham um único `X-Forwarded-For` com `{client_ip}` e removem `CF-Connecting-IP` e `X-Real-IP` antes do Node. Conexões diretas ao Caddy usam o endereço do peer.

Antes de produção, revisar esta alteração de rate limit. Na VPS, durante a implantação:

1. Conferir as faixas IPv4 e IPv6 com a lista oficial da Cloudflare. A lista foi incluída sem consulta de rede neste ambiente.
2. Validar os Caddyfiles com a versão instalada (`caddy validate --config <arquivo> --adapter caddyfile`). Este ambiente não tem Caddy para validar.
3. Aplicar o Caddyfile correspondente e a versão corrigida do app na mesma janela, recarregando o Caddy. Não foi alterado nenhum arquivo da VPS por este PR.
4. Manter a porta 3001 sem publicação externa. Restringir o origin HTTP/HTTPS à Cloudflare no firewall, contemplando renovação de certificados e verificações operacionais existentes.
5. Conferir login, recuperação de senha, convite e upload público nos portais staff e família, em produção e homologação. Verificar que clientes distintos mantêm buckets distintos e que variar cabeçalhos em acesso direto autorizado não muda o bucket.

Não há mudança de permissões, telas, limites ou mensagens. O IP também alimenta convites e uploads públicos via contexto de requisição. Se apenas o app for atualizado, sem o Caddy sanitizado, visitantes podem compartilhar o IP da borda Cloudflare e receber 429 indevido. Faixas desatualizadas podem ter o mesmo efeito. Nunca publicar o Node diretamente com `trust proxy = 1`: isso permitiria falsificar `X-Forwarded-For`.

Consumidores conferidos no front: `FamilyPortalInvitesPage`, `ClassDetailPage`, `TeamPage`, `InviteAcceptPage` e `FamilySignupPage`. As operações mantêm assinaturas, DTOs e autorizações. Login e demais consumidores recebem a mesma política de IP, sem distinção por papel. Por isso os controles positivos deste achado verificam endereços legítimos, não permissões de entidades.
