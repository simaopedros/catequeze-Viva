# Auditoria de potencial viral — Catequese Viva

Data da análise: 30 de junho de 2026  
Domínio de produção: `https://catechis.app`

## 1. Resumo executivo

A Catequese Viva já possui uma base comercial funcional: landing pages segmentadas, demonstrações visuais, preços públicos, checkout, convites e um produto que naturalmente conecta catequistas, coordenação e famílias. Entretanto, a aquisição atual é orientada ao plano gratuito e comunica várias capacidades com o mesmo peso. Isso reduz a clareza da promessa principal e dificulta descobrir qual mensagem realmente converte.

Os maiores ganhos não dependem de remover funcionalidades. Eles vêm de:

1. instrumentar o funil antes de alterar preços ou acesso;
2. escolher uma promessa principal mensurável;
3. unificar o CTA e demonstrar o produto antes do cadastro;
4. substituir prova social genérica por evidência verificável;
5. testar a retirada do plano gratuito somente para novos usuários;
6. transformar convites e resultados produzidos pelo sistema em ciclos de distribuição.

O princípio “não ter plano gratuito” não deve ser aplicado isoladamente. O plano gratuito está incorporado ao cadastro, onboarding, limites, créditos de IA, fallback de autorização e billing institucional. Sua retirada imediata teria alto risco e não há telemetria de conversão suficiente para demonstrar que ela aumentaria receita.

## 2. Evidências do estado atual

### Oferta e monetização

- `src/shared/pricing.ts` define seis opções vendáveis: um plano gratuito e cinco pagos (`catechist_pro`, `catechist_ai`, `parish_essential`, `parish_complete` e `diocese`).
- O plano gratuito oferece 1 turma, 15 catequizandos, presença, calendário e 3 créditos iniciais de IA.
- `src/landing-page/components/PricingPreviewSection.tsx` reduz a apresentação inicial a três cartões, mas `src/catequese/pages/PricingPage.tsx` volta a mostrar os seis planos em dois grupos.
- Existem preços mensais e anuais. Esse modelo é coerente com custos recorrentes de IA, infraestrutura e suporte; pagamento único não é recomendado nesta etapa.
- `docs/billing-rules.md` registra fallback gratuito, trial institucional de 30 dias e regras de acesso já consolidadas.

### Landing pages e conversão

- Há quatro landings: geral, gestão, IA e presença, configuradas em `main.wasp`.
- O hero geral em `src/landing-page/components/HeroSection.tsx` mostra o produto, mas oferece dois CTAs: criar conta e consultar o plano de IA.
- A copy de `src/i18n/locales/pt-BR/landing.json` enfatiza “grátis”, “sem cartão” e “decida depois”, condicionando a aquisição à gratuidade.
- O cadastro em `src/auth/CustomSignupForm.tsx` solicita e-mail, senha, confirmação e aceite antes de o usuário experimentar um fluxo real.
- A landing usa mockups do produto, mas não uma demonstração manipulável ou um resultado gerado sem cadastro.
- `src/catequese/PublicNavbar.tsx` expõe recursos, sobre, preços, contato, login e cadastro. A quantidade é aceitável para navegação, mas compete com a proposta de um único próximo passo comercial.

### Confiança, compartilhamento e distribuição

- Existe `TestimonialsSection.tsx`, mas ela não é renderizada pela landing principal.
- Os depoimentos existentes usam nomes e cargos sem fotografia, paróquia, cidade, vídeo ou fonte verificável.
- `src/catequese/PublicFooter.tsx` é estritamente institucional; não oferece motivo ou mecanismo para compartilhar.
- Não foi encontrado compartilhamento nativo (`navigator.share`) nem convite de indicação voltado à aquisição. Os convites existentes são operacionais, destinados a membros e famílias.
- O produto possui potencial de rede: coordenadores convidam catequistas, catequistas conectam famílias e dioceses agregam paróquias. Hoje esse ciclo é tratado como administração, não como aquisição mensurada.

### Metadados e medição

- `main.wasp` usa corretamente `catechis.app` em `og:url`, `og:image` e e-mails.
- `og-image.webp` é referenciada como imagem 1200×630, mas não está presente em `app/public`. É necessário confirmar que o deploy a fornece e avaliar visualmente sua capacidade de gerar clique.
- Existem integrações de Himetrica, Plausible e Google Analytics, porém não foram encontrados eventos explícitos para visualização de preço, seleção de plano, início de checkout, compra, ativação, convite ou compartilhamento.
- O painel administrativo informa que parte dos analytics será reativada após configuração de domínio. Assim, decisões de monetização ainda não têm base observável suficiente.

