# Permissões de inscrições

A flag de servidor `REGISTRATIONS_ENABLED=true` habilita os convites aos papéis novos e as operações de delegação. O padrão é desligado. Pároco e secretaria não recebem acesso geral a turmas, famílias ou documentos existentes.

A matriz detalhada está em `src/shared/registrationPermissions.ts`. S permite no escopo, D exige concessão ativa, R exige política de leitura restrita e P exige política de dados próprios. N nega. R e P não autorizam operações gerais. O coordenador paroquial e o pároco podem aprovar, publicar e ultrapassar capacidade; a secretaria precisa de delegação para essas ações. O coordenador de comunidade atua apenas na sua comunidade. A diocese consulta indicadores agregados e auditoria da própria diocese; outras ações dependem da matriz e de delegação.

Concessões são vinculadas ao vínculo ativo e registradas com responsável, data, motivo e revogação. A concessão e a revogação geram registro de auditoria. As próximas operações devem obter a paróquia da campanha persistida e aplicar filtros específicos para R e P.

| Ação | Coordenação paroquial | Pároco | Secretaria | Coordenação de comunidade | Catequista | Responsável ou adulto | Diocese |
|---|---|---|---|---|---|---|---|
| CONFIGURE_CAMPAIGN | S | S | D | D | N | N | D |
| OPEN_CLOSE_PERIOD | S | S | D | D | N | N | D |
| SHARE_LINK | S | S | S | S | S | S | S |
| REVIEW_REGISTRATION | S | D | S | D | N | P | D |
| VERIFY_DOCUMENTS | S | D | S | D | N | P | D |
| APPROVE_ENROLLMENT | S | S | D | D | N | N | D |
| CONFIGURE_ROOMS | S | S | D | D | P | N | D |
| EDIT_PREVIEW | S | D | D | D | N | N | D |
| PUBLISH_CLASSES | S | S | D | D | N | N | D |
| OVERRIDE_CAPACITY | S | S | D | D | N | N | N |
| TRANSFER_OR_CANCEL | S | S | D | D | N | P | D |
| VIEW_IDENTIFIABLE_DATA | S | R | S | R | R | P | D |
| VIEW_SENSITIVE_FILES | S | D | S | D | N | P | D |
| VIEW_AGGREGATE_REPORTS | S | S | S | R | R | P | S |
| EXPORT_DATA | S | D | D | D | N | P | D |
| VIEW_AUDIT | S | S | R | R | N | N | S |
| MANAGE_ROLES_AND_GRANTS | S | S | N | N | N | N | S |

Os dois papéis de catequista compartilham a coluna de catequista; GUARDIAN e CATECHUMEN compartilham a coluna de responsável ou adulto. PASTORAL_VIEWER, CONTENT_REVIEWER, PERSONAL_OWNER e papéis desconhecidos recebem N em todas as ações. SUPER_ADMIN possui acesso técnico excepcional.

## Campanhas e ofertas

A API permite preparar campanhas em rascunho, vinculadas a uma paróquia e a um ano catequético. Cada oferta corresponde a uma etapa desse ano. A criação e a abertura exigem plano institucional ativo; consulta e fechamento continuam disponíveis após a perda do plano. A interface de administração fica para uma entrega posterior.

A campanha passa de rascunho para aberta e depois fechada. Uma campanha fechada pode ser reaberta antes da organização ou arquivada. Os estados de organização e publicação ficam reservados para entregas futuras. A abertura exige ao menos uma oferta e uma janela válida.

As janelas têm identificador estável, dia da semana, início, fim e rótulo. Após a abertura não é possível removê-las nem mudar a data de corte da idade, para preservar o significado das futuras preferências e da elegibilidade. A data de corte é configurada pela paróquia; em ano não bissexto, o aniversário de quem nasceu em 29 de fevereiro é considerado em 28 de fevereiro.

A política de vaga pode ser reserva ou oferta. O prazo padrão de resposta é de sete dias e a ação padrão em caso de ausência de resposta é avisar a coordenação. Essas configurações serão aplicadas na futura publicação de turmas.
