'use client';
import { useEffect, useId, useState } from 'react';
import { MapPin } from 'lucide-react';
import { states, type Result } from '@/lib/elections';
const color = (n: string) =>
  n === '13' ? '#c96856' : n === '22' || n === '17' ? '#24796d' : '#87999b';
const name = (n: string) =>
  n === 'FLAVIO BOLSONARO'
    ? 'Flávio Bolsonaro'
    : n === 'LULA'
      ? 'Lula'
      : n === 'JAIR BOLSONARO'
        ? 'Jair Bolsonaro'
        : n;
const pct = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
type Geometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };
type Geo = { features: { properties: { codarea: string }; geometry: Geometry }[] };
export function Map({
  data,
  region,
  selected,
  onSelect,
}: {
  data: Result[];
  region: string;
  selected: string;
  onSelect: (s: string) => void;
}) {
  const [geo, setGeo] = useState<Geo>();
  const descriptionId = useId();
  const [hover, setHover] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/data/brazil.json', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error('Mapa indisponível');
        return r.json();
      })
      .then(setGeo)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, []);
  const point = ([lon, lat]: number[]) => [(lon + 74) * 9, (6 - lat) * 9];
  const path = (g: Geometry) =>
    (g.type === 'Polygon' ? [g.coordinates] : g.coordinates)
      .map((p) =>
        p
          .map(
            (ring: number[][]) =>
              ring
                .map(
                  (v, i) =>
                    `${i ? 'L' : 'M'}${point(v)
                      .map((x) => x.toFixed(1))
                      .join(',')}`,
                )
                .join('') + 'Z',
          )
          .join(''),
      )
      .join('');
  const h = data.find((d) => d.uf === hover);
  const greenCandidate = data
    .flatMap((d) => d.candidates)
    .find((c) => c.number === '22' || c.number === '17');
  return (
    <div className="map-wrap">
      <p className="sr-only" id={descriptionId}>
        Use Tab para percorrer os estados e Enter ou Espaço para selecionar. Os resultados também
        estão disponíveis na tabela abaixo. As cores indicam o candidato na liderança; a ordem dos
        votos pode mudar em resultados parciais.
      </p>
      {error ? (
        <p>Mapa indisponível. Consulte a tabela por estado.</p>
      ) : !geo ? (
        <div className="loading">Carregando malha do IBGE…</div>
      ) : (
        <svg
          viewBox="0 0 380 365"
          className="brazil-map"
          role="group"
          aria-label="Mapa interativo de votação por estado"
          aria-describedby={descriptionId}
        >
          {geo.features.map((f) => {
            const s = states.find((s) => s[0] === f.properties.codarea);
            if (!s) return null;
            const d = data.find((d) => d.uf === s[1]);
            return (
              <path
                key={s[1]}
                d={path(f.geometry)}
                fill={d?.candidates[0]?.votes ? color(d.candidates[0].number) : '#c2cecb'}
                stroke={selected === s[1] ? 'var(--ink)' : 'var(--surface)'}
                strokeWidth={selected === s[1] ? 2.5 : 1.4}
                opacity={region === 'Brasil' || s[3] === region ? 1 : 0.17}
                className="state"
                role="button"
                tabIndex={0}
                aria-pressed={selected === s[1]}
                aria-label={`${s[2]}: ${d?.candidates[0]?.votes ? name(d.candidates[0].name) + ' ' + pct(d.candidates[0].percent) + ', ' + pct(d.counted) + ' das seções totalizadas' : 'sem votos disponíveis'}`}
                onMouseEnter={() => setHover(s[1])}
                onMouseLeave={() => setHover('')}
                onFocus={() => setHover(s[1])}
                onBlur={() => setHover('')}
                onClick={() => onSelect(s[1])}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(s[1]);
                  }
                }}
              >
                <title>
                  {s[2]} ·{' '}
                  {d?.candidates[0]?.votes
                    ? name(d.candidates[0].name) + ' ' + pct(d.candidates[0].percent)
                    : 'Sem votos disponíveis'}
                </title>
              </path>
            );
          })}
        </svg>
      )}
      {h?.candidates[0] && (
        <div className="map-tooltip">
          <strong>{states.find((s) => s[1] === h.uf)?.[2]}</strong>
          <span>
            {name(h.candidates[0].name)} · {pct(h.candidates[0].percent)}
          </span>
        </div>
      )}
      <span className="map-hint">
        <MapPin size={12} />
        Clique em um estado para explorar
      </span>
      <div className="map-legend" aria-label="Legenda do mapa">
        <span>
          <i style={{ background: '#c96856' }} aria-hidden="true" />
          Lula
        </span>
        {greenCandidate && (
          <span>
            <i style={{ background: '#24796d' }} aria-hidden="true" />
            {name(greenCandidate.name)}
          </span>
        )}
        <span>
          <i style={{ background: '#87999b' }} aria-hidden="true" />
          Outros candidatos
        </span>
      </div>
      <details className="inline-details map-table">
        <summary>Consultar estados sem usar o mapa</summary>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Resultados do mapa em tabela"
        >
          <table>
            <caption>Resultados por estado · {region}. Selecione um estado para explorar.</caption>
            <thead>
              <tr>
                <th scope="col">Estado</th>
                <th scope="col">Na liderança</th>
                <th scope="col">Votos válidos do candidato</th>
                <th scope="col">Seções totalizadas</th>
              </tr>
            </thead>
            <tbody>
              {states
                .filter((s) => region === 'Brasil' || s[3] === region)
                .map((s) => {
                  const d = data.find((d) => d.uf === s[1]),
                    c = d?.candidates[0];
                  return (
                    <tr key={s[1]}>
                      <th scope="row">
                        <button
                          className="text-button"
                          aria-pressed={selected === s[1]}
                          onClick={() => onSelect(s[1])}
                        >
                          {s[2]}
                        </button>
                      </th>
                      <td>{c?.votes ? name(c.name) : 'Sem votos disponíveis'}</td>
                      <td>{c?.votes ? pct(c.percent) : '—'}</td>
                      <td>{d ? pct(d.counted) : '—'}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
