'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MapPin, Search, X } from 'lucide-react';
import { states } from '@/lib/elections';
import { searchText, type LocalResponse, type PlaceSummary } from '@/lib/local-results';
import { candidateName, formatVotes, formatPercent } from '@/lib/presentation';
import { DataFreshness } from './components/data-freshness';
import { Source } from './components/source-link';
import { rememberedCity, type RememberedCity } from '@/lib/remembered-city';
import { ShareButton } from './components/share-button';
import { resultLink } from '@/lib/sharing';

export function MunicipalityExplorer({ initialUf }: { initialUf: string }) {
  const [uf, setUf] = useState(states.some((s) => s[1] === initialUf) ? initialUf : 'SP');
  const [index, setIndex] = useState<LocalResponse | null>(null);
  const [city, setCity] = useState<LocalResponse | null>(null);
  const [detail, setDetail] = useState<LocalResponse | null>(null);
  const [query, setQuery] = useState('');
  const [localQuery, setLocalQuery] = useState('');
  const [method, setMethod] = useState<'name' | 'section'>('name');
  const [zone, setZone] = useState('');
  const [section, setSection] = useState('');
  const [sectionQuery, setSectionQuery] = useState('');
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [showPlaces, setShowPlaces] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [ready, setReady] = useState(false);
  const [storageStatus, setStorageStatus] = useState<'saved' | 'unavailable' | ''>('');
  const restore = useRef<RememberedCity | null>(null);
  const shared = useRef<URLSearchParams | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const linked = rememberedCity(
      JSON.stringify({
        version: 1,
        uf: params.get('uf'),
        code: params.get('municipality'),
        name: 'Consulta compartilhada',
      }),
    );
    if (linked) {
      shared.current = params;
      restore.current = linked;
      setUf(linked.uf);
      setReady(true);
      return;
    }
    try {
      const saved = rememberedCity(localStorage.getItem('observatorio.municipality'));
      if (saved) {
        restore.current = saved;
        setUf(saved.uf);
      }
    } catch {
      /* Browsing still works when local storage is unavailable. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setIndex(null);
    setCity(null);
    setDetail(null);
    setQuery('');
    setError('');
    setBusy(false);
    setShowSectionPicker(false);
    request.current?.abort();
    fetch(`/api/local-results?uf=${uf}`, { signal: controller.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        return d as LocalResponse;
      })
      .then(async (d) => {
        if (controller.signal.aborted) return;
        setIndex(d);
        const saved = restore.current;
        if (!saved || saved.uf !== uf || !d.municipalities?.some((m) => m.code === saved.code))
          return;
        restore.current = null;
        request.current = controller;
        setBusy(true);
        const response = await fetch(
          `/api/local-results?${new URLSearchParams({ uf, municipality: saved.code })}`,
          { signal: controller.signal },
        );
        const cityData = await response.json();
        if (!response.ok) throw Error(cityData.error || 'Não foi possível retomar seu município.');
        if (!controller.signal.aborted) {
          setCity(cityData);
          setStorageStatus(shared.current ? '' : 'saved');
          const link = shared.current;
          if (link) {
            shared.current = null;
            const scope = new URLSearchParams({ uf, municipality: saved.code });
            for (const key of ['place', 'zone', 'section']) {
              const value = link.get(key);
              if (value) scope.set(key, value);
            }
            if (scope.size > 2) {
              const response = await fetch('/api/local-results?' + scope, {
                signal: controller.signal,
              });
              const detailData = await response.json();
              if (!response.ok)
                throw Error(detailData.error || 'Não foi possível abrir este local.');
              if (!controller.signal.aborted) setDetail(detailData);
            }
          }
        }
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted)
          setError(e.message || 'Não foi possível carregar os municípios.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, [uf, retry, ready]);
  async function load(
    code: string,
    place?: PlaceSummary,
    bySection = false,
    explicitSection?: { zone: string; section: string },
  ) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const keepPosition = !!place && place.id === detail?.selection?.place?.id;
    setBusy(true);
    setError('');
    if (!keepPosition) setShowCandidates(false);
    const params = new URLSearchParams({ uf, municipality: code });
    if (place) params.set('place', place.id);
    if (bySection) {
      params.set('zone', (explicitSection?.zone || zone).padStart(4, '0'));
      const requestedSection = explicitSection?.section || section;
      if (requestedSection) params.set('section', requestedSection.padStart(4, '0'));
    }
    try {
      const r = await fetch(`/api/local-results?${params}`, { signal: controller.signal });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Não foi possível consultar o local.');
      if (!controller.signal.aborted) {
        if (!place && !bySection) {
          const page = new URL(location.href);
          for (const key of ['municipality', 'place', 'zone', 'section'])
            page.searchParams.delete(key);
          history.replaceState({}, '', page);
          setDetail(null);
          setShowSectionPicker(false);
          setCity(d);
          setQuery('');
          setLocalQuery('');
          setShowPlaces(false);
          setZone('');
          setSection('');
          if (d.municipality) {
            try {
              localStorage.setItem(
                'observatorio.municipality',
                JSON.stringify({
                  version: 1,
                  uf,
                  code: d.municipality.code,
                  name: d.municipality.name,
                }),
              );
              setStorageStatus('saved');
            } catch {
              setStorageStatus('unavailable');
            }
          }
        } else {
          setDetail(d);
          if (place && !bySection) {
            setSectionQuery('');
            setShowSectionPicker(false);
          }
        }
        if (!keepPosition)
          requestAnimationFrame(() =>
            resultHeading.current?.focus({ preventScroll: !place && !bySection }),
          );
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Consulta indisponível.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const matches =
    index?.municipalities?.filter((m) => searchText(m.name).includes(searchText(query))) || [];
  const places =
    city?.places?.filter((p) =>
      searchText(`${p.name} ${p.address} ${p.number}`).includes(searchText(localQuery)),
    ) || [];
  const active = detail || city;
  const tally = active?.tally;
  const selectedPlace = detail?.selection?.place;
  const selectedSection = detail?.selection?.section;
  const matchingSections =
    selectedPlace?.sections.filter(
      (s) => !sectionQuery || String(Number(s)).includes(String(Number(sectionQuery))),
    ) || [];
  const title = selectedPlace
    ? `${selectedPlace.name}${selectedSection ? ` · Seção ${Number(selectedSection)}` : ''}`
    : detail?.selection?.section
      ? `Zona ${Number(detail.selection.zone)} · seção ${Number(detail.selection.section)}`
      : detail?.selection?.zone
        ? `Zona eleitoral ${Number(detail.selection.zone)}`
        : city?.municipality?.name;
  return (
    <div className="municipality-explorer">
      <section className="panel municipality-search">
        <span className="eyebrow">PRESIDÊNCIA · 2026 · 1º TURNO</span>
        <h2>Como a sua cidade votou?</h2>
        <p>Encontre o município. Depois, explore a escola ou a seção onde você votou.</p>
        {city?.municipality && (
          <div className="remembered-city">
            <div>
              <strong>
                {city.municipality.name} · {uf}
              </strong>
              <small role="status">
                {storageStatus === 'saved'
                  ? 'Sua escolha fica lembrada neste navegador.'
                  : storageStatus === 'unavailable'
                    ? 'Este navegador não permitiu guardar sua escolha.'
                    : 'Município selecionado'}
              </small>
            </div>
            <button
              className="text-button"
              onClick={() => {
                setCity(null);
                setDetail(null);
                setQuery('');
                setError('');
                searchInput.current?.focus();
              }}
            >
              Pesquisar outro município
            </button>
          </div>
        )}
        <div className="local-search-fields">
          <label>
            Estado
            <select
              value={uf}
              onChange={(e) => {
                restore.current = null;
                setUf(e.target.value);
              }}
            >
              {states.map((s) => (
                <option key={s[1]} value={s[1]}>
                  {s[2]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Município
            <div className="local-search-input">
              <Search size={18} aria-hidden="true" />
              <input
                ref={searchInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder="Digite o nome da cidade"
                aria-label="Município"
                autoComplete="off"
                aria-describedby="city-search-status"
              />
              {query && (
                <button aria-label="Limpar busca de município" onClick={() => setQuery('')}>
                  <X size={16} />
                </button>
              )}
            </div>
          </label>
        </div>
        <p className="fine" id="city-search-status" role="status">
          {!index
            ? error
              ? 'Não foi possível carregar a lista.'
              : 'Carregando municípios…'
            : query.trim().length < 2
              ? 'Digite pelo menos duas letras. Não precisa colocar acentos.'
              : `${matches.length} ${matches.length === 1 ? 'município encontrado' : 'municípios encontrados'}.`}
        </p>
        {query.trim().length >= 2 && (
          <ul className="local-search-results">
            {matches.slice(0, 8).map((m) => (
              <li key={m.code}>
                <button
                  disabled={busy}
                  onClick={() => {
                    setCity(null);
                    void load(m.code);
                  }}
                >
                  <MapPin size={17} aria-hidden="true" />
                  <span>
                    {m.name}
                    <small>{uf}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {matches.length > 8 && query.trim().length >= 2 && (
          <p className="fine">Continue digitando para encontrar sua cidade.</p>
        )}
        {index && (
          <DataFreshness archived checkedAt={index.importedAt} generated={index.generated} />
        )}
      </section>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button
            className="text-button"
            onClick={() =>
              city?.municipality ? void load(city.municipality.code) : setRetry((n) => n + 1)
            }
          >
            {city ? 'Voltar ao município' : 'Tentar novamente'}
          </button>
        </div>
      )}
      {busy && !tally && (
        <p className="loading" role="status">
          Consultando os votos…
        </p>
      )}
      {city?.municipality && (
        <section className="panel local-places">
          <div className="panel-head">
            <div>
              <span className="eyebrow">
                {city.municipality.name} · {uf}
              </span>
              <h2>Encontre seu local de votação</h2>
            </div>
          </div>
          <div
            className="segmented local-method"
            role="group"
            aria-label="Como encontrar o local de votação"
          >
            <button
              aria-pressed={method === 'name'}
              className={method === 'name' ? 'active' : ''}
              onClick={() => setMethod('name')}
            >
              Pelo nome do local
            </button>
            <button
              aria-pressed={method === 'section'}
              className={method === 'section' ? 'active' : ''}
              onClick={() => setMethod('section')}
            >
              Pela zona e seção
            </button>
          </div>
          {method === 'name' ? (
            <>
              <label className="local-search-label">
                Escola, local ou endereço
                <input
                  type="search"
                  placeholder="Ex.: Escola Municipal ou nome da rua"
                  value={localQuery}
                  onChange={(e) => {
                    setLocalQuery(e.target.value);
                    setShowPlaces(false);
                  }}
                />
              </label>
              <p className="fine" role="status">
                {places.length} locais encontrados no município.
              </p>
              <ul className="local-search-results places-results">
                {(showPlaces ? places : places.slice(0, 6)).map((p) => (
                  <li key={p.id}>
                    <button
                      disabled={busy}
                      onClick={() => void load(city.municipality!.code, p)}
                      aria-pressed={detail?.selection?.place?.id === p.id}
                    >
                      <MapPin size={17} aria-hidden="true" />
                      <span>
                        {p.name}
                        <small>
                          {p.address} · Zona {Number(p.zone)} · {p.sections.length}{' '}
                          {p.sections.length === 1 ? 'seção' : 'seções'}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {places.length > 6 && (
                <button
                  className="text-button"
                  aria-expanded={showPlaces}
                  onClick={() => setShowPlaces(!showPlaces)}
                >
                  {showPlaces ? 'Ver menos locais' : `Ver os ${places.length} locais`}
                </button>
              )}
            </>
          ) : (
            <form
              className="local-section-form"
              onSubmit={(e) => {
                e.preventDefault();
                void load(city.municipality!.code, undefined, true);
              }}
            >
              <p className="fine">
                Você encontra esses dois números no e-Título ou no comprovante de votação.
              </p>
              <div className="local-search-fields">
                <label>
                  Zona eleitoral
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{1,4}"
                    maxLength={4}
                    placeholder="Ex.: 101"
                    value={zone}
                    onChange={(e) => setZone(e.target.value.replace(/\D/g, ''))}
                  />
                </label>
                <label>
                  Seção
                  <input
                    inputMode="numeric"
                    pattern="[0-9]{1,4}"
                    maxLength={4}
                    placeholder="Ex.: 105"
                    value={section}
                    onChange={(e) => setSection(e.target.value.replace(/\D/g, ''))}
                  />
                </label>
                <button className="button primary" disabled={busy} type="submit">
                  Consultar votos
                </button>
              </div>
              <p className="fine">
                Se não informar a seção, mostramos todas as seções dessa zona no município.
              </p>
            </form>
          )}
        </section>
      )}
      {!error && tally && (
        <section
          className="panel local-tally"
          aria-labelledby="local-result-title"
          aria-busy={busy}
        >
          {detail && (
            <button className="text-button" onClick={() => setDetail(null)}>
              <ArrowLeft size={15} aria-hidden="true" />
              Ver o município inteiro
            </button>
          )}
          <span className="eyebrow">
            {detail ? 'RESULTADO DO LOCAL SELECIONADO' : 'RESULTADO DO MUNICÍPIO'} · 1º TURNO
          </span>
          <h2 id="local-result-title" ref={resultHeading} tabIndex={-1}>
            {title}
          </h2>
          <ShareButton
            title={`${title} · votação presidencial de 2026 · 1º turno`}
            label="Compartilhar resultado"
            url={() =>
              resultLink(location.origin, {
                tab: 'municipality',
                uf,
                municipality: city?.municipality?.code,
                place: selectedPlace?.id,
                zone: detail?.selection?.zone,
                section: selectedSection,
              })
            }
          />
          {detail?.selection?.place && (
            <p className="fine">
              {detail.selection.place.address} · Zona {Number(detail.selection.place.zone)}
            </p>
          )}
          {selectedPlace && (
            <div
              className="local-section-picker"
              role="group"
              aria-labelledby="local-section-heading"
            >
              <div className="panel-head">
                <div>
                  <h3 id="local-section-heading">Veja o colégio inteiro ou encontre sua seção</h3>
                  <p className="fine">
                    Zona {Number(selectedPlace.zone)} · {selectedPlace.sections.length} seções neste
                    local
                  </p>
                </div>
              </div>
              <div
                className="local-scope-buttons"
                role="group"
                aria-label="Votos do colégio ou de uma seção"
              >
                <button
                  className="button secondary"
                  disabled={busy}
                  aria-pressed={!selectedSection && !showSectionPicker}
                  onClick={() => {
                    setShowSectionPicker(false);
                    if (selectedSection) void load(city!.municipality!.code, selectedPlace);
                  }}
                >
                  Colégio inteiro
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  aria-expanded={showSectionPicker}
                  aria-controls="local-section-chooser"
                  aria-pressed={showSectionPicker || !!selectedSection}
                  onClick={() => setShowSectionPicker(!showSectionPicker)}
                >
                  Escolher seção
                </button>
              </div>
              {showSectionPicker && (
                <div id="local-section-chooser">
                  <label className="local-search-label">
                    Procurar seção neste colégio
                    <input
                      type="search"
                      inputMode="numeric"
                      value={sectionQuery}
                      maxLength={4}
                      placeholder="Digite o número da sua seção"
                      aria-controls="local-section-options"
                      onChange={(e) => setSectionQuery(e.target.value.replace(/\D/g, ''))}
                    />
                  </label>
                  <div className="section-buttons" id="local-section-options">
                    {matchingSections.map((s) => (
                      <button
                        key={s}
                        className="button secondary"
                        disabled={busy}
                        aria-pressed={selectedSection === s}
                        onClick={() =>
                          void load(city!.municipality!.code, selectedPlace, true, {
                            zone: selectedPlace.zone,
                            section: s,
                          })
                        }
                      >
                        Seção {Number(s)}
                      </button>
                    ))}
                  </div>
                  {!matchingSections.length && (
                    <p className="fine" role="status">
                      Essa seção não está neste colégio. Confira o número ou procure pela zona e
                      seção no município.
                    </p>
                  )}
                </div>
              )}
              <p className="fine local-scope-status" role="status">
                {busy
                  ? 'Atualizando os votos…'
                  : selectedSection
                    ? `Mostrando somente a seção ${Number(selectedSection)}.`
                    : 'Mostrando os votos de todas as seções do colégio.'}
              </p>
            </div>
          )}
          <div className="local-tally-stats">
            <div>
              <strong>{formatVotes(tally.total)}</strong>
              <span>votos registrados</span>
            </div>
            <div>
              <strong>{formatVotes(tally.sections)}</strong>
              <span>{tally.sections === 1 ? 'seção consultada' : 'seções consultadas'}</span>
            </div>
          </div>
          <p className="fine">
            Percentuais calculados sobre os {formatVotes(tally.valid)} votos válidos deste recorte.
          </p>
          {(showCandidates ? tally.candidates : tally.candidates.slice(0, 3)).map((c) => (
            <div className="local-candidate" key={c.number}>
              <div>
                <strong>{candidateName(c.name)}</strong>
                <span>
                  {formatPercent(c.percent)} · {formatVotes(c.votes)} votos
                </span>
              </div>
              <div className="local-vote-track" aria-hidden="true">
                <i style={{ width: `${c.percent}%` }} />
              </div>
            </div>
          ))}
          {tally.candidates.length > 3 && (
            <button
              className="text-button"
              aria-expanded={showCandidates}
              onClick={() => setShowCandidates(!showCandidates)}
            >
              {showCandidates ? 'Ver menos candidatos' : 'Ver todos os candidatos'}
            </button>
          )}
          <p className="fine">
            Brancos: {formatVotes(tally.blank)} · Nulos: {formatVotes(tally.nullVotes)}.
          </p>
          <DataFreshness archived checkedAt={active.importedAt} generated={active.generated} />
          <Source href={active.source}>Fonte: votos por seção do TSE</Source>
          <p className="fine local-privacy">
            Os números são coletivos. Não é possível identificar em quem uma pessoa votou. Locais e
            seções correspondem a esta eleição e podem mudar entre turnos.
          </p>
        </section>
      )}
    </div>
  );
}
