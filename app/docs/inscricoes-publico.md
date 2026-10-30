# Divulgação de inscrições

Nesta fase, o link será divulgado somente em homologação. A página não recebe inscrições e não deve ser indexada.

A API pública retorna apenas título, nome da paróquia, descrição e contato públicos, estado, período, fuso, janelas com seus identificadores estáveis e nomes das etapas. Campanhas encerradas retornam apenas estado, título, paróquia e contato público. Rascunhos e campanhas indisponíveis retornam 404 uniforme. Não há dados de pessoas, vagas ou políticas internas na resposta.

O limite persistente é de 60 leituras por minuto por IP e 30 por combinação de slug e IP. O IP é resolvido pelo Express e os identificadores dos buckets são hashes. Uma falha no banco do limitador impede a leitura temporariamente. O proxy confiável deve sanitizar os cabeçalhos de encaminhamento conforme a configuração existente.

O formulário futuro deve validar honeypot no servidor e acrescentar tempo mínimo assinado com segredo de ambiente adequado e CAPTCHA conforme a avaliação dos PRs 4 e 5. O honeypot isolado não impede abuso. Não há segredo dedicado neste PR.

## Fontes e rastreamento

A página pública usa as mesmas fontes carregadas pelo restante do aplicativo. Nela ficam desligados o GTM, o Meta Pixel, os eventos de atribuição e o Sentry de navegador. Retirar a fonte externa de todo o aplicativo, se desejado, fica para uma entrega própria.
