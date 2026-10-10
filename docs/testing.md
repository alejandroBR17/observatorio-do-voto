# Verificação

## Comandos

| Comando                | Verifica                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `npm run format:check` | Formatação de código e documentação; arquivos de dados e recursos gerados são excluídos |
| `npm run lint`         | Erros estáticos, variáveis sem uso, regras e dependências de hooks                      |
| `npm run typecheck`    | Tipagem TypeScript sem gerar arquivos                                                   |
| `npm run test:data`    | Totais eleitorais, histórico, limites de vitória e leitura das pesquisas                |
| `npm run test:unit`    | Regras de domínio, validação, persistência, concorrência e notificações                 |
| `npm run check`        | Formatação, lint, tipos e todos os testes automatizados                                 |
| `npm run build`        | Compilação de produção do Next.js                                                       |
| `npm run test:smoke`   | HTTP, recursos PWA, metadados e entradas das APIs de uma instância em execução          |

O CI executa `npm ci`, `npm run check` e `npm run build` em pushes e pull requests. Os testes não precisam de tokens de produção. Casos que consultam adaptadores usam respostas controladas; o smoke test consulta fontes reais e depende da disponibilidade externa.

## Smoke test local

Configure `.env.local` com o banco SQLite de desenvolvimento. Após o build, inicie a aplicação com `npm start`. Em outro terminal:

```sh
npm run test:smoke
```

Para outro endereço, use `npm run test:smoke -- http://localhost:3003` ou defina `TEST_URL` antes de executar. O teste consulta APIs e gera a chave VAPID no banco configurado, mas não registra um aparelho nem envia notificações.

## Revisão manual antes de publicar

- Navegação e filtros de eleição, turno, estado e região; retorno pelo histórico do navegador.
- Layout no celular e desktop, expansão independente de cartões, teclado, foco e movimento reduzido.
- Boas-vindas, termos, tema automático e persistência das preferências.
- Criar, editar, excluir e desfazer anotações; conferir indicação de salvamento após recarregar.
- Espera, indisponibilidade, dados parciais e dados finais na apuração, sem exibir uma eleição incorreta.
- Alertas: permissão, inscrição, teste no aparelho e comportamento com a página fechada.
- Na Vercel, conferir WebSocket e fallback HTTP, monitor agendado e banco separado nas prévias.

Testes de servidor não comprovam entrega push pelo sistema operacional. Desktop, Android e iPhone precisam de verificação nos aparelhos e navegadores suportados; no iPhone, verificar a instalação na tela inicial.
