# Verificação do pacote

Verificado localmente em 09/10/2026, com Node.js 24:

- Instalação das dependências e geração do `package-lock.json` concluídas.
- Testes de dados eleitorais, pesquisas, banco, concorrência e origem das requisições passaram.
- Verificação TypeScript e build de produção Next.js passaram.
- Servidor de produção: páginas, metadados sociais, manifesto, ícones, mapa e service worker responderam corretamente.
- APIs: validação de entradas, proteção do monitor, rejeição de origem externa e resposta push sem chave privada passaram.

Os testes automatizados do banco usaram SQLite local. A integração Turso e a inscrição push também foram verificadas na Vercel; a entrega de uma notificação de teste no computador foi confirmada pelo usuário em 09/10/2026. Entrega em Android e iPhone e upgrade WebSocket na Vercel não foram verificados em aparelhos reais. O código está no repositório público https://github.com/alejandroBR17/observatorio-do-voto. Produção: https://observatorio-voto.vercel.app/.

Execute `npm ci`, `npm run typecheck`, `npm test` e `npm run build` para repetir os checks. O script `scripts/smoke.mjs` verifica um servidor em execução; use `TEST_URL` para definir sua URL.

O ZIP contém somente código, configurações, documentação e assets. Não contém credenciais, banco local, dependências instaladas ou arquivos de build.


## Atualização do domínio, tema e pesquisas

- Corrigido o canal AtlasIntel para Exclusive Polls; relatório original de 09/10 conferido (páginas 5, 7 e 8).
- PoderData, Quaest e AtlasIntel responderam na verificação real das fontes.
- Pesquisas funcionam sem banco configurado ou quando ele falha, usando cache temporário por instância; o banco continua necessário para inscrições push e os outros serviços compartilhados.
- O tema padrão acompanha o sistema e pode ser alterado para Claro ou Escuro. Preferências antigas sem o novo campo de tema passam a usar Automático.
- Validação em navegador Edge: troca automática do tema do sistema, persistência da escolha manual, migração das preferências antigas, pesquisas sem banco e barra superior em 320 e 390 px passaram.

## Contexto das pesquisas

A apresentação foi simplificada: sem seletor fixo, glossário, dicionário de campos ou exportações CSV/JSON. A preferência para abrir os detalhes das pesquisas fica em Meu perfil. A profundidade se concentra em metodologia e comparação eleitoral, sem alterar percentuais ou filtros. Textos repetidos sobre datas, interpretação e atualização foram reduzidos.
- Verificação em navegador passou: ausência de controles fixos/glossário/downloads, preferência persistente no perfil, metodologia sob demanda, mesmos resultados e layout em 320/390 px.


## Boas-vindas e integração Turso da Vercel

- Reconhecidas as variáveis STORAGE_TURSO_DATABASE_URL e STORAGE_TURSO_AUTH_TOKEN geradas pela integração, mantendo o par URL/token do mesmo banco.
- Testes de provedores push (Apple, Chrome, Firefox e Windows), rejeição de endpoints inseguros e estabilidade das chaves VAPID passaram.
- Onboarding testado em navegador: personalização, pular, persistência, retorno pelo perfil e ausência de rolagem horizontal em 320/390/1280 px.
- Ativação só é oferecida quando o serviço confirma conexão. No iPhone, a interface explica a instalação na Tela de Início. O teste no computador foi recebido; Android e iPhone ainda precisam de verificação nesses aparelhos.


## Alertas antes da eleição e atualização das fontes

- Gatilhos de resultado, vantagem irreversível, troca de líder e variação acumulada da vantagem testados juntos, sem categoria suprimir outra.
- Fila testada para preferências, falhas transitórias, duplicidade e remoção de inscrições expiradas.
- Pesquisas/publicações e novas notícias usam categorias próprias, sem avisar retroativamente sobre a carga inicial.
- Notícias de Folha e G1 complementam o acervo SapiensLabs. Datas de consulta e coleta da fonte são distintas.
- Monitor gratuito no GitHub consulta APIs a cada 5 minutos previstos, mesmo sem visitantes; a agenda não garante pontualidade.
- Atualizado Next.js para 16.3.8; auditoria das dependências sem vulnerabilidades identificadas.

- Teste funcional em navegador passou: botão de push dentro do onboarding, pedido de permissão disparado pelo clique, erro de permissão exibido no modal, comparação regional sem alterar filtro, restauração do Brasil sem voltar ao topo, categorias novas, RSS e horário da fonte, larguras 320/390/1280 px.
- Publicações de pesquisas incluem o RSS do G1, com identificação do veículo; manchetes não alteram automaticamente os percentuais dos retratos conferidos.
- TypeScript, 11 testes automatizados e build de produção passaram após a inclusão da quinta fonte de publicações.


## Revisão visual, acompanhamento e teste push
- Cartões de candidatos e pesquisas mantêm alturas independentes ao expandir; verificação em navegador passou.
- Contagem regressiva usa 25/10/2026 às 17h em Brasília e não antecipa resultados antes dos dados do TSE.
- Imagem real do G1 obtida pelo adaptador de metadados; cartões usam fallback quando a fonte não permite uma prévia.
- Estados escolhidos no mapa/lista são persistidos e oferecem resultados comparativos e atalhos por UF.
- Caderno antigo migrado para entradas; persistência, exclusão e desfazer verificados.
- Onboarding exige aceite explícito dos termos, separado de notificações, e salva apenas versão/horário no navegador.
- Perfil mostra estados, entradas e situação das notificações; telas verificadas em 320, 390 e 1440 px.
- Teste push verificado com respostas controladas: falha permanece na tela; inscrição expirada é renovada uma vez; confirmação de recebimento fica visível. Isso não constitui teste de entrega real em todos os aparelhos.
- Logs da Vercel mostraram uma rejeição de envio ao FCM; diagnóstico passa a diferenciar expiração, identificação rejeitada, limitação e falha do serviço, sem registrar endpoint/chaves.
- WebSocket só abre durante a apuração ao vivo; renovação antecipada evita manter conexões ociosas até o limite da função.
