import Link from 'next/link';
import { privacyContact } from '@/lib/privacy';
export const metadata = { title: 'Privacidade' };
export default function Privacy() {
  return (
    <main className="legal-page">
      <Link href="/" className="text-button">
        ← Voltar ao Observatório
      </Link>
      <span className="eyebrow">VERSÃO DE 13 DE OUTUBRO DE 2026</span>
      <h1>Seu navegador, suas escolhas.</h1>
      <p>
        Este aviso explica como o Observatório do Voto trata informações para oferecer seu conteúdo
        e seus recursos opcionais. O responsável pelas decisões de tratamento é{' '}
        {privacyContact.name}. Solicitações privadas:{' '}
        <a href={`mailto:${privacyContact.email}`}>{privacyContact.email}</a>.
      </p>
      <section>
        <h2>O que fica somente no aparelho</h2>
        <p>
          Nome ou apelido, candidato escolhido, estados seguidos, cidade consultada, caderno, tema e
          nível de detalhe ficam no armazenamento local. Também ficam no aparelho o aceite dos
          termos e as escolhas de privacidade. O app não envia nome, candidato escolhido ou
          anotações ao banco central ou ao Analytics.
        </p>
        <p>
          A preferência política pode ser um dado sensível. Escolher um candidato é opcional e serve
          somente para a apresentação local. Ao escolher, você autoriza guardar essa preferência no
          aparelho; acompanhar os dois remove a escolha. Não inferimos o voto individual nem criamos
          perfis políticos de visitantes.
        </p>
        <p>
          As informações locais permanecem até você editar, apagar ou limpar os dados do site. O
          histórico de notificações usa IndexedDB, limitado a 50 entradas visíveis dos últimos 30
          dias, e pode ser limpo em Alertas. Dados do aparelho podem ser vistos por outras pessoas
          que tenham acesso a ele. Limpar o armazenamento local não cancela, por si só, uma
          inscrição que ainda esteja no servidor.
        </p>
      </section>
      <section id="notificacoes">
        <h2>Dados necessários para notificações</h2>
        <p>
          Ao ativar, o servidor recebe o endereço de entrega, as chaves de criptografia da
          inscrição, as categorias e a frequência selecionadas. Registra também a versão, o conteúdo
          e a data da autorização apresentada naquela ativação. Isso permite entregar alertas,
          respeitar suas escolhas e evitar duplicidades. Não solicitamos CPF, título de eleitor,
          senha, telefone ou seu endereço residencial.
        </p>
        <p>
          A base para a ativação opcional é sua autorização específica, separada dos Termos de Uso e
          da permissão do navegador. Você pode recusar e continuar consultando o conteúdo.
          Inscrições anteriores não são tratadas como aceite retroativo desta versão: a
          sincronização técnica mantém a inscrição existente e não inventa uma nova data de
          consentimento. Ao revisar a autorização e usar Atualizar inscrição, o servidor registra a
          nova manifestação.
        </p>
        <p>
          O endereço, as chaves, as preferências e a autorização permanecem enquanto a inscrição
          estiver ativa. Desativar neste aparelho solicita a remoção da inscrição, da autorização e
          dos registros associados no banco ativo. Uma falha é informada para que você possa tentar
          novamente. Inscrições que o provedor considera expiradas também são removidas.
        </p>
        <p>
          Os registros técnicos de testes, recibos e entregas usados pelo app têm prazo de 48 horas.
          A limpeza ocorre no monitoramento periódico; se ele for interrompido, ocorre na próxima
          execução bem-sucedida. Um aviso já entregue ao provedor pode aparecer mesmo após o
          cancelamento. Cópias de infraestrutura e logs dos fornecedores têm ciclos próprios,
          descritos abaixo.
        </p>
      </section>
      <section id="estatisticas">
        <h2>Estatísticas de acesso, se você autorizar</h2>
        <p>
          O Vercel Web Analytics fica desligado até uma escolha explícita nas boas-vindas ou no
          Perfil. Essa autorização é opcional, separada dos termos e das notificações, e inclui o
          processamento necessário fora do Brasil. A escolha, sua versão e sua data ficam neste
          navegador; não criamos uma conta ou um identificador central para esse aceite.
        </p>
        <p>
          Quando autorizado, o serviço mede visualizações e visitantes e apresenta relatórios sobre
          navegador, dispositivo e localização aproximada. O app remove parâmetros e fragmentos das
          URLs antes de enviar uma visualização. Não envia escolhas políticas, anotações, nomes ou
          eventos personalizados sobre preferências. A Vercel informa que não usa cookies de
          rastreamento no Web Analytics e emprega um identificador temporário descartado após 24
          horas. Isso não significa que toda informação técnica seja sempre anônima.
        </p>
        <p>
          Você pode desativar a opção no Perfil: novas visualizações deixam de ser enviadas. Os
          relatórios já produzidos não são apagados automaticamente por essa escolha. Consulte a{' '}
          <a
            href="https://vercel.com/docs/analytics/privacy-policy"
            target="_blank"
            rel="noreferrer"
          >
            documentação do serviço
          </a>{' '}
          e utilize o contato de privacidade quando necessário.
        </p>
      </section>
      <section>
        <h2>Hospedagem, fontes e imagens externas</h2>
        <p>
          Ao acessar qualquer site, a infraestrutura recebe informações técnicas necessárias à
          requisição, como IP, horário e navegador. A Vercel hospeda o serviço e pode manter
          registros para operação, segurança e prevenção de abuso. Esse tratamento necessário não
          depende da autorização opcional de Analytics; suas finalidades são fornecer o serviço
          solicitado, proteger sua disponibilidade e cumprir obrigações aplicáveis.
        </p>
        <p>
          Imagens de notícias podem ser carregadas diretamente dos veículos quando o cartão se
          aproxima da tela. Nesse caso, o fornecedor recebe uma requisição do navegador, incluindo
          informações técnicas, e aplicam-se também suas regras e as configurações do navegador. O
          app solicita que o endereço da página não seja enviado como referência. Abrir uma matéria
          externa leva ao site de destino, sujeito ao respectivo aviso de privacidade.
        </p>
        <p>
          Resultados e publicações de fontes públicas são mantidos em cache para reduzir consultas.
          Ao compartilhar um resultado, o link contém somente os filtros escolhidos, que podem
          incluir município, colégio, zona ou seção. O link não contém seu perfil ou caderno e não
          prova onde você votou. Não há localização precisa automática nem consulta à identidade de
          eleitores.
        </p>
      </section>
      <section id="transferencias">
        <h2>Fornecedores e processamento fora do Brasil</h2>
        <p>
          O banco Turso de produção está nos Estados Unidos. A Vercel e os serviços de push do
          navegador — como Google, Apple, Mozilla ou Microsoft — podem processar dados em outros
          países. Para os alertas, o app solicita uma autorização destacada para enviar o endereço,
          as chaves e as preferências necessários a essa entrega. Para Analytics, solicita uma
          autorização opcional própria. Nenhuma delas autoriza publicidade política direcionada ou
          venda de suas preferências.
        </p>
        <p>
          Mensagens que você enviar ao contato de privacidade são recebidas em uma caixa Gmail,
          sujeita ao processamento de e-mail do Google. Use esse canal somente com informações
          necessárias à solicitação. Não envie chaves de criptografia, senhas, documentos de eleitor
          ou o conteúdo de seu caderno por padrão.
        </p>
        <p>
          Hospedagem, entrega de mensagens, armazenamento, logs e eventuais cópias de segurança
          também seguem os contratos e as políticas dos fornecedores. Não prometemos exclusão
          instantânea de cópias de infraestrutura ou uma localização única para todo o
          processamento. Solicitações relativas a esses ambientes serão avaliadas e encaminhadas
          quando necessário, conforme os direitos e as obrigações aplicáveis.
        </p>
      </section>
      <section id="direitos">
        <h2>Como exercer seus direitos</h2>
        <p>
          Você pode perguntar se há tratamento de seus dados, solicitar acesso, pedir correção,
          contestar tratamento irregular, pedir exclusão ou anonimização quando cabível, obter
          informação sobre fornecedores e retirar autorizações opcionais. Pode solicitar
          portabilidade e revisão de decisões automatizadas quando aplicáveis. O app não decide
          elegibilidade, benefícios ou direitos das pessoas com base em preferência política.
        </p>
        <p>
          Para dados locais, edite as preferências, remova entradas do caderno e limpe o histórico
          em Alertas. Para cancelar a entrega e remover a inscrição no banco, use Desativar neste
          aparelho antes de limpar os dados do site. As permissões do navegador podem ser revogadas
          também nas configurações do sistema.
        </p>
        <p>
          Para pedidos privados, escreva para{' '}
          <a href={`mailto:${privacyContact.email}`}>{privacyContact.email}</a> indicando o tipo de
          solicitação. O atendimento é gratuito e observa os prazos legais. Podemos pedir somente o
          necessário para localizar o registro ou proteger dados contra acesso por terceiros; não
          exigimos documentos por padrão. O projeto não associa uma inscrição de push ao seu nome ou
          e-mail. Se você não conservar os identificadores do aparelho, a identificação de registros
          pode ser limitada.
        </p>
        <p>
          Se uma solicitação não puder ser atendida integralmente, explicaremos o motivo, inclusive
          eventuais obrigações de conservação. Você pode recorrer à ANPD e aos demais órgãos
          competentes. Mensagens de atendimento são utilizadas para responder ao pedido e conservar
          o que for necessário ao cumprimento de obrigações ou exercício de direitos; não são usadas
          para campanhas de marketing.
        </p>
      </section>
      <section>
        <h2>Segurança e menores de idade</h2>
        <p>
          Usamos HTTPS, validação de entradas e fontes, autorização do monitor e armazenamento das
          chaves no servidor. As notificações são criptografadas para a inscrição do aparelho. Essas
          medidas reduzem riscos, mas não garantem segurança absoluta. Não compartilhe o aparelho ou
          seus dados de inscrição com pessoas não autorizadas. Suspeitas de incidente podem ser
          comunicadas ao contato privado; incidentes relevantes serão avaliados e tratados conforme
          as obrigações legais.
        </p>
        <p>
          O conteúdo público pode ser consultado sem cadastro. Não solicitamos idade ou documentos e
          não fazemos publicidade política direcionada a crianças ou adolescentes. Recursos
          opcionais devem observar seu melhor interesse e a orientação do responsável quando
          exigida. O responsável pode solicitar esclarecimentos e providências sobre os dados.
        </p>
      </section>
      <section>
        <h2>Atualizações deste aviso</h2>
        <p>
          Alterações relevantes são identificadas por uma nova versão. Aceitar os termos não
          autoriza automaticamente Analytics ou push; novas finalidades que dependam de
          consentimento exigem uma manifestação própria. A informação aqui descreve o funcionamento
          do app e não limita seus direitos.
        </p>
        <p>
          <Link className="text-button" href="/privacidade/versoes/2026-10-10">
            Consultar o aviso anterior, de 10/10/2026 →
          </Link>
        </p>
      </section>
      <Link className="text-button" href="/termos">
        Ler os Termos de Uso →
      </Link>
    </main>
  );
}
