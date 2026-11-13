import { ArrowUpRight, ChartNoAxesColumnIncreasing } from 'lucide-react';
import type { Publication } from '@/lib/polls/types';

type Finding = {
  label: string;
  value: number;
  display?: string;
  scale?: number;
};

type Study = {
  volume: number;
  subject: string;
  summary: string;
  findings: Finding[];
  primary: string;
  context: string;
  note?: string;
};

const studies: Study[] = [
  {
    volume: 1,
    subject: 'Reações ao resultado das urnas',
    summary: 'Alegria, alívio e esperança foram as reações mais citadas à vitória de Lula.',
    findings: [
      { label: 'Alegria', value: 18 },
      { label: 'Alívio', value: 14 },
      { label: 'Esperança', value: 12 },
      { label: 'Brasil saiu mais dividido', value: 81 },
    ],
    primary:
      'https://quaest.com.br/wp-content/uploads/2026/11/1.QUAESTBRASILDEPOISURNASNOV26VOL1.pdf',
    context:
      'https://red.org.br/noticias/quaest-pos-eleicao-do-medo-de-perder-direitos-a-cobranca-por-resultados-no-governo-lula/',
  },
  {
    volume: 2,
    subject: 'Expectativas para o próximo governo',
    summary: 'O otimismo com o futuro do país convive com preocupação sobre a economia.',
    findings: [
      { label: 'Mais otimistas com o futuro do Brasil', value: 44 },
      { label: 'Mais preocupados com o futuro do Brasil', value: 48 },
      { label: 'Esperam melhora na economia', value: 39 },
      { label: 'Esperam piora na economia', value: 39 },
    ],
    primary: 'https://quaest.com.br/wp-content/uploads/2026/11/2.QUAESTBRASILDEPOISURNASVOL2.pdf',
    context: 'https://timesbrasil.com.br/brasil/otimismo-futuro-brasil-supera-2022-quaest/',
    note: 'As duas últimas respostas são expectativas para a economia nos próximos 12 meses.',
  },
  {
    volume: 3,
    subject: 'Polarização afetiva',
    summary: 'O índice nacional recuou em relação a 2022, mas segue alto na escala usada.',
    findings: [
      { label: '2026', value: 6.6, display: '6,6 de 10', scale: 10 },
      { label: '2022', value: 6.9, display: '6,9 de 10', scale: 10 },
      { label: 'Rompimento de relações por política · 2026', value: 10 },
      { label: 'Rompimento de relações por política · 2023', value: 36 },
    ],
    primary:
      'https://quaest.com.br/wp-content/uploads/2026/11/3.QUAESTBRASILDEPOISURNASVOL3POLARIZACAO.pdf',
    context:
      'https://www.terra.com.br/noticias/brasil/politica/conflitos-familiares-por-politica-recuam-aponta-pesquisa-da-quaest-sobre-impacto-da-polarizacao,9bf734e66007c37d94c4ebf9ce59f5e4ph6i142d.html',
    note: 'O índice vai de 0 a 10. O rompimento se refere a quem disse já ter rompido relações familiares por política.',
  },
  {
    volume: 4,
    subject: 'Preferência e satisfação com a democracia',
    summary:
      'A satisfação com o funcionamento da democracia ficou ligeiramente acima da insatisfação.',
    findings: [
      { label: 'Satisfeitos com o funcionamento da democracia', value: 48 },
      { label: 'Insatisfeitos', value: 46 },
      { label: 'Preferem a democracia a qualquer outro regime', value: 65 },
      { label: 'Dizem que uma ditadura pode ser preferível', value: 9 },
    ],
    primary:
      'https://quaest.com.br/wp-content/uploads/2026/11/4.QUAESTBRASILDEPOISURNASVOL4DEMOCRACIA.pdf',
    context:
      'https://www1.folha.uol.com.br/poder/2026/11/quaest-satisfacao-com-a-democracia-bate-recorde-mas-preferencia-pelo-regime-cai-entre-jovens.shtml',
    note: 'Comparações com anos anteriores exigem cautela: a formulação e a forma de registrar respostas mudaram.',
  },
  {
    volume: 5,
    subject: 'Identificação política e competição eleitoral',
    summary: 'A pesquisa também agrupou as pessoas conforme sua identificação política declarada.',
    findings: [
      { label: 'Lulistas', value: 19 },
      { label: 'Esquerda não lulista', value: 14 },
      { label: 'Independentes', value: 32 },
      { label: 'Direita não bolsonarista', value: 21 },
      { label: 'Bolsonaristas', value: 12 },
    ],
    primary:
      'https://quaest.com.br/wp-content/uploads/2026/11/5.QUAESTBRASILDEPOISURNASVOL5PARTIDARISMO.pdf',
    context:
      'https://jc.uol.com.br/politica/2026/11/09/lula-nao-tera-lua-de-mel-grande-com-eleitor-independente-diz-diretor-da-quaest.html',
    note: 'São grupos de identificação política, não intenções de voto. Os percentuais resumidos somam 98%.',
  },
];