## 3. Matriz dos 32 princípios

Legenda: **Atendido**, **Parcial**, **Não atendido** ou **Não recomendado**.

| # | Princípio | Estado | Evidência e recomendação |
|---:|---|---|---|
| 1 | Não possui plano gratuito | Não atendido | `pricing.ts` e toda a copy promovem `catechist_free`. Testar acesso temporário para novos cadastros antes de remover; preservar usuários atuais. |
| 2 | Usa apenas três cores | Parcial | Há tokens de marca e CTA primário consistente, mas gradientes, accent, success, amber e cores semânticas ampliam a paleta. Reduzir cores nas páginas comerciais, sem impor a regra à aplicação operacional. |
| 3 | Usa números em vez de adjetivos | Parcial | Limites e créditos são numéricos, mas benefícios como “facilita”, “em segundos” e “controle total” não têm prova. Medir tempo poupado, preparação e acompanhamento antes de publicar claims. |
| 4 | Termina com rodapé compartilhável | Não atendido | O rodapé contém apenas marca e links legais. Encerrar com uma frase memorável e ação de compartilhar demonstração ou diagnóstico. |
| 5 | Trata a imagem OG como thumbnail | Parcial | Os metadados existem em `main.wasp`; o ativo não está no repositório. Confirmar o deploy e testar thumbnail com promessa curta, tela do produto e contraste forte. |
| 6 | Uma ideia por tela | Parcial | As seções são separadas, mas a landing geral acumula IA, presença, biblioteca, família, dashboard e sacramentos. Cada landing segmentada deve defender uma transformação principal. |
| 7 | Headline compreensível por criança | Atendido | “Organize sua turma e prepare a catequese sem depender de papel e improviso” é concreta e simples. Pode ser encurtada para ganhar memorização. |
| 8 | Possui hard paywall | Não atendido | Cadastro e uso gratuito precedem pagamento. Não aplicar imediatamente; testar checkout antes do onboarding apenas em uma coorte nova e com demonstração pública anterior. |
| 9 | Copy exclusiva do produto | Parcial | Termos como catequese, encontro, catequizandos e pastoral são específicos; “plataforma completa” e “controle total” são genéricos. Usar situações reais coletadas de catequistas. |
| 10 | Mostra antes de explicar | Parcial | O hero mostra um mockup do gerador, mas não permite interação. Criar demo guiada que gere ou revele um encontro de exemplo sem conta. |
| 11 | Faz uma coisa | Não atendido | A oferta apresenta gestão, IA, presença, comunicação, documentos e sacramentos com peso semelhante. Posicionar como “preparar e acompanhar a catequese” e tratar recursos como meios. |
| 12 | Popcorn pricing com três escolhas | Parcial | A landing resume três opções, porém `/pricing` mostra seis. Apresentar três caminhos de compra e deixar variações institucionais para comparação secundária ou contato comercial. |
| 13 | Aproveita uma onda | Atendido | IA aplicada a uma rotina pastoral real é a onda mais defensável. Evitar vender “IA” isoladamente; ligar a tendência ao tempo poupado e à segurança teológica. |
| 14 | Usa a linguagem dos clientes | Não comprovado | Não há fonte dos textos nem repositório de entrevistas. Entrevistar clientes e registrar frases, objeções e resultados antes de reescrever claims. |
| 15 | Mostra fundador visível e audível | Não atendido | Não foi encontrada presença do fundador nas landings. Testar vídeo curto demonstrando uma preparação real, se houver fundador ou especialista pastoral adequado. |
| 16 | Preço impossível de ignorar | Atendido | “Preços” aparece na navbar, há seção na landing e rota própria. Melhorar a clareza da escolha, não a visibilidade. |
| 17 | Headline memorável no dia seguinte | Não comprovado | A headline é clara, mas longa e não há teste de recordação. Testar versões curtas com usuários e medir lembrança após 24 horas. |
| 18 | Headline emocional | Parcial | “Papel e improviso” expressa dor, mas não uma emoção forte ou aspiração. Testar tranquilidade, segurança pastoral e tempo devolvido sem sensacionalismo. |
| 19 | Faz algo nunca visto | Parcial | IA com base teológica, gestão sacramental e família integrada formam uma combinação diferenciada. Demonstrar essa singularidade visualmente e comprovar as fontes. |
| 20 | Pode ser vendido somente pelo hero | Parcial | O hero explica público e dor, mostra produto e CTA, mas não informa preço nem resultado mensurável. Incluir transformação, prova curta e próximo passo único. |
| 21 | Demonstra empatia antes de vender | Atendido | `PainPointsSection` descreve papel, planilhas, faltas e mensagens dispersas antes da oferta detalhada. Tornar a linguagem baseada em relatos reais. |
| 22 | Possui um único CTA | Não atendido | Hero, navbar e seções alternam cadastro grátis, plano de IA, planos, login e recursos. Definir um CTA comercial principal por landing; login permanece utilitário. |
| 23 | Possui nome memorável | Atendido | “Catequese Viva” usa palavras conhecidas e comunica o domínio. Manter; não há benefício evidente em renomear. |
| 24 | Vende desejo humano, não funcionalidade | Parcial | A copy vende organização e menos improviso, mas listas extensas dominam a página. Priorizar tempo, tranquilidade, cuidado com famílias e segurança na preparação. |
| 25 | Permite experimentar antes de comprar | Parcial | O plano gratuito permite uso, mas exige cadastro; o princípio conflita com o hard paywall. Substituir gratuidade permanente por demo pública e, se validado, teste temporário. |
| 26 | Evita palavras fracas | Parcial | A copy contém expressões vagas como “principais fluxos”, “quando fizer sentido” e “estrutura pronta”. Trocar por fatos demonstráveis e remover absolutos não comprovados. |
| 27 | Não usa assinatura | Não recomendado | O serviço tem IA, hospedagem, suporte e operação contínuos. Manter mensal/anual; avaliar pagamento único apenas para produto fechado ou serviço de implantação separado. |
| 28 | CTA explica o que acontece depois | Não atendido | “Criar conta grátis” descreve a ação técnica, não o resultado; “Começar agora” é ainda mais vago. Usar “Montar minha primeira turma” ou “Gerar meu encontro de exemplo”, conforme o fluxo. |
| 29 | Não lança sem depoimentos | Parcial | Há depoimentos em dados e componente, mas a landing principal não os renderiza e a verificabilidade é baixa. Publicar apenas depoimentos autorizados com contexto real. |
| 30 | Pode ser descrito em menos de 10 palavras | Parcial | A mensagem atual exige duas linhas. Candidato para teste: “Prepare encontros e acompanhe sua catequese em um só lugar” (10 palavras). |
| 31 | Compara-se com concorrentes | Não atendido | Não há comparação. Comparar com o processo atual — papel + planilha + WhatsApp — antes de citar concorrentes nominais sem pesquisa de mercado. |
| 32 | É mais caro que os concorrentes | Não comprovado | Não há benchmark de preço no repositório. Não aumentar preço por princípio; pesquisar alternativas e testar disposição a pagar por segmento. |

