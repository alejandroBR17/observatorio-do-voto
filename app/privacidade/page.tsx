import Link from 'next/link';
export const metadata = { title: 'Privacidade' };
export default function Privacy() {
  return (
    <main className="legal-page">
      <Link href="/" className="source">
        ← Voltar ao Observatório
      </Link>
      <span className="eyebrow">ATUALIZADO EM 10 DE OUTUBRO DE 2026</span>
      <h1>Seu navegador, seu espaço.</h1>
      <p>
        Este aviso explica os dados usados pelo Observatório do Voto. O responsável pela manutenção
        do projeto é o titular do repositório{' '}
        <a
          href="https://github.com/alejandroBR17/observatorio-do-voto"
          target="_blank"
          rel="noreferrer"
        >
          alejandroBR17/observatorio-do-voto
        </a>
        .
      </p>
      <section>
        <h2>O que fica no aparelho</h2>
        <p>
          Nome ou apelido, candidato preferido, estados seguidos, caderno, tema, nível de detalhe,
          versão dos termos aceita e referências das publicações vistas na última visita ficam no
          armazenamento local do navegador. O app não envia seu nome, preferência por candidato ou
          anotações ao banco central. Outro aparelho terá suas próprias escolhas.
        </p>
      </section>
      <section>
        <h2>Quando você ativa notificações</h2>
        <p>
          O servidor recebe o endereço de entrega e as chaves da inscrição, as categorias e a
          frequência escolhidas e os registros necessários para evitar avisos duplicados e verificar
          o teste. Esses dados ficam no banco Turso e são usados para entregar os alertas através do
          provedor push do seu navegador, como Google, Apple, Mozilla ou Microsoft.
        </p>
        <p>
          Cancelar em Alertas remove a inscrição do servidor e do navegador. Registros técnicos de
          eventos e entregas são limpos durante o processamento da fila após 48 horas. Cópias de
          segurança e registros de infraestrutura dependem das políticas dos provedores.
        </p>
      </section>
      <section>
        <h2>Ao visitar e abrir publicações</h2>
        <p>
          A hospedagem na Vercel e os serviços de infraestrutura processam informações técnicas das
          requisições, como endereço IP, horário e navegador. As imagens dos veículos são carregadas
          quando os cartões se aproximam da tela; esses servidores recebem uma requisição do seu
          navegador. O app solicita que o navegador não envie o endereço desta página como
          referência.
        </p>
        <p>
          Ao abrir uma matéria externa, passam a valer as regras de privacidade do site de destino.
          Dados públicos de resultados e cobertura são armazenados em cache para reduzir consultas
          às fontes.
        </p>
      </section>
      <section>
        <h2>Estatísticas de acesso</h2>
        <p>
          Usamos Vercel Web Analytics para acompanhar visitantes e visualizações de páginas, com
          informações agregadas sobre navegador, dispositivo e localização aproximada. Segundo a
          Vercel, o serviço não utiliza cookies de rastreamento e identifica visitas por um hash
          temporário, descartado após 24 horas.
        </p>
        <p>
          O app remove os parâmetros e fragmentos da URL antes de enviar visualizações. Não enviamos
          nome, candidato preferido, anotações ou conteúdo do armazenamento local ao Analytics e não
          registramos eventos personalizados de escolhas políticas. Consulte a{' '}
          <a
            href="https://vercel.com/docs/analytics/privacy-policy"
            target="_blank"
            rel="noreferrer"
          >
            documentação de privacidade da Vercel
          </a>{' '}
          para detalhes do processamento.
        </p>
      </section>
      <section>
        <h2>Suas escolhas</h2>
        <p>
          Você pode editar as preferências no perfil, excluir entradas do caderno, deixar de seguir
          estados e desativar notificações. Para apagar todo o espaço local, limpe os dados deste
          site nas configurações do navegador. A permissão de notificações também pode ser revogada
          nas configurações do navegador.
        </p>
        <p>
          O uso de notificações é opcional e separado da aceitação dos Termos de Uso. Para dúvidas
          ou solicitações privadas, consulte os canais disponíveis no{' '}
          <a href="https://github.com/alejandroBR17" target="_blank" rel="noreferrer">
            perfil do mantenedor
          </a>
          . Não envie informações pessoais pelo rastreador público de problemas.
        </p>
      </section>
      <Link href="/termos">Ler os Termos de Uso →</Link>
    </main>
  );
}
