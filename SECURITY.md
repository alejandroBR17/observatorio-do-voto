# Segurança

Não publique vulnerabilidades com detalhes de exploração, credenciais, endpoints de inscrições ou dados pessoais em uma issue pública.

Use a opção **Report a vulnerability** na [aba Security](https://github.com/alejandroBR17/observatorio-do-voto/security) para um relato privado. Inclua o componente afetado, passos mínimos de reprodução, impacto e versão ou commit. Não envie dados reais de terceiros; prefira um exemplo isolado.

O projeto mantém correções na branch `main`. Não há um prazo de resposta garantido nem um programa de recompensas.

Para a hospedagem, mantenha tokens e chaves em variáveis do servidor, use banco separado em Preview e não publique `.env.local`, bancos locais ou logs com dados de inscrições. Em caso de exposição, revogue a credencial no provedor e substitua-a; remover o arquivo do último commit não remove o histórico.
