# Publicação na Vercel

Produção: [observatorio-voto.vercel.app](https://observatorio-voto.vercel.app/).

Para executar localmente, consulte o [guia de desenvolvimento](development.md). Ele também reúne a arquitetura, os contratos do servidor e as verificações antes de publicar.

## Configuração

1. Importe o repositório na Vercel usando **Next.js**, raiz do repositório, Node.js **24.x**, instalação `npm ci` e build `npm run build`. Mantenha Output Directory no padrão.
2. Conecte um banco Turso remoto. A integração da Vercel fornece `STORAGE_TURSO_DATABASE_URL` e `STORAGE_TURSO_AUTH_TOKEN`; o app reconhece esse par. Na configuração manual, use `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`.
3. Configure `SITE_URL` com o domínio definitivo HTTPS, sem parâmetros nem barra final. Se ausente, os metadados usam o domínio de produção fornecido pela Vercel.
4. Habilite Fluid Compute para o WebSocket experimental. Se o upgrade não estiver disponível, o cliente continua consultando por HTTP.
5. Publique e confira os recursos, as fontes, o banco e o teste de notificações em um aparelho de teste.

Variáveis novas exigem redeploy. As tabelas são criadas automaticamente na primeira operação; `npm run db:init` permite inicializá-las explicitamente. Use banco e inscrições separados em **Preview** e **Production**.

Na conexão Turso/Vercel, habilite **Create database branch for deployment** somente para **Preview**. Produção deve usar o banco permanente: criar uma cópia a cada publicação perde as inscrições e gera novas chaves VAPID. Depois de corrigir essa opção, publique novamente e confira que a chave pública e os registros permanecem iguais após outro deploy. O cliente renova inscrições antigas ao reabrir o app, somente para aparelhos que já permitiram notificações.

## Variáveis de ambiente

| Variável                                                  | Uso                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`                 | Par manual para o banco remoto; tem prioridade sobre a integração |
| `STORAGE_TURSO_DATABASE_URL` + `STORAGE_TURSO_AUTH_TOKEN` | Par fornecido pela integração Turso/Vercel                        |
| `SITE_URL`                                                | Endereço público; metadados e identificação VAPID                 |
| `PUSH_SUBJECT`                                            | Contato VAPID opcional, como `mailto:administrador@example.com`   |
| `CRON_SECRET`                                             | Segredo opcional para um monitor externo usar `/api/monitor`      |

Nunca use `file:` na Vercel: o disco de funções não é um banco persistente compartilhado. SQLite em `.data` serve ao desenvolvimento. Não use `NEXT_PUBLIC_` para tokens, chaves VAPID ou segredos. O `.env.example` contém exemplos; `.env.local` e `.data` são ignorados pelo Git.

## Coleta e push com o app fechado

O workflow [monitor.yml](../.github/workflows/monitor.yml) consulta `/api/live`, `/api/polls` e `/api/media` em intervalos previstos de cinco minutos. Para outra hospedagem, atualize `SITE` nesse workflow. A agenda do GitHub pode atrasar; confira Actions e as regras de suspensão de workflows sem atividade.

Use um agendador externo como agenda principal quando os intervalos do GitHub estiverem irregulares. O [cron-job.org](https://cron-job.org/en/faq/) oferece agendamento gratuito; não é instalado nem ativado pelo código. Configure:

1. Um segredo aleatório longo em `CRON_SECRET` na Vercel, ambiente Production, e faça redeploy.
2. Uma tarefa GET para `https://observatorio-voto.vercel.app/api/monitor`, a cada cinco minutos, com o cabeçalho `Authorization: Bearer SEU_SEGREDO`. Nunca coloque o segredo na URL ou no repositório.
3. Timeout de 30 segundos (limite gratuito observado no painel), histórico de execuções e alerta de falha no painel do agendador. Verifique duas execuções consecutivas; salvar a agenda não comprova funcionamento. Se houver timeout recorrente, investigue os tempos das fontes e da fila; não conte a chamada como bem-sucedida nem contrate um plano automaticamente.

A rota consulta apuração, pesquisas e imprensa em paralelo e processa a fila push depois das consultas, mesmo que uma fonte falhe. HTTP 200 indica consulta saudável; HTTP 503 e `status: degraded` sinalizam coleta ou entrega indisponível. `sources` identifica o componente; `gapSeconds` registra o intervalo real entre chamadas desta rota. O último relatório fica no banco em `monitor:last`. O GitHub continua como alternativa e não altera esse intervalo.

Cinco minutos são a meta da agenda, não garantia de entrega. Durante a apuração, valide a possibilidade de uma frequência maior no agendador e as cotas de Vercel/Turso; o site aberto já consulta a apuração com frequência maior. Não utilize um processo no computador local como monitor de produção.

Notícias e publicações são descobertas automaticamente nas fontes cadastradas. Os gráficos de pesquisas têm atualização automática apenas pelo adaptador conservador do PoderData; outros institutos exigem conferência do relatório, registro, amostra, período e base de cálculo antes da inclusão em `pollSnapshots`. Nem toda pesquisa tem uma API estruturada. Mudanças nos feeds, novos institutos e bloqueios das fontes ainda precisam de revisão periódica. Uma data de consulta recente não comprova cobertura completa nem uma pesquisa recém-publicada.

As chaves VAPID são geradas e persistidas no banco. Preserve o banco para manter a identidade das inscrições. Trocar domínio ou identidade VAPID exige nova inscrição. Não remova chaves como uma rotina de limpeza.

O despachante usa fila SQL, registro por evento/aparelho, até três tentativas para falhas transitórias e expiração em 24 horas. Uma consulta processa no máximo 100 entregas; as demais ficam para consultas seguintes. A aceitação pelo provedor não comprova leitura ou exibição pelo sistema.

Push exige HTTPS, permissão e suporte da plataforma. No iPhone compatível, o app precisa estar instalado na tela inicial. O [guia de verificação](development.md#verificação) distingue testes automatizados da validação no aparelho.

## WebSocket

`/api/socket` usa `experimental_upgradeWebSocket` de `@vercel/functions`. A conexão é aberta durante a apuração, renovada antes do limite da função e acompanhada de fallback HTTP. `next dev` retorna 426; use um ambiente Vercel compatível para validar o upgrade. A API é experimental e precisa de revisão ao atualizar o SDK.

## Recursos e custos

Mapas e histórico usam arquivos locais; fontes públicas não exigem APIs pagas. O banco centraliza cache e inscrições; notas e preferências permanecem no navegador. Dados dependem da fonte e da validação do adaptador.

O projeto não cobra visitantes. Hospedagem e banco estão sujeitos aos termos e cotas dos provedores: [Vercel](https://vercel.com/docs/plans/hobby) e [Turso](https://turso.tech/pricing). Não há garantia de infraestrutura ilimitada sem custo.

## Diagnóstico

### Estatísticas de acesso

O componente `SiteAnalytics`, no layout raiz, integra `@vercel/analytics/next`. No projeto da Vercel, abra **Analytics → Enable** se a coleta ainda não estiver habilitada; a plataforma disponibiliza o script após o próximo deploy. O painel mostra visitantes e visualizações coletados a partir da ativação, sem recuperar acessos anteriores.

A integração remove parâmetros e fragmentos das URLs e não envia preferências ou anotações locais. Não há eventos personalizados. Confira as [cotas do Web Analytics](https://vercel.com/docs/analytics/limits-and-pricing): o plano Hobby inclui uma franquia gratuita; outros planos podem cobrar por uso. O pacote não configura planos ou contrata adicionais.

### Problemas comuns

| Sintoma                       | Conferir                                                             |
| ----------------------------- | -------------------------------------------------------------------- |
| Push indisponível             | Par de variáveis do banco, acesso remoto e logs sem credenciais      |
| Teste aceito, sem notificação | Permissões do navegador/sistema e inscrição no domínio atual         |
| Fontes desatualizadas         | Actions, status/data de consulta nas APIs e disponibilidade da fonte |
| Socket recusado               | Ambiente Vercel, Fluid Compute e fallback HTTP                       |
| Preferências desapareceram    | Dados locais do navegador; não existe sincronização entre aparelhos  |

O CI verifica o código; a integração GitHub/Vercel realiza o deploy. Revise os termos, a privacidade e as atribuições de [NOTICE.md](../NOTICE.md) ao hospedar sua própria versão.
