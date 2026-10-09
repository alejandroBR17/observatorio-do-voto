# Instalação e publicação do Observatório do Voto

![Observatório do Voto](public/og-image.png)

App responsivo para acompanhar as eleições presidenciais brasileiras: panorama de 2026, histórico de 1989–2022, pesquisas, mapas por estado, cobertura pública, perfil local e notificações. Inclui tema escuro, animações acessíveis e instalação como PWA.

Esta é a versão independente **Next.js para GitHub e Vercel**. Não depende de ChatGPT, Sites, Vinext, Cloudflare D1 ou de uma conta do criador para o visitante abrir o app. As credenciais e o banco da hospedagem anterior não foram exportados.

Endereço de produção: **https://observatorio-voto.vercel.app/**. Configure `SITE_URL` com esse endereço, sem os parâmetros de navegação.

## Publicar em 5 passos

1. Extraia o ZIP. Use a pasta que contém este README e o `package.json` como raiz do novo repositório GitHub. Não envie o ZIP como único arquivo do repositório.
2. Crie um banco no [Turso](https://turso.tech/). Copie a URL do banco e gere um token de acesso. É possível usar a oferta gratuita dentro dos limites do provedor.
3. Na [Vercel](https://vercel.com/new), importe esse repositório. Framework: **Next.js**. Root Directory: raiz do repositório. Node.js: **24.x**. Instalação: `npm ci`. Build: `npm run build`. Deixe Output Directory no padrão.
4. Se criou o banco pela integração Turso no Marketplace da Vercel, as variáveis **STORAGE_TURSO_DATABASE_URL** e **STORAGE_TURSO_AUTH_TOKEN** já são reconhecidas pelo app. Conecte o banco ao projeto em Production e Preview e publique novamente. Não precisa copiar os tokens. Para configuração manual, em Environment Variables, configure **TURSO_DATABASE_URL** e **TURSO_AUTH_TOKEN** para Production. Use `libsql://...turso.io` ou a URL HTTPS remota fornecida pelo Turso; nunca `file:`. Configure **SITE_URL** com seu domínio definitivo `https://...vercel.app`. Opcionalmente configure **PUSH_SUBJECT** com `mailto:seu-email`.
5. Clique Deploy. As tabelas são criadas automaticamente na primeira consulta. Acesse a URL, confira panorama e pesquisas, abra Apuração e ative os alertas no navegador desejado. A função WebSocket requer **Fluid Compute** habilitado (padrão dos projetos novos). Se a conexão não estiver disponível, a consulta HTTP continua a cada 30 segundos.

Se ainda não souber o domínio no primeiro deploy, deixe SITE_URL ausente: o projeto usa o domínio de produção informado pela Vercel. Depois de trocar um domínio ou variável, faça Redeploy. Em ambientes Preview, use um banco separado de Production; tokens e inscrições não devem misturar ambientes.

### Enviar pelo Git

Execute dentro da pasta extraída, substituindo a URL pelo seu repositório vazio:

```sh
git init
git add .
git commit -m "Preparar Observatório do Voto para Vercel"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

O `.gitignore` protege `.env.local`, o banco local, dependências e arquivos de build. O `.env.example` tem somente exemplos, sem tokens reais. Nunca use prefixo `NEXT_PUBLIC_` para tokens de banco, VAPID ou segredos do monitor.

## Rodar no computador

Requer Node.js 24 e npm. No Windows, `Copy-Item .env.example .env.local`; em macOS/Linux, `cp .env.example .env.local`.

```sh
npm ci
npm run db:init
npm run dev
```

Abra `http://localhost:3000`. O exemplo usa SQLite em `.data/observatorio.db`, exclusivamente para desenvolvimento. A Vercel precisa de banco remoto persistente, porque as funções são distribuídas e o disco local não é um banco compartilhado.

```sh
npm run typecheck
npm test
npm run build
npm start
```

WebSocket na Vercel usa a API `experimental_upgradeWebSocket` do SDK oficial. Para testar o upgrade localmente, use `vercel dev` com CLI 54.14.2 ou superior e projeto vinculado. `next dev` testa a interface e as APIs HTTP; nesse modo o socket retorna 426 e o cliente usa a atualização HTTP. A conexão é renovada após 55 segundos para respeitar a duração da função.

## O que precisa de configuração

| Item | Configuração |
| --- | --- |
| Panorama, mapas e histórico | Arquivos locais em `public/data`; funcionam sem chave |
| Pesquisas | Fontes públicas; funciona sem Turso, com cache temporário por instância. Turso habilita cache compartilhado |
| Cobertura e apuração | Banco Turso para cache compartilhado e fontes públicas |
| Push | HTTPS, permissão de cada navegador e banco; chaves VAPID geradas no servidor |
| Dados iguais para visitantes | Banco centralizado; WebSocket com fallback de consulta de 30 s |
| Perfil, preferência, estados e notas | LocalStorage de cada navegador; não são contas na nuvem |
| Coletas quando ninguém está conectado | Monitor externo opcional, configurado pelo administrador |

Os visitantes não precisam de contas GitHub, Vercel ou Turso. Não há sala compartilhada nem edição de resultados oficiais. Esta versão não implementa login, papéis de editor ou sincronização de notas pessoais entre aparelhos. O banco centraliza cache público e inscrições push, não a preferência política das pessoas.

## Alertas com o app fechado

Novos dados são coletados enquanto há clientes consultando o app. As notificações podem alcançar outro navegador inscrito que esteja fechado, se a plataforma permitir. **Sem visitantes, o workflow `.github/workflows/monitor.yml` consulta as três APIs públicas em intervalos previstos de 5 minutos.** A agenda do GitHub pode atrasar ou perder execuções; não é uma garantia de coleta em tempo real. O workflow pode ser executado manualmente em Actions e é suspenso pelo GitHub após 60 dias sem atividade no repositório público. A frequência não consome um plano pago de cron da Vercel.

Incluí `/api/monitor`, protegido por `Authorization: Bearer CRON_SECRET`. Gere um segredo longo e configure-o na Vercel e no monitor externo de sua escolha. Esse endpoint consulta o TSE e despacha os eventos. Não é público e não expõe o segredo na URL. Não incluí uma agenda incompatível com Hobby: o [cron gratuito da Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing) executa no máximo uma vez por dia. Um monitor externo com intervalo menor é necessário para apuração frequente sem visitantes; não foi provisionado neste pacote.

Push depende do navegador e não tem garantia de entrega. O despachante usa fila SQL e registro por evento/aparelho, com até três tentativas para falhas transitórias. Cada consulta despacha no máximo 100 entregas; as restantes são retomadas nas próximas consultas. Eventos expiram em 24 horas. Chaves de inscrição permitem enviar o conteúdo criptografado de cada alerta. Para confirmar recebimento no aparelho, use o botão de teste em Alertas. A resposta do provedor confirma aceitação, não leitura nem exibição pelo sistema. HTTPS e instalação na tela inicial são necessários no iPhone compatível. Trocar domínio ou banco exige uma nova inscrição; as inscrições da hospedagem antiga não migraram.

## Dados e confiança

- Resultados e vitória oficial: TSE. Os dados históricos e do primeiro turno são retratos incluídos no pacote, com fonte identificada.
- Mapa: IBGE. Regiões derivadas das unidades da federação.
- Pesquisas: retratos conferidos em 08 e 09/10/2026 e consulta a fontes públicas. O adaptador PoderData extrai números somente com contexto e metodologia inequívocos. Não é uma API completa de todos os institutos e não é previsão garantida.
- Cobertura: acervo e estatísticas SapiensLabs, com atribuição CC BY 4.0; notícias complementadas pelos RSS públicos de Folha e G1. Não há estatísticas individuais de eleitores ou rastreamento de redes sociais.
- A eleição futura não tem resultados inventados: o app mostra espera ou indisponibilidade até receber a fonte correta.

## Gratuidade e uso compartilhado

O projeto não exige APIs pagas ou cobra dos visitantes. [Vercel Hobby](https://vercel.com/docs/plans/hobby) é gratuito para uso pessoal e não comercial, com limites de recursos. [Turso](https://turso.tech/pricing) também tem uma oferta gratuita com cotas. Compartilhar o link é possível; tráfego alto, execução frequente e muitas conexões podem exceder as cotas. Não há promessa de hospedagem ilimitada sem custo.

## Estrutura e manutenção

`app/`: telas e APIs. `lib/`: normalização, fontes, cálculo, push e adaptador SQL. `public/`: fontes locais, fotos, dados, ícones e service worker. `tests/`: banco e controle de concorrência. `scripts/`: inicialização e validação de dados. `.github/workflows/ci.yml`: instalação, tipos, testes e build nos pushes/PRs.

Favicon SVG e ICO (16/32/48), ícones PWA 192/512, Apple Touch Icon 180 e imagem social 1200×630 já estão incluídos. Fontes são servidas pelo próprio projeto. O CI não publica na Vercel: a integração do repositório com a Vercel faz os deploys de cada push.

Consulte `NOTICE.md` para atribuições. Uma licença de distribuição para o código ainda deve ser escolhida pelo titular antes de apresentá-lo como software livre.
