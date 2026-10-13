# Revisão de privacidade e publicação

Registro operacional de 13/10/2026. Responsável: Alejandro Mateus Sobral Cortes. Contato público: ale.sobral.cortes@gmail.com. Este documento registra implementação e pendências; não é parecer jurídico, contrato com fornecedores ou certificação de conformidade.

## Tratamentos e controles

| Informação                                                      | Finalidade e localização                                                                      | Retenção e controle                                                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Nome, preferência política opcional, tema, municípios e caderno | Personalização no armazenamento do aparelho; não transmitidos ao banco ou ao Analytics        | Até edição, exclusão ou limpeza do armazenamento. Acompanhar os dois remove a preferência de candidato                         |
| Histórico de alertas                                            | IndexedDB local, até 50 entradas visíveis                                                     | Até 30 dias; botão de limpeza em Alertas                                                                                       |
| Aceite dos termos                                               | Versão e data no navegador                                                                    | Até limpeza local; não há conta central nem assinatura eletrônica certificada                                                  |
| Inscrição de push                                               | Endereço de entrega, chaves e preferências no Turso de produção nos EUA                       | Enquanto ativa. Desativação remove inscrição, chaves, autorização e registros vinculados no banco ativo; falhas são informadas |
| Autorização nova de push                                        | Texto, finalidade, versões e data do servidor; aviso destacado de processamento internacional | Enquanto a inscrição existir. Sincronização não renova o aceite; inscrições legadas não recebem comprovantes retroativos       |
| Testes, recibos e entregas                                      | Controle técnico de envio e deduplicação                                                      | 48 horas, limpeza durante monitoramento. Se interrompido, a limpeza aguarda a próxima execução bem-sucedida                    |
| Analytics opcional                                              | Vercel Web Analytics, somente após escolha própria; URLs sem parâmetros ou fragmentos         | Escolha local versionada; retirada interrompe novas visualizações, sem apagar relatórios anteriores automaticamente            |
| Requisições e logs da infraestrutura                            | Entrega do serviço e segurança, fornecedores externos                                         | Ciclos próprios dos fornecedores; prazo e mecanismo aplicável precisam ser confirmados contratualmente                         |
| E-mail de atendimento                                           | Gmail, resposta privada a solicitações                                                        | Somente o necessário para atendimento, obrigações e exercício de direitos; definir rotina documentada de revisão e descarte    |

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
- **Turso:** os [termos](https://turso.tech/terms-of-use) indicam execução de DPA na área Documents da conta. Não houve assinatura neste trabalho. Conferir documento efetivamente aplicável, subprocessadores, exclusões, backups e transferências antes de afirmar cobertura contratual.
- **Push e Gmail:** considerar as políticas dos provedores usados por cada navegador e pelo atendimento. Não há garantia de localização brasileira para toda a cadeia.
- **Ambientes de teste:** em 13/10, a conexão do Turso foi limitada a Production, sem ações de criação de branches por deploy. Novos previews não recebem credenciais desse banco. Previews já publicados e snapshots antigos ainda exigem inventário e avaliação de descarte; a mudança não os apaga retroativamente. Não apagar recursos ou snapshots sem identificar dependências e autorizar a operação.

Nenhum plano pago foi contratado. Consentimentos destacados para recursos opcionais não resolvem, sozinhos, todas as obrigações de operação ou de fornecedores. Confirmar o mecanismo adequado à [regulamentação de transferências da ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024).

## Conteúdo, imagens e pesquisas

- Código MIT não licencia fotografias, marcas ou matérias. Fontes e licenças existentes estão em [NOTICE.md](../NOTICE.md).
- Fotografias locais de candidatos (`public/assets/lula.jpeg` e `flavio.jpeg`): autorização/licença não documentada; confirmar procedência e direito de uso ou substituir por material autorizado. Atribuição, por si só, não basta.
- Imagens de notícias: carregadas do veículo, com `no-referrer`; não há cópia dos bytes no repositório. Confirmar permissões e atender solicitações de retirada. Carregamento remoto também é uma requisição técnica a terceiro.
- Pesquisas numéricas: o catálogo apresenta instituto, período, amostra, margem, registro e fonte, mas não possui contratante explícito em todos os registros; a confiança da Datafolha de 08/10 permanece não informada no catálogo. Verificar ficha original e registro antes de preencher campos. Não deduzir financiador a partir de parceria editorial.
- Antes de ampliar a divulgação, completar e validar os metadados exigidos no [art. 10 da Resolução TSE 23.600](https://www.tse.jus.br/legislacao/compilada/res/2019/resolucao-no-23-600-de-12-de-dezembro-de-2019). Não preencher lacunas com números presumidos.

## Revisão jurídica a concluir

Validar termos, bases legais, preferência política local, atendimento, menores, fornecedores internacionais, fotografias e divulgação de pesquisas com profissional habilitado. Revisar à luz da [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) e da [Lei de Direitos Autorais](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm). Não anunciar proteção integral contra responsabilidade ou conformidade completa enquanto essas pendências existirem.
