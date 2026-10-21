'use client';
import { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  Bell,
  MapPin,
  Check,
  Bookmark,
  ShieldCheck,
  Plus,
  X,
  ArrowDown,
  BookOpen,
} from 'lucide-react';
import { states, Result } from '@/lib/elections';
import { candidates } from '@/lib/content';
import { ExpandList } from '../disclosure';

import { Map } from '../geo-map';
import { CandidatePortrait } from '../components/candidate-portrait';
import { Notebook } from '../notebook';
import { ShareButton } from '../components/share-button';

import { readWatch, type NotebookEntry } from '@/lib/notebook';
import { formatCompactPercent as percent } from '@/lib/presentation';
function searchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}
export function Watchboard({
  selectedNote,
  favorite,
  onAlerts,
  onState,
  data,
  region,
  uf,
  year,
  turn,
  observatory = false,
}: {
  observatory?: boolean;
  selectedNote?: string;
  favorite: string;
  onAlerts: () => void;
  onState: (code: string, destination: string) => void;
  data: Result[];
  region: string;
  uf: string;
  year: number;
  turn: number;
}) {
  const [follow, setFollow] = useState<string[]>([]),
    [entries, setEntries] = useState<NotebookEntry[]>([]),
    [message, setMessage] = useState(''),
    [ready, setReady] = useState(false),
    [saved, setSaved] = useState<'saving' | 'saved' | 'error'>('saved'),
    [savedAt, setSavedAt] = useState<string | null>(null),
    [focus, setFocus] = useState(''),
    [area, setArea] = useState('Todas'),
    [query, setQuery] = useState('');
  useEffect(() => {
    try {
      const v = readWatch(JSON.parse(localStorage.getItem('observatorio.watch') || '{}'));
      setFollow(v.states);
      setEntries(v.entries);
      setFocus(v.states[0] || '');
    } catch {
      // Start with an empty notebook if local storage cannot be read.
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout>;
    try {
      localStorage.setItem(
        'observatorio.watch',
        JSON.stringify({ version: 2, states: follow, entries }),
      );
      timer = setTimeout(() => {
        setSaved('saved');
        setSavedAt(new Date().toISOString());
      }, 300);
    } catch {
      setSaved('error');
      setMessage('Não foi possível salvar neste aparelho. Verifique o armazenamento do navegador.');
    }
    return () => clearTimeout(timer);
  }, [ready, follow, entries]);
  useEffect(() => {
    if (!ready || !selectedNote) return;
    const timer = setTimeout(() => {
      document.querySelector('.notebook')?.scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
      document
        .querySelector<HTMLTextAreaElement>('.notebook textarea')
        ?.focus({ preventScroll: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [ready, selectedNote]);
  function changeEntries(next: NotebookEntry[]) {
    setSaved('saving');
    setEntries(next);
  }
  function toggle(code: string) {
    setSaved('saving');
    setFollow((f) => (f.includes(code) ? f.filter((x) => x !== code) : [...f, code]));
    setFocus(code);
  }
  const queryCode = states.find((s) => searchText(s[1]) === searchText(query))?.[1];
  const selected = states.find((s) => s[1] === focus),
    visible = states.filter(
      (s) =>
        (area === 'Todas' || s[3] === area) &&
        (queryCode ? s[1] === queryCode : searchText(s[2]).includes(searchText(query))),
    );
  const result = data.find((d) => d.uf === focus);
  return (
    <div
      className={observatory ? 'or-watch' : undefined}
      style={observatory ? undefined : { display: 'contents' }}
    >
      {observatory && (
        <>
          <nav className="or-watch-nav" aria-label="Seu acompanhamento">
            <a href="#escolher-estados">
              <MapPin size={21} aria-hidden="true" />
              <span>
                Explorar estados<small>Mapa e busca por nome</small>
              </span>
              <ArrowDown size={16} aria-hidden="true" />
            </a>
            <a href="#estados-seguidos">
              <Bookmark size={21} aria-hidden="true" />
              <span>
                {ready
                  ? `${follow.length} ${follow.length === 1 ? 'estado seguido' : 'estados seguidos'}`
                  : 'Seus estados'}
                <small>Resultados e atalhos</small>
              </span>
              <ArrowDown size={16} aria-hidden="true" />
            </a>
            <a href="#seu-caderno">
              <BookOpen size={21} aria-hidden="true" />
              <span>
                {ready && entries.length
                  ? `${entries.length} ${entries.length === 1 ? 'anotação' : 'anotações'}`
                  : 'Seu caderno'}
                <small>Perguntas e observações</small>
              </span>
              <ArrowDown size={16} aria-hidden="true" />
            </a>
          </nav>
          <p className="or-watch-storage" role="status">
            <ShieldCheck size={16} aria-hidden="true" />
            {!ready
              ? 'Recuperando seu acompanhamento…'
              : saved === 'error'
                ? 'Não foi possível salvar neste aparelho.'
                : saved === 'saving'
                  ? 'Salvando neste aparelho…'
                  : 'Acompanhamento salvo neste aparelho.'}
          </p>
        </>
      )}
      {!observatory && (
        <section className="panel discovery-head">
          <div>
            <span className="eyebrow">O SEU JEITO DE ACOMPANHAR</span>
            <h2>O país, pelos lugares que importam para você.</h2>
            <p>Monte uma comparação entre estados e guarde suas observações no caderno.</p>
          </div>
          <Bookmark size={40} />
        </section>
      )}
      <section className="panel follow-panel" id="escolher-estados">
        <div className="panel-head">
          <div>
            <span className="eyebrow">
              {observatory ? '01 / SEU OLHAR NO TERRITÓRIO' : 'SEUS ESTADOS'}
            </span>
            <h2>
              {observatory
                ? 'Quais lugares você quer acompanhar?'
                : 'Escolha no mapa. Compare abaixo.'}
            </h2>
          </div>
          <span className="subtle-tag">{follow.length} seguindo</span>
        </div>
        <div className="follow-explorer">
          <div>
            <Map
              data={data.filter((d) => states.some((s) => s[1] === d.uf))}
              region={area === 'Todas' ? 'Brasil' : area}
              selected={focus}
              onSelect={setFocus}
            />
            <p className="fine">
              As cores mostram a liderança no 1º turno de 2026. Selecionar no mapa não altera os
              filtros de outras telas.
            </p>
            {selected ? (
              <div className="selected-state">
                <div>
                  <span className="eyebrow">{selected[3]}</span>
                  <h3>{selected[2]}</h3>
                  <small>{result ? '1º turno · ' + result.year : 'Resultado indisponível'}</small>
                </div>
                <button
                  className={'button ' + (follow.includes(focus) ? 'secondary' : 'primary')}
                  onClick={() => toggle(focus)}
                >
                  {follow.includes(focus) ? <Check size={16} /> : <Plus size={16} />}{' '}
                  {follow.includes(focus) ? 'Deixar de seguir' : 'Seguir estado'}
                </button>
              </div>
            ) : (
              <p className="fine">Clique em um estado no mapa ou escolha pelo nome ao lado.</p>
            )}
          </div>
          <div className="state-picker">
            <div className="state-picker-tools">
              <label className="form-label">
                Região
                <select value={area} onChange={(e) => setArea(e.target.value)}>
                  {['Todas', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="form-label">
                Buscar estado
                <input
                  placeholder={observatory ? 'Nome ou sigla do estado' : 'Nome do estado'}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="active-filters state-filters">
              <span>{area === 'Todas' ? 'Todas as regiões' : area}</span>
              {query && <span>Busca: {query}</span>}
              {(area !== 'Todas' || query) && (
                <button
                  className="text-button"
                  onClick={() => {
                    setArea('Todas');
                    setQuery('');
                  }}
                >
                  Limpar filtros
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="state-picker-list">
              {visible.map((s) => (
                <div key={s[1]} className={focus === s[1] ? 'focused' : ''}>
                  <button
                    className="state-name"
                    aria-pressed={focus === s[1]}
                    onClick={() => setFocus(s[1])}
                  >
                    <span>{s[2]}</span>
                    <small>{s[3]}</small>
                  </button>
                  <button
                    className="follow-toggle"
                    aria-label={(follow.includes(s[1]) ? 'Deixar de seguir ' : 'Seguir ') + s[2]}
                    aria-pressed={follow.includes(s[1])}
                    onClick={() => toggle(s[1])}
                  >
                    {follow.includes(s[1]) ? <Check size={17} /> : <Plus size={17} />}
                  </button>
                </div>
              ))}
            </div>
            {!visible.length && <p className="fine">Nenhum estado encontrado.</p>}
          </div>
        </div>
      </section>
      <section className="panel followed-results" id="estados-seguidos">
        <div className="panel-head">
          <div>
            <span className="eyebrow">
              {observatory ? '02 / ESTADOS QUE VOCÊ SEGUE' : 'COMPARAÇÃO PESSOAL'}
            </span>
            <h2>
              {follow.length
                ? 'Seus estados, lado a lado.'
                : 'Sua comparação começa com um estado.'}
            </h2>
          </div>
          <MapPin size={22} />
        </div>
        <p className="fine">
          Os estados seguidos ficam reunidos aqui, com atalhos para a apuração e o histórico. Essa
          seleção não restringe os alertas nacionais.
        </p>
        {observatory && ready && follow.length === 0 && (
          <div className="or-watch-empty">
            <MapPin size={30} aria-hidden="true" />
            <div>
              <h3>Um lugar para começar.</h3>
              <p>
                Escolha um estado e toque em “Seguir estado”. Seus resultados ficam reunidos aqui.
              </p>
            </div>
            <a className="button secondary" href="#escolher-estados">
              Escolher meu primeiro estado
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        )}
        {follow.length > 0 && (
          <ExpandList
            className="followed-grid"
            items={follow}
            initial={4}
            moreLabel="Ver todos os estados seguidos"
            lessLabel="Ver menos estados"
            render={(code: string) => {
              const d = data.find((d) => d.uf === code);
              const a = d?.candidates.find((c) => c.number === '22'),
                b = d?.candidates.find((c) => c.number === '13');
              return (
                <article className="followed-card" key={code}>
                  <header>
                    <div>
                      <span className="eyebrow">{states.find((s) => s[1] === code)?.[3]}</span>
                      <h3>{states.find((s) => s[1] === code)?.[2]}</h3>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={'Deixar de seguir ' + states.find((s) => s[1] === code)?.[2]}
                      onClick={() => toggle(code)}
                    >
                      <X size={15} />
                    </button>
                  </header>
                  {d && a && b ? (
                    <>
                      <span className="fine">1º turno · {d.year} · votos válidos</span>
                      <div className="followed-votes">
                        <span>
                          {observatory && <CandidatePortrait name="Flávio Bolsonaro" />}
                          <span>
                            Flávio <strong>{percent(a.percent)}</strong>
                          </span>
                        </span>
                        <span>
                          {observatory && <CandidatePortrait name="Lula" />}
                          <span>
                            Lula <strong>{percent(b.percent)}</strong>
                          </span>
                        </span>
                      </div>
                      <div className="split-bar">
                        <div style={{ width: a.percent + '%', background: '#24796d' }} />
                        <div style={{ width: b.percent + '%', background: '#c96856' }} />
                      </div>
                      {observatory && (
                        <small className="or-watch-others">
                          Demais candidatos completam os votos válidos.
                        </small>
                      )}
                      <small>Abstenção: {percent(d.abstention)}</small>
                    </>
                  ) : (
                    <p>Sem dados disponíveis.</p>
                  )}
                  <div className="quick-actions">
                    <button className="text-button" onClick={() => onState(code, 'live')}>
                      Apuração
                      <ArrowUpRight size={13} />
                    </button>
                    <button className="text-button" onClick={() => onState(code, 'history')}>
                      Histórico
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </article>
              );
            }}
          />
        )}
      </section>
      <div id="seu-caderno" style={observatory ? undefined : { display: 'contents' }}>
        {ready && (
          <Notebook
            entries={entries}
            onChange={changeEntries}
            saved={saved}
            savedAt={savedAt}
            selectedNote={selectedNote}
          />
        )}
      </div>
      <section className="watch-shortcuts">
        <div className="watch-summary">
          <span className="eyebrow">SEU ACOMPANHAMENTO</span>
          <strong>
            {candidates.find((c) => c.number === favorite)?.name || 'Os dois candidatos'}
          </strong>
        </div>
        <div className="action-group" role="group" aria-label="Ações do acompanhamento">
          <button className="button secondary" onClick={onAlerts}>
            <Bell size={16} />
            Escolher alertas
          </button>
          <ShareButton
            label="Compartilhar visualização"
            title="Observatório do Voto · visualização eleitoral"
            url={() => {
              const link = new URL(location.origin);
              link.search = new URLSearchParams({
                tab: 'overview',
                uf,
                region,
                year: String(year),
                turn: String(turn),
              }).toString();
              return link.toString();
            }}
          />
        </div>
      </section>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <p className="fine privacy-label">
        <ShieldCheck size={15} />
        Seu caderno e sua seleção ficam no aparelho. O link compartilhado contém apenas os filtros
        públicos da visualização.
      </p>
    </div>
  );
}
