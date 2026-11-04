# Salas e disponibilidade

Salas pertencem à paróquia e podem pertencer a uma comunidade. O nome é único na paróquia após normalização de espaços, maiúsculas e acentos. Inativar uma sala preserva as associações às turmas e gera aviso. A capacidade efetiva é o menor limite entre a turma e a sala; somente matrículas ENROLLED vinculadas a catequizandos ocupam vagas. Catequistas não ocupam vagas. Reduzir a capacidade abaixo da ocupação é permitido e identifica as turmas excedentes.

Coordenador paroquial e pároco configuram salas; secretaria e coordenador de comunidade precisam de delegação. O coordenador de comunidade atua na própria comunidade e pode consultar salas paroquiais. Catequistas podem consultar salas e declarar a própria disponibilidade. Exceder capacidade requer permissão OVERRIDE_CAPACITY e motivo de 10 a 500 caracteres; a futura interface deve orientar a não incluir dados pessoais no motivo. Conflitos de horário não podem ser ultrapassados.

A disponibilidade usa JSON estrito: `{"version":1,"windows":[{"weekday":0,"startTime":"08:00","endTime":"09:00"}],"closures":[{"from":"2026-01-01","to":"2026-01-02","reason":"Manutenção"}]}`. Dias da semana vão de 0 (domingo) a 6 (sábado); horários são HH:mm entre 05:00 e 23:59. Janelas não podem se sobrepor. Fechamentos usam datas civis inclusivas e o motivo é opcional. Sala sem janelas está livre; catequista sem janelas está indisponível. Janela de sala incompatível bloqueia, enquanto fechamento e indisponibilidade do catequista geram avisos.

Este passo não cria turmas, matrículas ou alocações, nem altera calendário, notificações ou cobrança. A flag REGISTRATIONS_ENABLED permanece desligada por padrão.

## Telas

Em `/app/salas`, pessoas autorizadas consultam salas, ocupação e conflitos do ano. Quem tem permissão para configurar salas pode criá-las, editá-las, ativá-las e atribuí-las às turmas dentro do seu escopo. A tela mostra se a pessoa pode autorizar um encaixe acima da capacidade, que exigirá motivo na etapa posterior.

Em `/app/disponibilidade`, catequistas consultam e editam seus próprios horários. Pessoas com permissão para configurar salas podem consultar a equipe e editar a disponibilidade de cada integrante no seu escopo. Uma disponibilidade sem horários significa indisponibilidade. As rotas exigem autenticação e as operações verificam a flag, o plano e as permissões no servidor.
