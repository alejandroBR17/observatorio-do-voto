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

Como alternativa, um monitor externo pode chamar `/api/monitor` com `Authorization: Bearer CRON_SECRET`. Configurar o segredo não cria uma agenda. Não envie segredos pela URL.

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
