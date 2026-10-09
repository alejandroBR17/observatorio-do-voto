# Verificação do pacote

Verificado localmente em 09/10/2026, com Node.js 24:

- Instalação das dependências e geração do `package-lock.json` concluídas.
- Testes de dados eleitorais, pesquisas, banco, concorrência e origem das requisições passaram.
- Verificação TypeScript e build de produção Next.js passaram.
- Servidor de produção: páginas, metadados sociais, manifesto, ícones, mapa e service worker responderam corretamente.
- APIs: validação de entradas, proteção do monitor, rejeição de origem externa e resposta push sem chave privada passaram.

O teste do banco usou SQLite local. A conexão com seu Turso remoto, o upgrade WebSocket na Vercel e a entrega push em dispositivos reais dependem das credenciais e da hospedagem final. O código foi publicado no repositório público https://github.com/alejandroBR17/observatorio-do-voto. Endereço de produção informado: https://observatorio-voto.vercel.app/.

Execute `npm ci`, `npm run typecheck`, `npm test` e `npm run build` para repetir os checks. O script `scripts/smoke.mjs` verifica um servidor em execução; use `TEST_URL` para definir sua URL.

O ZIP contém somente código, configurações, documentação e assets. Não contém credenciais, banco local, dependências instaladas ou arquivos de build.


## Atualização do domínio, tema e pesquisas

- Corrigido o canal AtlasIntel para Exclusive Polls; relatório original de 09/10 conferido (páginas 5, 7 e 8).
- PoderData, Quaest e AtlasIntel responderam na verificação real das fontes.
- Pesquisas funcionam sem banco configurado ou quando ele falha, usando cache temporário por instância; o banco continua necessário para inscrições push e os outros serviços compartilhados.
- O tema padrão acompanha o sistema e pode ser alterado para Claro ou Escuro. Preferências antigas sem o novo campo de tema passam a usar Automático.
- Validação em navegador Edge: troca automática do tema do sistema, persistência da escolha manual, migração das preferências antigas, pesquisas sem banco e barra superior em 320 e 390 px passaram.

## Leitura Essencial e Detalhada

- Visão Essencial com linguagem simples, exemplos por 100 respostas, ajuda por tela e glossário pesquisável.
- Visão Detalhada com metodologia expandida, critérios de cálculo, dicionário dos campos e exportação de pesquisas e progressão em CSV/JSON.
- Tabelas alternativas aos gráficos, com navegação por teclado nos contêineres de rolagem.
- Validação em navegador: escolha persistente, mesmos percentuais entre visualizações, filtros preservados na troca, busca de termos com e sem resultados, exportações do recorte selecionado, ressalvas do acervo histórico e telas de 320/390 px passaram.
- Os testes de dados e o build de produção passaram. As opções de leitura não modificam os resultados, a atualização das fontes ou as inscrições de alerta.
