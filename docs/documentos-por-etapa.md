# Documentos por etapa

Implementação da decisão de 29/10/2026. Documentos geram avisos e nunca bloqueiam conclusão. Nenhum código de conclusão de marcos ou etapas foi alterado.

## Arquivos e comportamento

| Arquivo em `app/` | Mudança |
| --- | --- |
| `schema.prisma` e `migrations/20261029120000_add_document_stage_rules_and_sponsors/migration.sql` | Estrutura aditiva descrita abaixo. SQL gerado com Prisma migrate diff offline contra `origin/main:app/schema.prisma`, sem aplicação ao banco. |
| `src/shared/documents/requirements.ts` | Tabela aprovada de 42 células, inferência por nome, idade na data de referência, união das matrículas ENROLLED, precedência e pendências reais. PENDING e VERIFIED são entregues; REJECTED exige reenvio se obrigatório. |
| `src/server/documents/requirements.ts` | Carregamento em lote e isolamento das sobrescritas por paróquia e diocese de cada pessoa. |
| `src/server/operations/documentStageOperations.ts` e `main.wasp` | Consultas e actions autorizadas. Configuração com histórico transacional, restauração de célula e padrinhos com autorização de workspace, perfil e auditoria. Histórico mostra as últimas 100 mudanças, inclusive as herdadas da diocese. |
| `src/server/validation.ts` e `src/server/operations/classOperations.ts` | Validação e persistência de etapa explícita ou automática. |
| `src/server/operations/catechumenOperations.ts` | Detalhe acrescenta padrinhos e requisitos calculados, preservando o DTO documental. |
| `src/server/operations/guardianOperations.ts` | Contagem de pendências reais no fluxo legado de responsável. |
| `src/server/operations/institutionalDashboardOperations.ts` | Indicador documental usa pendências reais. Alertas de marcos sacramentais continuam sendo alertas de marcos. |
| `src/server/api/mobile.ts` | Preserva resposta em array, aceita workspaceId e acrescenta requirement e missingDocumentTypes aos documentos retornados. |
| `src/catequese/pages/DocumentsPage.tsx` | Documentos aplicáveis, indicador de pendências reais, histórico de todos os envios e acesso à configuração. Mesma regra para equipe, responsável e catequizando. |
| `src/catequese/pages/CatechumenDetailPage.tsx` e `src/catequese/components/CatechumenSponsors.tsx` | Padrinho e madrinha, outra paróquia, avisos de pendências e tipos aplicáveis. Envios existentes permanecem visíveis. |
| `src/catequese/pages/CreateClassPage.tsx`, `ClassDetailPage.tsx` e `src/catequese/components/DocumentStageSelect.tsx` | Seleção opcional da etapa documental, com opção automática. |
| `src/catequese/components/DocumentRulesPanel.tsx` | Matriz editável, herança, restauração e histórico com autor, data, escopo e valores. |
| `src/i18n/locales/{pt-BR,en,es}/common.json` e bundles `resources_*.ts` correspondentes | Textos sincronizados nos três idiomas. |
| `package.json` e quatro testes abaixo | Registro no script test:unit. |

## Estrutura criada, lista exata

- Coluna nullable: `CatechesisClass.documentStageKind`.
- Enum `DocumentStageKind`: PRE_CATECHESIS, BAPTISM_CHILD, FIRST_EUCHARIST, CONFIRMATION_TEEN, RICA_ADULT, CONFIRMATION_ADULT, PERSEVERANCE.
- Enum `DocumentRequirement`: REQUIRED, OPTIONAL, NOT_APPLICABLE.
- Enum `DocumentRuleScope`: PARISH, DIOCESE.
- Enum `SponsorRole`: PADRINHO, MADRINHA.
- Tabela `CatechumenSponsor`: id, catechumenProfileId, role, name, fromOtherParish, parishName, createdAt, updatedAt. Unique em catechumenProfileId + role, FK com Cascade para o perfil.
- Tabela `DocumentStageRule`: id, scope, parishId, dioceseId, stageKind, documentType, requirement, changedById, changedAt. Unique por parishId + stageKind + documentType e por dioceseId + stageKind + documentType.
- Tabela `DocumentStageRuleChange`: id, scope, parishId, dioceseId, stageKind, documentType, previousValue, newValue, changedById, changedAt. Índices por parishId + changedAt e dioceseId + changedAt.

