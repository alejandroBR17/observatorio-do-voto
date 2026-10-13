# Revisão de privacidade e publicação

Registro operacional de 13/10/2026. Responsável: Alejandro Mateus Sobral Cortes. Contato público: ale.sobral.cortes@gmail.com. Este documento registra implementação e pendências; não é parecer jurídico, contrato com fornecedores ou certificação de conformidade.

## Tratamentos e controles

| Informação                                                      | Finalidade e localização                                                                                               | Retenção e controle                                                                                                            |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Nome, preferência política opcional, tema, municípios e caderno | Personalização no armazenamento do aparelho; não transmitidos ao banco ou ao Analytics                                 | Até edição, exclusão ou limpeza do armazenamento. Acompanhar os dois remove a preferência de candidato                         |
| Histórico de alertas                                            | IndexedDB local, até 50 entradas visíveis                                                                              | Até 30 dias; botão de limpeza em Alertas                                                                                       |
| Aceite dos termos                                               | Versão e data no navegador                                                                                             | Até limpeza local; não há conta central nem assinatura eletrônica certificada                                                  |
| Inscrição de push                                               | Endereço de entrega, chaves e preferências no Turso de produção nos EUA                                                | Enquanto ativa. Desativação remove inscrição, chaves, autorização e registros vinculados no banco ativo; falhas são informadas |
| Autorização nova de push                                        | Texto, finalidade, versões e data do servidor; aviso destacado de processamento internacional                          | Enquanto a inscrição existir. Sincronização não renova o aceite; inscrições legadas não recebem comprovantes retroativos       |
| Testes, recibos e entregas                                      | Controle técnico de envio e deduplicação                                                                               | 48 horas, limpeza durante monitoramento. Se interrompido, a limpeza aguarda a próxima execução bem-sucedida                    |
| Contadores contra abuso de notificações                         | HMAC do IP fornecido pela hospedagem, com chave do servidor e rotação diária; contagem de operações e horário no Turso | 24 horas, limpeza pelo monitor. IP em texto não é gravado pelo app. Não são vinculados ao perfil ou usados para Analytics      |
| Analytics opcional                                              | Vercel Web Analytics, somente após escolha própria; URLs sem parâmetros ou fragmentos                                  | Escolha local versionada; retirada interrompe novas visualizações, sem apagar relatórios anteriores automaticamente            |
| Requisições e logs da infraestrutura                            | Entrega do serviço e segurança, fornecedores externos                                                                  | Ciclos próprios dos fornecedores; prazo e mecanismo aplicável precisam ser confirmados contratualmente                         |
| E-mail de atendimento                                           | Gmail, resposta privada a solicitações                                                                                 | Somente o necessário para atendimento, obrigações e exercício de direitos; definir rotina documentada de revisão e descarte    |

O aceite dos termos não autoriza Analytics ou push. Recursos opcionais podem ser recusados. As hipóteses legais para operações necessárias, sensíveis, com menores e internacionais devem ser validadas para o caso concreto. A implementação não presume que gratuidade ou armazenamento local dispensem a LGPD.

## Atendimento e incidentes

1. Receber solicitações no contato privado; registrar data, assunto, providência e resposta com o mínimo de dados. Não pedir CPF, título, chaves ou documentos por padrão. Não publicar pedidos em issues.
2. Identificar o tratamento: dados locais podem ser editados no aparelho; inscrições não estão associadas a nome ou e-mail. Confirmar legitimidade antes de revelar ou remover dados de terceiros.
3. Para inscrições identificadas, usar a mesma remoção completa de `lib/push-storage.ts`, conferir a exclusão e responder com alcance e limitações. Não registrar endpoints ou chaves em logs de atendimento.
4. Responder nos prazos legais, informando justificativas e fornecedores quando necessário. Não prometer localizar dados sem identificadores disponíveis.
5. Em incidente, conter acesso, preservar evidências mínimas, avaliar impacto e obrigações de comunicação com apoio jurídico. Não declarar antecipadamente que todo incidente é irrelevante.
6. Ao restaurar backups, reaplicar exclusões e impedir a reativação de inscrições revogadas. O código de produção não apaga automaticamente snapshots antigos dos fornecedores.

