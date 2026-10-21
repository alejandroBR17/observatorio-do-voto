'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUpRight, Newspaper, Radio, SearchCheck } from 'lucide-react';

import { Disclosure, ExpandList } from '../disclosure';

import { NewsVisual } from '../news-visual';
import { DataFreshness } from '../components/data-freshness';

import { ShareButton } from '../components/share-button';

import { useRemote } from '../hooks/use-remote';
import { Source as Link } from '../components/source-link';
import { formatDate as date, formatDateTime as time } from '@/lib/presentation';
import type { MediaResponse } from '@/lib/media-types';
function ClockLabel({ value }: { value: string }) {
  const zoned = /Z$|[+-]\d{2}:\d{2}$/.test(value) ? value : value + '-03:00';
  return <strong>Última coleta da fonte: {time(zoned)}.</strong>;
}
export function MediaExplorer({ observatory = false }: { observatory?: boolean }) {
  const { data, loading } = useRemote<MediaResponse>('/api/media', 300000);
  const [vehicle, setVehicle] = useState('all');
  const articles = data?.articles || [];
  const vehicles = [
    ...new Set(articles.map((a) => a.source).filter((s) => typeof s === 'string' && !!s.trim())),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const currentVehicle = vehicles.includes(vehicle) ? vehicle : 'all';
  const visibleArticles =
    currentVehicle === 'all' ? articles : articles.filter((a) => a.source === currentVehicle);
  // The archive has its own collection schedule; it is not the current news feed.
  const archive = data?.stats && (
    <>
      <div className="notice">
        <ClockLabel value={data.stats.updated} />
        <span>
          A fonte coleta às 7h, 10h, 13h, 16h e 21h (Brasília). Esse horário vale para o acervo de
          estatísticas. Os feeds públicos dos veículos listados em Fontes e critérios são
          consultados também a cada 5 minutos.
        </span>
      </div>
      <div className="stats-grid media-stats">
        {[
          ['MATÉRIAS DE IMPRENSA', data.stats.articles],
          ['FONTES DE IMPRENSA', data.stats.sources],
          ['PUBLICADAS HOJE', data.stats.today],
        ].map(([l, v]) => (
          <div className="stat" key={l}>
            <span className="eyebrow">{l}</span>
            <strong>{Number(v).toLocaleString('pt-BR')}</strong>
            <small>Acervo monitorado pela fonte</small>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>Menções aos candidatos</h2>
        <div className="regional-bars">
          {(data.candidates || []).map((c) => (
            <div className="mention-row" key={c.slug}>
              <div>
                <strong>{c.name}</strong>
                <span>{c.articles.toLocaleString('pt-BR')} matérias</span>
              </div>
              <div className="bar-track">
                <div
                  style={{
                    width:
                      (100 * c.articles) /
                        Math.max(...(data.candidates || []).map((x) => x.articles), 1) +
                      '%',
                    background:
                      c.slug === 'lula-silva'
                        ? '#c96856'
                        : c.slug === 'flavio-bolsonaro'
                          ? '#24796d'
                          : 'var(--muted)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="fine">
          Uma matéria pode citar ambos. Volume de cobertura não equivale a apoio, alcance nas redes
          ou intenção de voto. Recorte desde {date(data.stats.cutoff)}.
        </p>
      </section>
    </>
  );
  return (
    <div
      className={observatory ? 'or-media-explorer' : undefined}
      style={observatory ? undefined : { display: 'contents' }}
    >
      <section className="panel discovery-head">
        {observatory ? (
          <p className="or-coverage-principle">
            <SearchCheck size={19} aria-hidden="true" />
            Publicação, data e origem sempre visíveis.
          </p>
        ) : (
          <div>
            <span className="eyebrow">CONTEXTO / O DEBATE PÚBLICO</span>
            <h2>O que está em discussão.</h2>
            <p>Cobertura da imprensa por candidato, com links para as publicações originais.</p>
          </div>
        )}
        <DataFreshness
          checkedAt={data?.checkedAt}
          stale={data?.stale || data?.status === 'stale'}
          unavailable={data?.status === 'unavailable'}
        />
      </section>
      {observatory && (
        <nav className="or-coverage-nav" aria-label="Nesta página">
          <a href="#noticiario">
            <Newspaper size={17} aria-hidden="true" />
            Noticiário
            <ArrowDown size={14} aria-hidden="true" />
          </a>
          {data?.stats && (
            <a href="#cobertura-numeros">
              <Radio size={17} aria-hidden="true" />A cobertura em números
              <ArrowDown size={14} aria-hidden="true" />
            </a>
          )}
          <a href="#fontes-cobertura">
            <SearchCheck size={17} aria-hidden="true" />
            Fontes e critérios
            <ArrowDown size={14} aria-hidden="true" />
          </a>
        </nav>
      )}
      {loading ? (
        <div className="loading">Consultando a cobertura…</div>
      ) : (
        <>
          {data?.message && <div className="notice">{data.message}</div>}
          {!observatory && archive}
        </>
      )}
      {articles.length > 0 && (
        <section className="panel or-coverage-news" id="noticiario">
          {observatory ? (
            <div className="or-coverage-section-head">
              <div>
                <span className="eyebrow">01 / ACONTECE AGORA</span>
                <h2>No noticiário</h2>
              </div>
              <span className="or-coverage-count">
                <strong>{articles.length}</strong> notícias nesta coleta
              </span>
            </div>
          ) : (
            <h2>No noticiário</h2>
          )}
          <div className="news-filter">
            <p className="fine">
              {observatory
                ? `${vehicles.length} veículos nesta coleta. As notícias mais recentes aparecem primeiro.`
                : `${articles.length} notícias de ${vehicles.length} veículos nesta coleta. As mais recentes aparecem primeiro.`}
            </p>
            <label>
              Veículo{' '}
              <select value={currentVehicle} onChange={(e) => setVehicle(e.target.value)}>
                <option value="all">Todos os veículos</option>
                {vehicles.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ExpandList
            key={currentVehicle}
            className="news-grid"
            items={visibleArticles}
            initial={4}
            moreLabel="Ver mais notícias"
            lessLabel="Ver menos notícias"
            render={(a) => (
              <article className="news-card" key={a.id}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Ler ${a.title} em ${a.source} (abre em outra aba)`}
                >
                  <NewsVisual url={a.url} title={a.title} source={a.source} preview={a.image} />
                </a>
                <div className="news-copy">
                  <span className="eyebrow">
                    {a.source} · {time(a.publishedAt)}
                  </span>
                  <h3>
                    <a href={a.url} target="_blank" rel="noreferrer">
                      {a.title}
                    </a>
                  </h3>
                  <div className="news-actions">
                    <a
                      className="text-button"
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Ler na origem: ${a.title} (abre em outra aba)`}
                    >
                      Ler na origem
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                    <ShareButton title={a.title} url={a.url} text={`${a.title} — ${a.source}`} />
                  </div>
                </div>
              </article>
            )}
          />
        </section>
      )}
      {observatory && !loading && articles.length === 0 && !data?.message && (
        <section className="panel">
          <h2>Nenhuma notícia nesta consulta</h2>
          <p>A coleta será consultada novamente. Você pode conferir as fontes abaixo.</p>
        </section>
      )}
      {observatory && data?.stats && !loading && (
        <div id="cobertura-numeros" className="or-coverage-archive">
          <Disclosure
            title="A cobertura em números"
            summary="O acervo da imprensa ao longo do tempo. Menções não medem apoio."
          >
            {archive}
          </Disclosure>
        </div>
      )}
      <div id="fontes-cobertura" style={observatory ? undefined : { display: 'contents' }}>
        <Disclosure title="Fontes e critérios" summary="Origem dos dados e limites da cobertura">
          <div className="source-grid">
            <div>
              <strong>TSE · resultados</strong>
              <p>
                {observatory
                  ? 'Apuração oficial e acervo presidencial. Em 1994, o recorte disponível é do exterior e não representa o resultado nacional.'
                  : 'Apuração oficial e acervo presidencial. Registros históricos de 1994–1998 têm cobertura incompleta.'}
              </p>
              <Link
                iconSize={13}
                href="https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados"
              >
                Fonte dos resultados
              </Link>
            </div>
            <div>
              <strong>IBGE · território</strong>
              <p>Malha por unidade da federação e classificação por região.</p>
              <Link iconSize={13} href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3">
                Malha por estado
              </Link>
            </div>
            <div>
              <strong>SapiensLabs · imprensa</strong>
              <p>
                Cobertura pública de imprensa, coletada cinco vezes ao dia. O app consulta o acervo
                a cada 5 minutos. A coleta dos dados ocorre nos horários informados pela fonte.
              </p>
              <Link iconSize={13} href="https://eleicoes2026.sapienslabs.com.br/api">
                SapiensLabs — Eleições 2026 · CC BY 4.0
              </Link>
            </div>
            <div>
              <strong>Veículos brasileiros · notícias</strong>
              <p>
                Seleção por domínio do veículo, com fontes de diferentes linhas editoriais.
                Consultamos também feeds públicos de G1, Folha, CNN Brasil, Metrópoles, Brasil de
                Fato e Agência Brasil. Mantemos até 12 matérias por veículo, em ordem de publicação,
                sem reproduzir o texto integral.
              </p>
              <Link iconSize={13} href="/creditos">
                Créditos de imagens e licenças
              </Link>
            </div>
          </div>
          <div className="source-health">
            {(data?.feedSources || []).map((s) => (
              <div key={s.name}>
                <span className={'status-dot ' + (s.status === 'ok' ? 'ok' : '')} />
                <div>
                  <strong>{s.name} · notícias</strong>
                  <small>
                    {s.status === 'ok' ? 'Canal consultado' : 'Indisponível nesta consulta'} ·{' '}
                    {time(s.checkedAt)}
                  </small>
                </div>
                <Link iconSize={13} href={s.url}>
                  Fonte
                </Link>
              </div>
            ))}
          </div>
          <div className="notice">
            A cobertura usa publicações públicas e não identifica o voto de uma pessoa a partir de
            suas redes.
          </div>
        </Disclosure>
      </div>
    </div>
  );
}
