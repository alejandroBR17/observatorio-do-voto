# Verificação do pacote

Verificado localmente em 09/10/2026, com Node.js 24:

- Instalação das dependências e geração do `package-lock.json` concluídas.
- Testes de dados eleitorais, pesquisas, banco, concorrência e origem das requisições passaram.
- Verificação TypeScript e build de produção Next.js passaram.
- Servidor de produção: páginas, metadados sociais, manifesto, ícones, mapa e service worker responderam corretamente.
- APIs: validação de entradas, proteção do monitor, rejeição de origem externa e resposta push sem chave privada passaram.

O teste do banco usou SQLite local. A conexão com seu Turso remoto, o upgrade WebSocket na Vercel e a entrega push em dispositivos reais dependem das credenciais e da hospedagem final. O código foi publicado no repositório público https://github.com/alejandroBR17/observatorio-do-voto. O deploy na Vercel ainda não foi realizado.

Execute `npm ci`, `npm run typecheck`, `npm test` e `npm run build` para repetir os checks. O script `scripts/smoke.mjs` verifica um servidor em execução; use `TEST_URL` para definir sua URL.

O ZIP contém somente código, configurações, documentação e assets. Não contém credenciais, banco local, dependências instaladas ou arquivos de build.

