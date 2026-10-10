'use client';
import { useEffect, useState } from 'react';
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
  const [geo, setGeo] = useState<any>();
  const [hover, setHover] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch('/data/brazil.json')
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setError(true));
  }, []);
  const point = ([lon, lat]: number[]) => [(lon + 74) * 9, (6 - lat) * 9];
  const path = (g: any) =>
    (g.type === 'Polygon' ? [g.coordinates] : g.coordinates)
      .map((p: any) =>
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
  return (
    <div className="map-wrap">
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
        >
          {geo.features.map((f: any) => {
            const s = states.find((s) => s[0] === f.properties.codarea);
            if (!s) return null;
            const d = data.find((d) => d.uf === s[1]);
            return (
              <path
                key={s[1]}
                d={path(f.geometry)}
                fill={d ? color(d.candidates[0]?.number) : '#c2cecb'}
                stroke={selected === s[1] ? 'var(--ink)' : 'var(--surface)'}
                strokeWidth={selected === s[1] ? 2.5 : 1.4}
                opacity={region === 'Brasil' || s[3] === region ? 1 : 0.17}
                className="state"
                role="button"
                tabIndex={0}
                aria-label={`${s[2]}: ${d ? name(d.candidates[0].name) + ' ' + pct(d.candidates[0].percent) : 'sem dados'}`}
                onMouseEnter={() => setHover(s[1])}
                onMouseLeave={() => setHover('')}
                onFocus={() => setHover(s[1])}
                onClick={() => onSelect(s[1])}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(s[1]);
                  }
                }}
              >
                <title>
                  {s[2]} · {d ? pct(d.candidates[0].percent) : 'Sem dados'}
                </title>
              </path>
            );
          })}
        </svg>
      )}
      {h && (
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
    </div>
  );
}