### Resultado agregado

- Atendidos: 5
- Parciais: 15
- Não atendidos: 8
- Não comprovados: 3
- Não recomendado: 1

Para priorização, “não comprovado” indica que não se deve alterar o produto antes de coletar dados.

## 4. Recomendações priorizadas

Escalas: impacto e confiança de 1 a 5; esforço de 1 a 5, em que 5 é mais caro; risco baixo, médio ou alto.

| Prioridade | Recomendação | Impacto | Confiança | Esforço | Risco | Ganho esperado |
|---:|---|---:|---:|---:|---|---|
| P0 | Instrumentar o funil comercial ponta a ponta | 5 | 5 | 2 | Baixo | Permitir decisões de aquisição e monetização baseadas em comportamento real. |
| P0 | Definir promessa e CTA únicos por landing | 5 | 4 | 2 | Baixo | Melhorar compreensão, cliques qualificados e atribuição por intenção. |
| P0 | Tornar a prova social verificável e visível | 4 | 4 | 2 | Baixo | Reduzir risco percebido para catequistas e instituições. |
| P1 | Criar demonstração pública guiada | 5 | 4 | 4 | Médio | Entregar valor antes do cadastro sem manter uso gratuito permanente. |
| P1 | Simplificar a apresentação comercial em três caminhos | 4 | 4 | 3 | Médio | Reduzir carga de decisão sem remover planos ou direitos existentes. |
| P1 | Reescrever copy com resultados medidos e voz de clientes | 4 | 3 | 3 | Baixo | Aumentar diferenciação, credibilidade e memorização. |
| P1 | Auditar e testar imagem OG e encerramento compartilhável | 3 | 4 | 2 | Baixo | Melhorar clique e distribuição em WhatsApp e redes sociais. |
| P2 | Medir convites como ciclo de aquisição | 4 | 3 | 3 | Médio | Transformar colaboração natural em crescimento composto. |
| P2 | Testar trial/hard paywall para novos usuários | 5 | 2 | 5 | Alto | Aumentar receita por visitante, com risco de reduzir ativação. |
| P3 | Comparar com o processo manual e pesquisar preços | 3 | 3 | 2 | Baixo | Sustentar posicionamento e preço sem afirmações especulativas. |

