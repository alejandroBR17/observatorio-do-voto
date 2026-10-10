# Rotas do servidor

As rotas são usadas pelo próprio app; não constituem uma API pública com estabilidade contratual garantida. Executam no runtime Node.js. Consultas de dados retornam status e datas para que a interface diferencie espera, atualização e indisponibilidade.

| Rota                       | Método            | Uso                                                                   |
| -------------------------- | ----------------- | --------------------------------------------------------------------- |
| `/api/live?uf=BR`          | GET               | Apuração nacional ou estadual; UF inválida retorna 400                |
| `/api/polls`               | GET               | Pesquisas verificadas, publicações descobertas e estado de cada fonte |
| `/api/media`               | GET               | Cobertura pública e notícias, com estado da coleta                    |
| `/api/events`              | GET               | Último evento eleitoral persistido ou mensagem de ausência            |
| `/api/article-image?url=…` | GET               | Prévia de imagem para URL permitida; entrada inválida retorna 400     |
| `/api/push`                | GET               | Chave **pública** VAPID; banco indisponível retorna 503               |
| `/api/push`                | POST              | Registra inscrição e categorias de alertas                            |
| `/api/push`                | DELETE            | Remove inscrição e suas chaves pelo endpoint                          |
| `/api/push/test`           | POST              | Envia teste ou consulta confirmação pelo service worker               |
| `/api/push/receipt`        | POST              | Registra recebimento do teste pelo aparelho                           |
| `/api/monitor`             | GET               | Consulta protegida para monitor externo                               |
| `/api/socket`              | GET / upgrade     | Eventos de apuração por WebSocket na Vercel; em `next dev`, 426       |
| `/api/rooms`               | GET, POST, DELETE | Compatibilidade com clientes antigos; recurso retirado, retorna 410   |

## Apuração

O payload pode indicar `waiting`, `loading`, `live` ou `unavailable`. Quando há resultado, `result` contém eleição, turno, UF, fonte, data, percentual de seções totalizadas, eleitorado, votos e candidatos. `victory.kind` distingue confirmação oficial, limite matemático e resultado parcial. Um cache anterior pode ser marcado como `stale`; ele não deve ser apresentado como consulta recente.

O status HTTP e o estado do payload têm funções diferentes: uma resposta HTTP válida pode informar que a fonte está indisponível. Não considere somente `response.ok` para avaliar a atualidade dos dados.

## Inscrições push

O POST de `/api/push` recebe `{ endpoint, subscription, preferences }`; `subscription` é a serialização de `PushSubscription`. O endpoint precisa coincidir com o da inscrição e pertencer a um provedor permitido. Preferências são normalizadas pelas categorias implementadas em `lib/alerts.ts`.

As operações de escrita verificam a origem; origem externa retorna 403 e inscrição inválida, 400. A chave privada VAPID não é retornada. Não registre endpoints ou material criptográfico em logs ou documentação de exemplos.

O teste recebe `{ endpoint }` e retorna um identificador quando o provedor aceita o envio. Uma consulta com `{ endpoint, check: true, id }` verifica o recibo. Há intervalo mínimo de um minuto por inscrição; tentativas antecipadas retornam 429. Aceitação e recibo não comprovam que a pessoa leu o alerta.

## Monitor

`/api/monitor` exige `Authorization: Bearer CRON_SECRET`. Sem configuração, retorna indisponibilidade; sem autorização válida, rejeita a chamada. O workflow do repositório usa as consultas públicas e não precisa desse segredo. Consulte [DEPLOY.md](../DEPLOY.md) para separar os ambientes.
