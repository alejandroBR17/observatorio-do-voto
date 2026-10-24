import { ShieldCheck } from 'lucide-react';
import type { DebateContext } from '@/lib/debate-context';
import { debateVerificationSources, type DebatePhase } from '@/lib/debate';
import type { MediaArticle } from '@/lib/media-types';
import { Source } from './components/source-link';

/** Publisher verdicts and links to coverage stay distinct, in one place. */
export function DebateChecks({
  context,
  articles,
  phase,
}: {
  context?: Partial<DebateContext> | null;
  articles: MediaArticle[];
  phase: DebatePhase;
}) {
  return (
    <section className="debate-checks" id="debate-checagens" aria-labelledby="debate-checks-title">
      <div>
        <ShieldCheck size={25} aria-hidden="true" />
        <h3 id="debate-checks-title">Checagens do debate</h3>
        <p>
          Verificações de falas deste encontro, publicadas pelas fontes durante ou depois do debate.
          A consulta é automática; os veículos podem levar tempo para publicar.
        </p>
        <p>
          O Observatório não escuta o vídeo nem decide automaticamente se uma fala é verdadeira ou
          falsa. A ausência de checagem não confirma nem refuta uma afirmação.
        </p>
      </div>
      <div>
        <div className="debate-check-sources" aria-label="Checagens completas deste debate">
          {debateVerificationSources.map((source) => (
            <a
              key={source.url}
              className="button secondary"
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              {source.source}
            </a>
          ))}
        </div>
        {context?.checks?.length ? (
          context.checks.map((check) => (
            <article className="debate-claim" key={check.url + check.claim}>
              <span>
                {check.source} ·{' '}
                {new Date(check.publishedAt).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}{' '}
                · Brasília
              </span>
              <h4>{check.claim}</h4>
              <p>
                <strong>Conclusão da fonte: {check.verdict}</strong>
              </p>
              <Source href={check.url}>Ler evidências e conclusão original</Source>
            </article>
          ))
        ) : (
          <p>
            {phase === 'before'
              ? 'Aguardando as falas e as verificações deste debate. Quando uma checagem identificada chegar, ela aparecerá aqui sem recarregar a página.'
              : 'As checagens completas estão nos veículos acima, com as conclusões e as evidências. As verificações podem receber complementos e correções dos próprios veículos.'}
          </p>
        )}
        {articles.length > 0 && (
          <div className="debate-check-publications">
            <strong>Publicações sobre checagem</strong>
            <p>Estes links levam à cobertura. Um título de reportagem não é um veredito.</p>
            {articles.slice(0, 4).map((article) => (
              <Source key={article.url} href={article.url}>
                {article.source} · {article.title}
              </Source>
            ))}
          </div>
        )}
        {context?.status && context.status !== 'ready' && (
          <p className="fine">
            A consulta de checagens está temporariamente limitada. Você pode consultar as fontes
            pelos links acima.
          </p>
        )}
      </div>
    </section>
  );
}