## Fornecedores: pendências reais

- **Vercel:** o [DPA público](https://vercel.com/legal/dpa) declara aplicabilidade a Enterprise e Pro. A aplicabilidade ao plano gratuito deste projeto não foi confirmada. Confirmar contrato, papéis, prazos de logs, subprocessadores e mecanismo internacional; não presumir que o documento está incorporado ao Hobby.
- **Turso:** os [termos](https://turso.tech/terms-of-use) indicam execução de DPA na área Documents. A conta integrada ao Vercel foi inspecionada em 13/10: o painel identifica o plano Free e restringe o DPA a Developer ou superior. Nenhum upgrade ou contrato foi aceito. Isso é uma pendência contratual concreta, não uma conclusão de que todo uso gratuito viola a LGPD. Confirmar com o fornecedor os termos aplicáveis à integração gratuita, subprocessadores, exclusões, backups e transferências.
- **Push e Gmail:** considerar as políticas dos provedores usados por cada navegador e pelo atendimento. Não há garantia de localização brasileira para toda a cadeia.
- **Ambientes de teste:** em 13/10, a conexão do Turso foi limitada a Production, sem ações de criação de branches por deploy. Novos previews não recebem credenciais desse banco. Previews já publicados e snapshots antigos ainda exigem inventário e avaliação de descarte; a mudança não os apaga retroativamente. Não apagar recursos ou snapshots sem identificar dependências e autorizar a operação.

Nenhum plano pago foi contratado. Consentimentos destacados para recursos opcionais não resolvem, sozinhos, todas as obrigações de operação ou de fornecedores. Confirmar o mecanismo adequado à [regulamentação de transferências da ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024).

## Conteúdo, imagens e pesquisas

- Código MIT não licencia fotografias, marcas ou matérias. Fontes e licenças existentes estão em [NOTICE.md](../NOTICE.md).
- Fotografias locais de candidatos: substituídas por arquivos com licença identificada no Commons e procedência da Agência Senado e do Palácio do Planalto. Créditos públicos em `/creditos`; fontes, licenças, alterações e hashes em `public/assets/licenses/candidate-portraits.json`. Flávio: Carlos Moura / Agência Senado, CC BY-SA 4.0. Lula: Ricardo Stuckert / Presidência da República, CC BY 2.0. A verificação de copyright não substitui avaliação de direitos de imagem e do contexto de uso. Arquivos anteriores permanecem no histórico do Git; a substituição atual não comprova autorização retroativa.
- Imagens de notícias: carregadas do veículo, com `no-referrer`; não há cópia dos bytes no repositório. Confirmar permissões e atender solicitações de retirada. Carregamento remoto também é uma requisição técnica a terceiro.
- As seis pesquisas numéricas do catálogo agora têm contratante e confiança preenchidos por fonte identificada. DataTrends, Ipespe, AtlasIntel e Vox Brasil: contratação com recursos próprios consultada diretamente no [PesqEle](https://pesqele-divulgacao.tse.jus.br/) em 13/10. Datafolha: Folha de S.Paulo e TV Globo, confiança 95%, na [reportagem original de Igor Gielow/Folhapress](https://sampi.net.br/nacional/noticias/amp/3010275/eleicoes-2026/2026/10/flavio-bolsonaro-tem-52-e-lula-48-em-votos-validos-no-2-turno). PoderData: recursos próprios, Aya como parceira de divulgação, na [publicação do próprio grupo](https://www.poder360.com.br/poderdata/flavio-tem-53-contra-47-de-lula-no-2o-turno-diz-pesquisa-poderdata-aya/). Não foi atribuída contratação a Bloomberg ou ABRAPEL apenas por parceria editorial.
- AtlasIntel: o registro prevê 5.000 entrevistas, mas o relatório divulgado informa 5.026. O app preserva a amostra final e informa a diferença na ficha; não altera percentuais nem declara irregularidade por conta própria.
- Novos números automáticos do PoderData exigem confiança e declaração explícita de recursos próprios, além das demais verificações. Sem ficha suficiente, o conteúdo continua somente em publicações. Registros automáticos antigos sem esses campos não substituem as fichas corrigidas do catálogo.
- Manter as informações do [art. 10 da Resolução TSE 23.600](https://www.tse.jus.br/legislacao/compilada/res/2019/resolucao-no-23-600-de-12-de-dezembro-de-2019) na divulgação, sem inferir números ou contratantes. Registro no TSE não é aprovação prévia dos resultados. Avaliar também o contexto dos títulos de notícias e notificações que mencionem pesquisas, com apoio jurídico.

## Consultas contratuais prontas para envio pelo responsável

As mensagens abaixo são rascunhos; não foram enviadas. Não anexar dumps do banco, credenciais, endpoints de push, logs pessoais ou documentos de usuários.

### Vercel — privacy@vercel.com

Assunto: Condições de tratamento de dados no Hobby para projeto brasileiro gratuito

Mantenho o Observatório do Voto, aplicativo gratuito e independente para usuários brasileiros, no plano Hobby. A aplicação usa hospedagem e Functions, push opcional e Web Analytics somente após autorização separada. Preferência política, nome e anotações ficam localmente no aparelho. Os termos gerais incorporam o DPA por referência, mas a introdução do DPA público menciona Enterprise e Pro.

Podem confirmar por escrito quais obrigações e documentos de tratamento de dados se aplicam ao Hobby, os papéis de controlador/operador para cada serviço, as regiões e subprocessadores envolvidos, a retenção de logs e backups e o mecanismo aplicável aos dados de brasileiros processados fora do Brasil? Existe aditivo acessível sem upgrade, incluindo garantias pertinentes à LGPD e às regras da ANPD? Não autorizo contratação ou migração de plano nesta consulta.

### Turso — support@turso.tech

Assunto: DPA e condições de privacidade na integração gratuita com Vercel

Mantenho um aplicativo brasileiro gratuito usando a integração Turso/Vercel Starter, identificada como Free no painel Turso. O banco nos EUA guarda somente inscrições opcionais de push: endereço de entrega, chaves de criptografia, preferências de alertas e autorização. Nome, candidato preferido e caderno não são enviados. A desativação remove os registros associados do banco ativo; dados técnicos têm limpeza em 48 horas. O painel Documents restringe o DPA a Developer ou superior.

Quais condições de tratamento se aplicam à integração gratuita? Existe forma gratuita de incorporar um acordo de tratamento? Podem informar subprocessadores, prazos de logs, backups e branches antigos, procedimentos de exclusão e atendimento a titulares e garantias aplicáveis à LGPD e à transferência internacional conforme a ANPD? Não autorizo upgrade, cobrança ou alteração dos recursos nesta consulta.

### Alternativa gratuita a avaliar, caso não haja cobertura adequada

O [DPA público do Supabase](https://supabase.com/legal/customer-resources/data-processing-addendum) declara integração aos termos, sem a limitação explícita de planos vista no DPA da Vercel. O serviço possui [plano Free](https://supabase.com/docs/guides/platform/billing-on-supabase) e permite selecionar a região principal. É um candidato para avaliação, não uma solução jurídica já validada: [a documentação de transferências](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq) explica que parte do processamento ocorre fora da região escolhida. Confirmar aplicabilidade ao Free e adequação à LGPD/ANPD, cotas e condições de inatividade antes de decidir. Nenhuma conta, contrato ou migração foi realizada. Uma migração exigiria testes, preservação das inscrições e chaves VAPID, plano de retorno e decisão informada do responsável.

## Revisão jurídica a concluir

Validar termos, bases legais, preferência política local, atendimento, menores, fornecedores internacionais, fotografias e divulgação de pesquisas com profissional habilitado. Revisar à luz da [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) e da [Lei de Direitos Autorais](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm). Não anunciar proteção integral contra responsabilidade ou conformidade completa enquanto essas pendências existirem.