function volumeOf(publication: Publication) {
  const titleMatch = publication.title.match(/volume\s*(\d+)/i);
  if (titleMatch) return Number(titleMatch[1]);
  return /o-brasil-depois-das-urnas-05-11-2026/i.test(publication.url) ? 1 : null;
}

export function isCuratedPostElectionPublication(publication: Publication) {
  const volume = volumeOf(publication);
  return volume != null && studies.some((study) => study.volume === volume);
}

export function PostElectionResults({ publications }: { publications: Publication[] }) {
  const available = new Map(
    publications
      .map((publication) => [volumeOf(publication), publication] as const)
      .filter((entry): entry is readonly [number, Publication] => entry[0] != null),
  );
  const visibleStudies = studies.filter((study) => available.has(study.volume));
  if (!visibleStudies.length) return null;

  return (
    <section className="panel post-election-studies" aria-labelledby="post-election-studies-title">
      <div className="panel-head">
        <div>
          <span className="eyebrow">DEPOIS DAS URNAS · RESULTADOS</span>
          <h2 id="post-election-studies-title">O que as pesquisas encontraram</h2>
        </div>
        <ChartNoAxesColumnIncreasing size={22} aria-hidden="true" />
      </div>
      <p className="fine post-election-intro">
        Agora os principais resultados aparecem aqui, sem precisar abrir uma reportagem. Os cinco
        volumes são temas da mesma pesquisa pós-eleitoral — não são cinco coletas independentes e
        não medem intenção de voto.
      </p>
      <div className="post-election-method">
        <strong>Como foi feita</strong>
        <span>
          2.004 entrevistas presenciais com pessoas de 16 anos ou mais · 30/10 a 02/11/2026 · margem
          de erro de 2 pontos percentuais · confiança de 95% · contratada por O Globo.
        </span>
      </div>
      <div className="post-election-grid">
        {visibleStudies.map((study) => {
          const publication = available.get(study.volume)!;
          return (
            <article className="post-election-card" key={study.volume}>
              <div className="post-election-card-heading">
                <span className="eyebrow">
                  QUAEST · VOLUME {String(study.volume).padStart(2, '0')}
                </span>
                <h3>{study.subject}</h3>
                <p>{study.summary}</p>
              </div>
              <div className="post-election-findings">
                {study.findings.map((finding) => (
                  <div className="post-election-finding" key={finding.label}>
                    <div className="post-election-finding-label">
                      <span>{finding.label}</span>
                      <strong>{finding.display || `${finding.value}%`}</strong>
                    </div>
                    <div
                      className="post-election-meter"
                      role="img"
                      aria-label={`${finding.label}: ${finding.display || `${finding.value}%`}`}
                    >
                      <span
                        style={{
                          width: `${Math.min(100, (finding.value / (finding.scale || 100)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {study.note && <p className="post-election-note">{study.note}</p>}
              <div className="post-election-links">
                <a href={study.primary} target="_blank" rel="noreferrer">
                  Relatório original
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
                <a href={study.context} target="_blank" rel="noreferrer">
                  Contexto e análise
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
                <a href={publication.url} target="_blank" rel="noreferrer">
                  Página da pesquisa
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
