# Catechis 2.0 (v2)

Esqueleto da Fase 2 (DEM-20261111-01, plano A2-fase2). Sem código de negócio ainda.

## Contrato de convivência com o legado

- O legado (Wasp, `app/`) fica onde está e a `main` segue recebendo correções normais.
- Nada em `v2/` importa código de `app/`, e nada em `app/` importa `v2/`.
- `poc/v2-etl/` (PR #245, rascunho) não é movido aqui; as migrations nascem dele em tarefa própria (T2).
- Workflows do legado ignoram mudanças só em `v2/**` (`paths-ignore`). O `v2-ci.yml` só roda quando `v2/**` muda.
- `v2-deploy-homolog.yml` é manual e só para homologação. Não existe deploy de produção do v2 nesta fase.
- Único ponto de contato no legado: o guard de escrita por paróquia (T9), por PR normal na `main`.
- Segredos, Neon de homologação, DNS e produção dependem de ok explícito do Simão.

## Pastas

- `db/`: migrations SQL
- `etl/`: importação legado para v2
- `auth/`: login em Node
- `api/`: Worker da API
- `web/`: front do app
