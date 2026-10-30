# Documentos da inscrição

Documentos faltantes ou rejeitados geram avisos. Eles nunca impedem o envio, a conferência ou outras ações da inscrição. A carta pastoral só é obrigatória quando a regra da etapa a exige e o padrinho ou a madrinha é de outra paróquia. Sem essa informação ela fica opcional. A idade considerada é a da inscrição na data de corte.

Após confirmar o contato, a família recebe uma sessão de envio válida por duas horas na resposta da confirmação. Ela é vinculada à submissão e permite consultar o checklist e enviar arquivos enquanto a campanha estiver OPEN. O token não é enviado por e-mail nem usado em URLs. A equipe também pode receber documentos no balcão.

Aceitam-se os tipos de documento definidos no sistema e arquivos PDF, JPEG, PNG ou WebP de até 10 MB, com assinatura compatível. Cada inscrição pode ter até dez documentos ativos. Um arquivo idêntico do mesmo tipo e inscrição reutiliza o registro existente.

Os arquivos são armazenados em um prefixo isolado e inicialmente ficam em quarentena. Configure `CLAMAV_HOST` e, opcionalmente, `CLAMAV_PORT` (padrão 3310) para análise pelo clamd via TCP. Se o scanner estiver indisponível ou não configurado, a família verá o estado aguardando análise de segurança e a equipe não poderá baixar o arquivo. Se o arquivo estiver limpo, ele fica aguardando conferência; se estiver infectado, é apagado e recusado com motivo fixo. `REGISTRATION_DOCUMENT_SCAN=skip` desativa a análise somente para homologação e registra um aviso na inicialização.

A fila da equipe mostra documentos e seus estados, sem dados de contato. Pessoas autorizadas podem conferir arquivos pendentes e verificá-los ou rejeitá-los; apenas documentos pendentes ou verificados podem ser baixados por quem tem acesso a arquivos sensíveis. Uma rejeição feita pela equipe mantém o arquivo para a política de retenção. A limpeza será implementada no PR 13. O fluxo não envia e-mail de decisão.

Na confirmação, a família pode consultar os estados e enviar documentos durante a sessão em memória. Quando ela expira, a página orienta procurar a secretaria. Na conferência, a equipe vê os avisos, envia arquivos recebidos no balcão e revisa os documentos pendentes. A fila de documentos reúne esses arquivos por estado e permite baixar os disponíveis e registrar decisões.
