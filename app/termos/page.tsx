import Link from 'next/link';
import { privacyContact } from '@/lib/privacy';
import { sharingMetadata } from '@/lib/site-metadata';
const description =
  'Condições de uso do Observatório do Voto, fontes eleitorais e responsabilidades do projeto independente.';
export const metadata = {
  title: 'Termos de Uso',
  description,
  ...sharingMetadata('Termos de Uso | Observatório do Voto', description, '/termos'),
};
export default function Terms() {
  return (
    <main className="legal-page">
      <Link href="/" className="text-button">
        ← Voltar ao Observatório
      </Link>
      <span className="eyebrow">VERSÃO DE 13 DE OUTUBRO DE 2026</span>
      <h1>Termos de Uso</h1>
      <p>
        O Observatório do Voto é um projeto independente e gratuito de informação sobre eleições
        presidenciais brasileiras. Não representa o TSE, partidos, candidaturas, institutos de
        pesquisa ou veículos de imprensa. O responsável pelo serviço é {privacyContact.name}.
        Contato: <a href={`mailto:${privacyContact.email}`}>{privacyContact.email}</a>.
      </p>
      <section>
        <h2>O que o serviço oferece</h2>
        <p>
          Você pode consultar resultados públicos, pesquisas, notícias e simulações; personalizar a
          apresentação no aparelho; e, se desejar, receber notificações. Não há conta de usuário,
          cobrança, identificação de eleitor, publicidade direcionada por escolha política ou acesso
          ao voto individual. Os votos apresentados por município, colégio, zona ou seção são totais
          públicos; não revelam em quem uma pessoa votou.
        </p>
      </section>
      <section>
        <h2>Fontes, pesquisas e apuração</h2>
        <p>
          As informações são apresentadas com suas fontes, datas e contexto. Pesquisas refletem
          entrevistas realizadas em um período e não são previsões garantidas. Institutos, amostras,
          métodos e bases de cálculo podem diferir. Simulações são hipóteses criadas a partir dos
          parâmetros indicados na tela; não são levantamentos registrados.
        </p>
        <p>
          Resultados parciais podem mudar. Uma vantagem numericamente irreversível depende dos dados
          oficiais disponíveis e das regras indicadas pelo app; não substitui a confirmação do
          candidato eleito pelo TSE. Correções ou indisponibilidade das fontes podem alterar o que
          aparece no serviço. Confira a publicação original e o registro da pesquisa antes de
          reutilizar informações.
        </p>
      </section>
      <section>
        <h2>Notificações são opcionais</h2>
        <p>
          Aceitar estes termos não ativa alertas. A ativação exige uma autorização separada e a
          permissão do navegador. Você escolhe categorias e frequência em Alertas. A entrega depende
          da conexão, do aparelho, do sistema operacional e dos serviços de push; pode atrasar ou
          falhar. O app pode entregar avisos em segundo plano sem estar aberto, enquanto a inscrição
          estiver válida.
        </p>
        <p>
          Você pode cancelar em Desativar neste aparelho. O app confirma a remoção no servidor e
          informa quando não consegue concluí-la. Um aviso que já tenha sido enviado ao provedor
          ainda pode chegar depois do cancelamento. As condições de tratamento dos dados estão no{' '}
          <Link href="/privacidade">Aviso de Privacidade</Link>.
        </p>
      </section>
      <section>
        <h2>Seu espaço no aparelho</h2>
        <p>
          Nome ou apelido, escolha de candidato, anotações e preferências pessoais ficam no
          navegador. A escolha de candidato é opcional e pode ser removida ao acompanhar os dois.
          Pessoas com acesso ao aparelho podem visualizar o que ficou salvo. Limpar os dados do site
          pode apagar esse conteúdo; não há recuperação por conta nem sincronização pessoal entre
          dispositivos.
        </p>
        <p>
          Compartilhar uma consulta gera um link com os filtros selecionados, que podem incluir
          município, colégio, zona ou seção. O link não inclui seu perfil ou caderno. Esses filtros
          identificam o resultado consultado, não comprovam onde você votou. Revise o link antes de
          compartilhar.
        </p>
      </section>
      <section>
        <h2>Uso responsável e conteúdo de terceiros</h2>
        <p>
          Ao reproduzir ou compartilhar informações, preserve a fonte, a data e a indicação de
          resultado parcial, pesquisa ou simulação. Não utilize o serviço para acessar dados
          privados, explorar falhas, prejudicar outros usuários, interromper a infraestrutura ou
          apresentar o projeto como serviço oficial.
        </p>
        <p>
          Matérias, marcas e imagens de terceiros permanecem sujeitas aos direitos de seus
          titulares. O app oferece referências e links; estes termos não concedem uma licença sobre
          esse conteúdo. A licença MIT do código não se estende automaticamente às fotos,
          publicações e demais materiais de terceiros. Pedidos fundamentados de correção ou retirada
          podem ser enviados ao contato acima, com o link e a descrição do problema.
        </p>
        <p>
          <Link href="/creditos">Consultar os créditos das imagens e suas licenças.</Link>
        </p>
      </section>
      <section>
        <h2>Disponibilidade e responsabilidade</h2>
        <p>
          O serviço usa fornecedores externos e é mantido como projeto gratuito. Pode passar por
          manutenção, sofrer interrupções ou ter funcionalidades alteradas. Não há promessa de
          disponibilidade contínua, entrega instantânea de alertas ou precisão infalível. Mantemos
          mecanismos de atualização e identificação das fontes e procuramos corrigir falhas
          comunicadas.
        </p>
        <p>
          Essas limitações não excluem responsabilidade legal, direitos dos usuários ou obrigações
          de proteção de dados. Nenhuma cláusula implica renúncia a direitos previstos na legislação
          aplicável.
        </p>
      </section>
      <section>
        <h2>Menores de idade</h2>
        <p>
          O conteúdo público pode ser consultado sem informar idade ou dados pessoais. Crianças e
          adolescentes devem utilizar recursos opcionais com orientação de seu responsável quando
          necessário. Não solicitamos documentos, não buscamos identificar menores e não usamos a
          preferência política para publicidade. O melhor interesse de crianças e adolescentes deve
          orientar o uso desses recursos.
        </p>
      </section>
      <section>
        <h2>Versões, aceite e atendimento</h2>
        <p>
          O aceite desta versão fica registrado no aparelho com a data e a versão do aviso de
          privacidade apresentado. Alterações relevantes serão destacadas por uma nova versão;
          usuários que já fizeram a personalização podem revisar o aceite sem refazer suas escolhas.
          Novas finalidades de tratamento dependem das autorizações aplicáveis e não são autorizadas
          automaticamente pela atualização destes termos.
        </p>
        <p>
          Aplica-se a legislação brasileira, sem afastar direitos, proteção do consumidor quando
          aplicável ou regras legais sobre o foro competente. Para dúvidas, privacidade,
          acessibilidade, correções ou reclamações, escreva para{' '}
          <a href={`mailto:${privacyContact.email}`}>{privacyContact.email}</a>. Não publique dados
          pessoais ou chaves de notificações no repositório público.
        </p>
        <p>
          <Link className="text-button" href="/termos/versoes/2026-10-09">
            Consultar a versão anterior, de 9/10/2026 →
          </Link>
        </p>
      </section>
      <Link className="text-button" href="/privacidade">
        Ler o Aviso de Privacidade →
      </Link>
    </main>
  );
}