## 5. Mudanças de comunicação recomendadas

Estas mudanças não alteram capacidades ou direitos do produto:

- Escolher uma promessa principal por página: geral, IA, presença e gestão.
- Manter um único CTA comercial destacado em cada landing; login continua disponível visualmente como ação secundária.
- Levar o visitante do CTA diretamente à experiência prometida, em vez de usar “Começar agora”.
- Substituir listas de recursos por uma sequência: problema real → demonstração → resultado → prova → preço.
- Inserir depoimentos autorizados com nome, função, paróquia/diocese, localidade e, quando possível, fotografia ou vídeo.
- Mostrar números apenas depois de medi-los. Não inventar economia de tempo, conversão ou satisfação.
- Apresentar comparação com “papel + planilha + WhatsApp” usando critérios objetivos: preparação, presença, histórico, documentos e acesso das famílias.
- Confirmar a renderização pública de `https://catechis.app/og-image.webp` e avaliar a imagem em miniatura de WhatsApp, Facebook, LinkedIn e X.

## 6. Mudanças comerciais sujeitas a experimento

### Simplificação de escolha

Manter os planos internos existentes, mas apresentar inicialmente três caminhos:

1. **Catequista** — escolha recomendada entre Pro e IA após uma pergunta sobre uso de IA;
2. **Paróquia** — escolha entre Essencial e Completa após tamanho/equipe;
3. **Diocese** — contato ou checkout dedicado.

Isso reduz a carga cognitiva sem migrar assinaturas, apagar planos ou alterar limites.

### Alternativas ao gratuito permanente

Testar em coortes de novos visitantes, nesta ordem:

1. controle: plano gratuito atual;
2. demonstração pública + trial com prazo, sem cartão;
3. demonstração pública + trial com cartão e cobrança posterior;
4. demonstração pública + pagamento antes do onboarding.

O teste deve excluir usuários existentes, convidados de famílias e membros cobertos por licenças institucionais. O vencedor deve ser escolhido por receita líquida e ativação, não apenas por cadastros.

### Grandfathering

- Usuários existentes conservam `catechist_free` e seus limites.
- Convites institucionais continuam funcionando sem compra pessoal.
- Famílias e catequizandos convidados não entram no paywall comercial.
- Novas políticas recebem versão própria, como já ocorre com `PRICING_VERSION`.
- Downgrade, cancelamento, inadimplência e trials expirados mantêm regras explícitas antes de qualquer rollout.

## 7. Instrumentação mínima do funil

Eventos recomendados, independentes do provedor de analytics:

| Evento | Quando ocorre | Propriedades mínimas |
|---|---|---|
| `landing_viewed` | Entrada em qualquer landing | variante, locale, origem, campanha |
| `primary_cta_clicked` | Clique no CTA principal | landing, texto, destino, variante |
| `demo_started` | Início da demonstração | tipo de demo, origem |
| `demo_completed` | Resultado útil exibido | tipo, duração, conclusão |
| `pricing_viewed` | Seção ou página de preço visível | origem, locale, intervalo |
| `plan_selected` | Escolha de plano | plano, nível, intervalo, variante |
| `signup_started` | Primeira interação com cadastro | método, plano pretendido |
| `signup_completed` | Conta criada/verificada | método, plano pretendido |
| `checkout_started` | Sessão de pagamento iniciada | plano, intervalo, moeda, provedor |
| `purchase_completed` | Webhook confirma pagamento | plano, valor, moeda, provedor |
| `activation_completed` | Primeiro valor entregue | tipo: turma, chamada ou geração de IA |
| `invite_sent` | Convite enviado | papel, workspace, canal |
| `invite_accepted` | Convite aceito | papel, workspace, tempo até aceite |
| `share_clicked` | Ação de compartilhamento | conteúdo, canal, localização |

