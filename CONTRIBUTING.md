# Contribuir com o Observatório do Voto

Correções de interface, acessibilidade, fontes e testes são bem-vindas. Antes de uma mudança grande, abra uma issue com o problema e uma proposta concreta.

## Preparar o ambiente

Use Node.js 24 e npm. Clone o repositório, execute `npm ci` e copie `.env.example` para `.env.local`. O exemplo usa SQLite local; não precisa de credenciais de produção.

```sh
npm run db:init
npm run dev
```

Abra `http://localhost:3000`. Consulte a [arquitetura](docs/architecture.md) e o [guia de publicação](DEPLOY.md) para o banco remoto e as notificações.

## Enviar uma alteração

1. Crie uma branch com um nome que descreva a mudança.
2. Preserve o comportamento e a identidade visual nas refatorações. Inclua capturas de desktop e celular quando alterar a interface.
3. Use tipos específicos nas fronteiras de dados. Respostas externas devem ser validadas antes de alimentar a interface ou os alertas.
4. Execute `npm run format`, `npm run check` e `npm run build`.
5. Abra um pull request explicando o problema, a solução e como verificou a mudança.

## Dados eleitorais

- Resultados oficiais precisam manter fonte, eleição, turno e data identificáveis. Nunca substitua uma falha de consulta por números inventados ou zeros.
- Não deduza percentuais de pesquisas a partir de manchetes. Registre a metodologia, a base, a data de publicação e o link verificável.
- Cenários pessoais não são previsões ou pesquisas. Não use a ordem de apuração como amostra aleatória para anunciar vitória.
- Atualizações de arquivos em `public/data` precisam passar por `npm run test:data` e manter as atribuições de [NOTICE.md](NOTICE.md).
- Notas e preferências pessoais permanecem locais. Não introduza coleta de preferências políticas ou telemetria sem uma revisão explícita do produto e da privacidade.

## Relatos e segurança

Não coloque tokens, inscrições push, preferências políticas pessoais ou dados do banco em issues, capturas ou logs. Para vulnerabilidades, siga [SECURITY.md](SECURITY.md).

O repositório ainda não declara uma licença geral para o código. Consulte [NOTICE.md](NOTICE.md) antes de redistribuir código ou recursos de terceiros.
