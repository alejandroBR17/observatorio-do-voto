import {
  ArrowUpRight,
  History,
  MapPinned,
  ScanLine,
  Radio,
  ChartNoAxesCombined,
} from 'lucide-react';

const lenses = [
  {
    id: 'municipality',
    number: '01',
    title: 'O território',
    description: 'Do país à sua seção. Veja como cada lugar votou.',
    action: 'Explorar os lugares',
    Icon: MapPinned,
  },
  {
    id: 'history',
    number: '02',
    title: 'O tempo',
    description: 'Volte às eleições anteriores e acompanhe o que mudou.',
    action: 'Consultar o acervo',
    Icon: History,
  },
  {
    id: 'polls',
    number: '03',
    title: 'Os sinais',
    description: 'Compare pesquisas, períodos de coleta e diferentes institutos.',
    action: 'Observar as pesquisas',
    Icon: ChartNoAxesCombined,
  },
] as const;

export function ObservationDesk({
  liveStatus,
  onGo,
}: {
  liveStatus: string;
  onGo: (tab: string) => void;
}) {
  const live = liveStatus === 'live';
  const waiting = liveStatus === 'waiting';
  return (
    <section className="observation-desk" aria-labelledby="observation-title">
      <div className="observation-intro">
        <div className="observation-copy">
          <span className="eyebrow">
            <ScanLine size={14} aria-hidden="true" /> UM PAÍS. DIFERENTES PERSPECTIVAS.
          </span>
          <h2 id="observation-title">
            Olhe além
            <br />
            do placar.
          </h2>
          <p>
            O voto tem um lugar, uma história e um contexto. Aproxime o olhar para entender o que os
            números mostram — e o que ainda está em aberto.
          </p>
          <div className="observation-principles">
            <span>Fontes à vista</span>
            <span>Histórico preservado</span>
            <span>Sem torcida</span>
          </div>
        </div>
        <div className="observation-lens" aria-hidden="true">
          <span className="lens-coordinate lens-coordinate-top">BR / PRESIDÊNCIA</span>
          <svg viewBox="0 0 300 250" fill="none">
            <path d="M150 18v214M30 125h240" className="lens-guide" />
            <circle cx="150" cy="125" r="100" className="lens-outer" />
            <circle cx="150" cy="125" r="75" className="lens-guide" />
            <circle cx="150" cy="125" r="49" className="lens-inner" />
            <path
              d="M150 76c-31 25-31 73 0 98m0-98c31 25 31 73 0 98M101 125h98"
              className="lens-meridian"
            />
            <circle cx="150" cy="125" r="7" className="lens-point" />
            <circle cx="229" cy="64" r="6" className="lens-point" />
            <path d="M150 76v-16m49 65h16m-114 0H85m65 49v16" className="lens-inner" />
          </svg>
          <span className="lens-coordinate lens-coordinate-bottom">
            TERRITÓRIO · TEMPO · CONTEXTO
          </span>
        </div>
      </div>
      <div className="observation-lenses">
        {lenses.map(({ id, number, title, description, action, Icon }) => (
          <button
            key={id}
            onClick={() => onGo(id)}
            className="observation-route"
            aria-label={`${title}: ${action}`}
          >
            <span className="observation-route-top">
              <span>{number} / PERSPECTIVA</span>
              <Icon size={21} aria-hidden="true" />
            </span>
            <strong>{title}</strong>
            <span className="observation-route-description">{description}</span>
            <span className="observation-route-action">
              {action}
              <ArrowUpRight size={17} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
      <div className="observation-watch">
        <Radio size={18} aria-hidden="true" />
        <div>
          <strong>
            {live
              ? 'A apuração está em andamento.'
              : waiting
                ? 'Próxima observação: o segundo turno.'
                : 'Acompanhe a apuração oficial.'}
          </strong>
          <span>
            {waiting
              ? '25 de outubro · votação das 8h às 17h · horário de Brasília'
              : 'Consulte a situação e os resultados publicados pelo TSE.'}
          </span>
        </div>
        <button className="button secondary" onClick={() => onGo('live')}>
          {live ? 'Abrir apuração' : 'Ver acompanhamento'}
          <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