Funis principais:

1. visita → preço → seleção → checkout → pagamento;
2. visita → demo → cadastro → ativação;
3. ativação → convite enviado → convite aceito;
4. conteúdo compartilhado → nova visita → cadastro/pagamento.

Métricas de decisão: receita líquida por 1.000 visitantes, conversão em pagamento, ativação em 7 dias, retenção em 30/90 dias, custo de IA por usuário, reembolso, suporte por conta, convites por workspace e taxa de aceite.

## 8. Sequência de experimentos

### Fase 0 — Linha de base (2–4 semanas)

- Implementar os eventos do funil e validar deduplicação entre cliente e webhooks.
- Criar dashboard por landing, origem, locale, plano e dispositivo.
- Definir ativação: primeira turma configurada e primeira chamada ou conteúdo de IA concluído.
- Não alterar preço nem acesso durante a coleta da linha de base.

Critério de saída: pelo menos um ciclo completo de aquisição e volume suficiente para observar cada etapa sem eventos ausentes.

### Fase 1 — Clareza comercial

- Testar uma promessa e um CTA únicos em cada landing.
- Colocar demonstração e prova social antes da grade de recursos.
- Expor três caminhos de compra, mantendo todos os planos no backend.
- Validar as três traduções e rastrear cada variante.

Critério de sucesso: aumento de `primary_cta_clicked`, `pricing_viewed` e `plan_selected` sem queda de qualidade em ativação.

### Fase 2 — Prova e distribuição

- Publicar depoimentos verificáveis.
- Testar nova OG em tráfego compartilhado.
- Adicionar compartilhamento após demo ou geração de resultado, com conteúdo seguro e sem dados pessoais.
- Medir convites enviados e aceitos por tipo de workspace.

Critério de sucesso: crescimento de visitas atribuídas a compartilhamento e convites aceitos sem aumento relevante de denúncias ou suporte.

### Fase 3 — Monetização

- Executar as coortes de trial/paywall somente para novos cadastros elegíveis.
- Preservar usuários gratuitos existentes e acessos institucionais.
- Comparar receita líquida por visitante, ativação e retenção em 30/90 dias.
- Interromper variantes que reduzam ativação ou receita além do limite definido antes do teste.

Critério de sucesso: aumento sustentável de receita líquida, sem deterioração material de ativação, retenção, suporte e aquisição por convite.

## 9. Riscos e controles

| Risco | Controle |
|---|---|
| Remover o gratuito reduz drasticamente aquisição | Rollout por coorte, controle simultâneo e rollback por feature flag. |
| Catequistas individuais têm baixa disposição a pagar | Separar mensagem e preço pessoal do institucional; medir por segmento. |
| Paywall impede convidados e famílias | Isentar explicitamente membros cobertos e fluxos de convite. |
| Claims numéricos não são defensáveis | Publicar somente resultados medidos, com amostra e período documentados. |
| Depoimentos parecem fictícios | Usar consentimento, identidade e contexto verificáveis. |
| Compartilhamento expõe dados pastorais ou de menores | Compartilhar apenas templates, demos e resultados sanitizados. |
| Eventos duplicam receita ou violam privacidade | Receita confirmada por webhook, IDs idempotentes, consentimento e minimização de dados. |
| Simplificação visual oculta opções necessárias | Oferecer comparação detalhada secundária e recomendação guiada. |

## 10. Critérios de aceitação da auditoria

- Os 32 princípios estão classificados e associados a evidência ou lacuna verificável.
- Recomendações distinguem comunicação, instrumentação e mudança comercial.
- Nenhuma funcionalidade existente é proposta para remoção.
- Assinaturas permanecem como modelo padrão.
- A retirada do gratuito é tratada como experimento versionado para novos usuários.
- Usuários existentes, famílias e membros institucionais possuem estratégia explícita de proteção.
- As decisões dependem de métricas de receita, ativação e retenção, não de cadastros isolados.
- Toda mudança pública deve manter paridade entre `pt-BR`, `en` e `es` e passar por `npm run i18n:check` quando implementada.