`CatechumenProfile.sponsors` é uma relação inversa no Prisma, sem coluna SQL adicional. Não há backfill, alteração de registros existentes ou exclusão de documentos. Restaurar uma célula remove somente sua sobrescrita e registra histórico.

## Interpretação das turmas existentes em produção

Todas começam com documentStageKind nulo. Nesse caso, a resolução usa o nome do sacramento e da etapa, sem acentos e sem distinguir maiúsculas. Não usa o nome livre da própria turma. A prioridade é:

1. Perseverança ou pós-sacramento: PERSEVERANCE.
2. RICA, catecumenato ou adulto, sem referência a crisma/confirmação: RICA_ADULT.
3. Crisma ou confirmação: CONFIRMATION_ADULT com 18 anos ou mais, CONFIRMATION_TEEN nos demais casos.
4. Batismo: RICA_ADULT com 18 anos ou mais, BAPTISM_CHILD nos demais casos.
5. Eucaristia ou primeira comunhão: FIRST_EUCHARIST.
6. Pré-catequese, iniciação ou infantil: PRE_CATECHESIS.
7. Sem correspondência: nenhum documento obrigatório.

A inferência automática é por pessoa. Uma turma com menores e adultos pode resolver etapas diferentes. O coordenador pode selecionar explicitamente uma das sete etapas na edição da turma para eliminar ambiguidades. Apenas matrículas ENROLLED entram na união de exigências; sem matrícula ativa não há pendências. Idade desconhecida nunca gera cobrança do termo. Sem padrinho de outra paróquia a carta pastoral nunca gera pendência. A data de referência das etapas em andamento é hoje.

Para conferir sem expor alunos, revise os nomes de etapa e sacramento nas turmas e o campo Etapa de documentos. Nenhum dado pessoal foi exportado para este relatório.

## Validação e limites

- `documentRequirements.test.ts`: tabela completa, aniversário de 18 anos, precedência, carta pastoral, documentos reutilizados/rejeitados, matrículas e inferência.
- `documentStageOperations.test.ts`: validação, autorização, histórico de cada mudança e restauração, leitura do histórico com autor e isolamento das regras.
- `documentStageAuthorization.test.ts`: helpers reais com mocks de context.entities, acesso entre paróquias, papéis mistos, visualizador e catequista com ou sem turma atribuída.
- `documentRequirementsCompletion.test.ts`: conclusão real de marco com documentos faltantes sem consultar documentos/regras; validação de etapa explícita e automática.
- Rodada focada com os quatro arquivos novos e seis relacionados existentes: 87 testes passaram. Os quatro novos arquivos somam 50 testes.
- `npm run test:unit`: 181 arquivos, 1.401 testes passaram.
- `npm run i18n:check`: passou para 43 namespaces e três idiomas.
- `npx tsc --noEmit -p .`: falhou somente nos quatro novos exports ausentes do SDK Wasp ainda não regenerado. Wasp compile não foi executado, conforme solicitado.
- `git diff --check`: passou.

Sem teste de navegador ou aplicação da migration neste ambiente. Os principais riscos são nomes ambíguos na inferência e integração com o SDK após o compile do Wasp. A etapa explícita permite corrigir a classificação sem alterar nomes ou dados existentes.

Cotas, turmas concluídas no cálculo de limites, planos, preços, Stripe, termos e versão de consentimento ficaram fora do escopo e não foram alterados. dashboardOperations e InstitutionalDashboard não calculavam outra contagem documental a substituir. O export LGPD existente enumera apenas dados da conta e não inclui perfis nem dados de terceiros; esse contrato foi preservado. A exclusão existente de perfil trata os padrinhos pela nova FK Cascade, sem criar nova operação de exclusão. Não foram corrigidos achados de segurança externos a esta funcionalidade.

O git add foi tentado e negado: os metadados em `/workspace/catechis/analise-codex-28-10/repo/.git/worktrees/wt-feat-documents-by-stage` estão em filesystem somente leitura. Portanto não foi possível criar commits. Não houve push nem abertura de PR. O node_modules não rastreado já existia antes do trabalho e não foi alterado ou adicionado.
