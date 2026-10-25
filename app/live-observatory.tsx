'use client';
import { Bell, Expand, Radio, ShieldCheck } from 'lucide-react';
import { candidates } from '@/lib/content';
import { states, type Result } from '@/lib/elections';
import { candidateColor, formatVotes, formatPercent } from '@/lib/presentation';
import { currentLiveResult, liveMargin } from '@/lib/live-summary';
import { candidateName } from '@/lib/presentation';
import { LiveStateList } from './components/live-state-list';
import { CandidatePortrait } from './components/candidate-portrait';
import { DataFreshness } from './components/data-freshness';
import { Source } from './components/source-link';
import { Progression, type ProgressionPoint } from './components/vote-progression';
import { LiveCountdown } from './live-countdown';
import { Disclosure } from './disclosure';
import { Map } from './geo-map';
import { RegionalResults } from './regional-results';

const countLabel = (value: number) =>
  Number.isFinite(value) ? formatVotes(value) : 'Não informado';

type LiveState = {
  status: string;
  result?: Result;
  lastGood?: Result;
  victory?: { message: string };
  message?: string;
  checkedAt?: string;
  stale?: boolean;
};
export function LiveObservatory({
  live,
  uf,
  region,
  notification,
  points,
  stateResults,
  canPreview,
  onState,
  onRegion,
  onAlerts,
  onNight,
  onHistory,
}: {
  live: LiveState;
  uf: string;
  region: string;
  notification: string;
  points: ProgressionPoint[];
  stateResults: Result[];
  canPreview: boolean;
  onState: (uf: string) => void;
  onRegion: (region: string) => void;
  onAlerts: () => void;
  onNight: () => void;
  onHistory: () => void;
}) {
  const result = currentLiveResult(live, uf);
  const margin = result ? liveMargin(result) : null;
  const unavailable = live.status === 'unavailable' || live.status === 'stale';
  const place = uf === 'BR' ? 'Brasil' : states.find((state) => state[1] === uf)?.[2] || uf;
  if (live.status === 'live' && live.result && live.result.uf !== uf) {
    return (
      <div className="or-live">
        <section className="panel" role="status">
          <h2>Consultando {place}…</h2>
          <p>Os votos deste recorte aparecerão quando a consulta terminar.</p>
          <button className="button secondary" onClick={() => onState('BR')}>
            Voltar ao Brasil
          </button>
        </section>
      </div>
    );
  }
  return (
    <div className="or-live">
      <div className="or-live-status" role="status">
        <span>
          <Radio size={16} aria-hidden="true" />
          {result
            ? unavailable
              ? 'Última parcial disponível · consulta indisponível'
              : result.final
                ? 'Resultado concluído'
                : 'Apuração em andamento'
            : live.status === 'unavailable'
              ? 'Consulta à fonte indisponível'
              : live.status === 'loading'
                ? 'Consultando a fonte oficial'
                : 'Aguardando os primeiros resultados'}
        </span>
        <span>Presidência · 2026 · 2º turno</span>
      </div>
      {result && (
        <section className="or-live-pulse" aria-label={`Resumo da apuração de ${place}`}>
          <div>
            <span className="eyebrow">
              {place} · {result.final ? 'CONTAGEM CONCLUÍDA' : 'RESULTADO PARCIAL'}
            </span>
            <h2>
              {margin
                ? margin.votes === 0
                  ? 'Empate em votos'
                  : `${candidateName(margin.leader.name)} ${result.final ? 'mais votado' : 'na liderança'}`
                : 'Aguardando votos neste recorte'}
            </h2>
            <p>
              {margin ? (
                <>
                  Diferença de <strong>{formatVotes(margin.votes)} votos</strong> ·{' '}
                  {formatPercent(margin.points).replace('%', ' p.p.')}
                </>
              ) : (
                'O boletim ainda não registra votos válidos.'
              )}
            </p>
          </div>
          <div className="or-live-pulse-progress">
            <strong>{formatPercent(result.counted)}</strong>
            <span>das seções totalizadas</span>
            <div
              className="bar-track"
              role="progressbar"
              aria-label="Seções totalizadas"
              aria-valuenow={result.counted}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div style={{ width: `${result.counted}%` }} />
            </div>
          </div>
          <p className="or-live-bulletin">
            Boletim do TSE: <strong>{result.generated}</strong>.{' '}
            {unavailable
              ? 'Exibindo a última parcial recebida. Tentaremos consultar novamente.'
              : 'Consulta automática a cada 30 segundos; o TSE pode manter o mesmo boletim.'}
          </p>
        </section>
      )}
      <div className="or-live-command">
        {!result && (
          <section className="panel or-live-countdown">
            <LiveCountdown
              notification={notification}
              serviceReady={false}
              onEnable={async () => ({
                ok: false,
                message: 'Escolha os eventos e autorize os alertas na página de notificações.',
              })}
              onAlerts={onAlerts}
              onPrepare={onAlerts}
            />
            {live.status === 'unavailable' && (
              <p className="notice">
                Não foi possível consultar a fonte agora. A tela tentará novamente automaticamente.
              </p>
            )}
            <DataFreshness
              checkedAt={live.checkedAt}
              stale={live.stale}
              unavailable={live.status === 'unavailable'}
            />
          </section>
        )}
        <section
          className="or-live-contenders"
          aria-label={result ? `Resultado de ${place}` : 'Candidatos no segundo turno'}
        >
          {candidates.map((candidate) => {
            const tally = result?.candidates.find((item) => item.number === candidate.number);
            return (
              <article
                key={candidate.number}
                style={
                  { '--contender-color': candidateColor(candidate.number) } as React.CSSProperties
                }
              >
                <CandidatePortrait name={candidate.full} />
                <div>
                  <span>
                    {candidate.party} · {candidate.number}
                  </span>
                  <h2>{candidate.name}</h2>
                  {tally ? (
                    <>
                      <strong>{formatPercent(tally.percent)}</strong>
                      <small>
                        {formatVotes(tally.votes)} votos válidos · {place}
                      </small>
                      <div className="or-contender-track" aria-hidden="true">
                        <span style={{ width: `${tally.percent}%` }} />
                      </div>
                    </>
                  ) : (
                    <p>Aguardando os primeiros resultados oficiais.</p>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
      {result && (
        <>
          <section className="panel or-live-tally">
            <div className="or-live-heading">
              <div>
                <span className="eyebrow">RECORTE ATUAL</span>
                <h2>{place}</h2>
              </div>
              <label>
                Consultar estado
                <select
                  aria-label="Apuração por estado"
                  value={uf}
                  onChange={(event) => onState(event.target.value)}
                >
                  <option value="BR">Brasil inteiro</option>
                  {states.map((state) => (
                    <option key={state[1]} value={state[1]}>
                      {state[2]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="or-live-total">
              <strong>{formatPercent(result.counted)}</strong>
              <span>das seções totalizadas</span>
            </div>
            <div className="bar-track" aria-hidden="true">
              <div style={{ width: `${result.counted}%` }} />
            </div>
            <dl className="or-live-metrics">
              <div>
                <dt>Votos válidos</dt>
                <dd>{countLabel(result.valid)}</dd>
              </div>
              <div>
                <dt>Votos brancos</dt>
                <dd>{countLabel(result.blank)}</dd>
              </div>
              <div>
                <dt>Votos nulos</dt>
                <dd>{countLabel(result.nullVotes)}</dd>
              </div>
              <div>
                <dt>Eleitores em seções pendentes</dt>
                <dd>{countLabel(result.remaining)}</dd>
              </div>
            </dl>
            <p className="fine">
              Eleitores em seções pendentes não equivalem a votos válidos restantes.
            </p>
            <p className="notice">
              {unavailable
                ? 'Consulta temporariamente indisponível. Estes números pertencem ao último boletim recebido.'
                : live.victory?.message || 'Consulte a situação no arquivo oficial.'}
            </p>
            <DataFreshness
              checkedAt={live.checkedAt}
              generated={result.generated}
              stale={live.stale}
              unavailable={unavailable}
            />
            <Source href={result.source}>Consultar resultado no TSE</Source>
            <div className="or-live-actions">
              <button className="button primary" onClick={onNight} disabled={unavailable}>
                <Expand size={17} aria-hidden="true" />
                Abrir noite da apuração
              </button>
              <button className="button secondary" onClick={onAlerts}>
                <Bell size={17} aria-hidden="true" />
                Escolher meus alertas
              </button>
            </div>
          </section>
          <Disclosure
            title="Como a contagem está evoluindo"
            learnDetails
            summary={`Resultados de ${place}, registrados desde que você abriu esta tela.`}
          >
            <Progression
              points={points}
              greenName="Flávio Bolsonaro"
              label={`Evolução da apuração nesta sessão · ${place}`}
            />
            <p className="fine">
              A sequência desta sessão não inclui atualizações anteriores à abertura da tela.
            </p>
          </Disclosure>
          <section className="panel or-live-territory">
            <div className="or-live-heading">
              <div>
                <span className="eyebrow">O VOTO NO TERRITÓRIO</span>
                <h2>A apuração pelos estados</h2>
              </div>
              <label>
                Região
                <select
                  aria-label="Região da apuração"
                  value={region}
                  onChange={(event) => onRegion(event.target.value)}
                >
                  {['Brasil', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </label>
            </div>
            <Map data={stateResults} region={region} selected={uf} onSelect={onState} />
            <LiveStateList data={stateResults} region={region} selected={uf} onSelect={onState} />
            <RegionalResults data={stateResults} turn={2} region={region} onRegion={onRegion} />
            <p className="fine">
              Os estados são consultados separadamente. A atualização de um estado pode ocorrer em
              momento diferente da totalização nacional.
            </p>
          </section>
        </>
      )}
      {!result && (
        <div className="or-live-preparation">
          <section className="panel">
            <span className="eyebrow">CONHEÇA A TELA DA NOITE</span>
            <h2>Um ensaio antes da contagem.</h2>
            <p>
              Explore o formato da cobertura com o resultado concluído do 1º turno. Essa prévia não
              contém votos do 2º turno.
            </p>
            <button className="button secondary" disabled={!canPreview} onClick={onNight}>
              <Expand size={17} aria-hidden="true" />
              Ver prévia com o 1º turno
            </button>
          </section>
          <section className="panel">
            <span className="eyebrow">NO ACERVO</span>
            <h2>Uma disputa que já aconteceu.</h2>
            <p>Veja como os percentuais mudaram durante a apuração presidencial de 2022.</p>
            <button className="button secondary" onClick={onHistory}>
              Rever a apuração de 2022
            </button>
          </section>
        </div>
      )}
      <Disclosure
        title="O que cada situação significa"
        summary="Entenda a diferença entre liderança parcial, vantagem irreversível e confirmação oficial."
      >
        {[
          [
            'Resultado parcial',
            'Estar à frente durante a contagem ainda não significa ter vencido. Os votos pendentes podem mudar a liderança.',
          ],
          [
            'Vantagem numericamente irreversível',
            'A diferença supera o máximo de votos que os eleitores das seções pendentes poderiam dar ao outro candidato. Essa leitura depende da integridade dos dados atuais e não substitui a confirmação do TSE.',
          ],
          [
            'Eleito pelo TSE',
            'O arquivo oficial informa a situação de eleito. O aplicativo identifica esse resultado como confirmação oficial.',
          ],
        ].map(([title, text]) => (
          <div className="or-live-explanation" key={title}>
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </Disclosure>
      <p className="fine or-live-footnote">
        Consulta automática a cada 30 segundos com esta tela aberta. Os alertas dependem da coleta
        do serviço, das suas escolhas, das permissões e da conexão do aparelho.
      </p>
    </div>
  );
}
