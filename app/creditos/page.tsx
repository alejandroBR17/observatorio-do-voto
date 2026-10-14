import Link from 'next/link';
import { sharingMetadata } from '@/lib/site-metadata';

const description =
  'Créditos, fontes e licenças das imagens, dados eleitorais, mapas e componentes do Observatório do Voto.';
export const metadata = {
  title: 'Créditos e licenças',
  description,
  ...sharingMetadata('Créditos e licenças | Observatório do Voto', description, '/creditos'),
};

export default function Credits() {
  return (
    <main className="legal-page">
      <Link href="/" className="text-button">
        ← Voltar ao Observatório
      </Link>
      <span className="eyebrow">FONTES E DIREITOS DE USO</span>
      <h1>Créditos e licenças</h1>
      <p>
        O Observatório é independente. A presença de uma imagem não representa apoio do retratado ou
        do autor ao projeto. A licença MIT do código não substitui as licenças destes materiais.
      </p>
      <section>
        <h2>Retrato de Flávio Bolsonaro</h2>
        <p>
          Carlos Moura / Agência Senado, 1º de setembro de 2026. Fotografia de discurso no Plenário
          do Senado, publicada pela Agência Senado e recortada no Wikimedia Commons.
        </p>
        <p>
          <a
            href="https://www.flickr.com/photos/agenciasenado/55503128699/"
            target="_blank"
            rel="noreferrer"
          >
            Publicação original
          </a>{' '}
          ·{' '}
          <a
            href="https://commons.wikimedia.org/wiki/File:Fl%C3%A1vio_Bolsonaro_01.09.26.jpg"
            target="_blank"
            rel="noreferrer"
          >
            Arquivo e histórico do recorte
          </a>{' '}
          ·{' '}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 4.0
          </a>
          .
        </p>
        <p>
          Utilizamos a miniatura de 500 pixels do recorte disponibilizado no Commons. A imagem foi
          redimensionada pela plataforma e pode ter seu enquadramento ajustado na interface. A
          imagem e essas adaptações permanecem sob CC BY-SA 4.0; isso não altera a licença do código
          do aplicativo.
        </p>
      </section>
      <section>
        <h2>Retrato de Lula</h2>
        <p>
          Ricardo Stuckert / Presidência da República, publicado pelo Palácio do Planalto em 2023.
          Retrato oficial recortado no Wikimedia Commons por Yacàwotçã.
        </p>
        <p>
          <a
            href="https://www.flickr.com/photos/palaciodoplanalto/52715235994/"
            target="_blank"
            rel="noreferrer"
          >
            Publicação original
          </a>{' '}
          ·{' '}
          <a
            href="https://commons.wikimedia.org/wiki/File:Foto_oficial_de_Luiz_In%C3%A1cio_Lula_da_Silva_(estreita).jpg"
            target="_blank"
            rel="noreferrer"
          >
            Arquivo e histórico do recorte
          </a>{' '}
          ·{' '}
          <a
            href="https://creativecommons.org/licenses/by/2.0/deed.pt-br"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 2.0
          </a>
          .
        </p>
        <p>
          Utilizamos a miniatura de 500 pixels do recorte disponibilizado no Commons, redimensionada
          pela plataforma. A interface pode ajustar o enquadramento para o cartão. O uso mantém
          autoria, fonte e licença identificadas.
        </p>
      </section>
      <section>
        <h2>Notícias, mapas e dados</h2>
        <p>
          Notícias mantêm veículo, data e link da publicação. Imagens externas pertencem aos
          respectivos titulares; sua disponibilidade pública não equivale a uma licença geral de
          reprodução. Não reproduzimos os textos integrais das matérias. Pedidos de correção ou
          retirada podem ser enviados ao contato indicado nos Termos.
        </p>
        <p>
          Os resultados eleitorais indicam a fonte pública do TSE. A malha estadual vem do IBGE. A
          cobertura SapiensLabs — Eleições 2026 é identificada com CC BY 4.0 na tela de cobertura.
          Fontes e metodologia podem ser consultadas no aplicativo.
        </p>
      </section>
      <section>
        <h2>Código e interface</h2>
        <p>
          Código original: MIT. Ícones Lucide: ISC. Menu Radix UI: MIT. Manrope e DM Sans: SIL Open
          Font License, com licenças no repositório. Os demais pacotes mantêm suas próprias
          licenças.
        </p>
        <p>
          <a
            href="https://github.com/alejandroBR17/observatorio-do-voto/blob/main/NOTICE.md"
            target="_blank"
            rel="noreferrer"
          >
            Consultar atribuições no GitHub
          </a>
          .
        </p>
      </section>
      <Link href="/termos" className="text-button">
        Termos de Uso →
      </Link>
    </main>
  );
}
