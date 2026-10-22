'use client';
import { useMemo, useState } from 'react';
import { rankContent, type ContentItem } from '@/lib/content-personalization';
import { usePersonalization } from './personalization';
import { ExpandList } from './disclosure';

export function PersonalizedFeed<T extends ContentItem>({
  items,
  publication = false,
  moreLabel,
  lessLabel,
  render,
}: {
  items: T[];
  publication?: boolean;
  moreLabel: string;
  lessLabel: string;
  render: (item: T) => React.ReactNode;
}) {
  const { state } = usePersonalization();
  return (
    <FeedSession
      key={`${state.enabled && state.contentEnabled}`}
      items={items}
      publication={publication}
      moreLabel={moreLabel}
      lessLabel={lessLabel}
      render={render}
    />
  );
}
function FeedSession<T extends ContentItem>({
  items,
  publication,
  moreLabel,
  lessLabel,
  render,
}: {
  items: T[];
  publication: boolean;
  moreLabel: string;
  lessLabel: string;
  render: (item: T) => React.ReactNode;
}) {
  const { state, content, orderContent } = usePersonalization();
  const [initial] = useState(state);
  const personalized = state.contentOrder !== 'recent';
  const enabled = state.enabled && state.contentEnabled;
  const ranked = useMemo(
    () =>
      enabled && personalized
        ? rankContent(items, initial, publication)
        : [...items].sort(
            (a, b) =>
              (Date.parse(b.publishedAt || '') || 0) - (Date.parse(a.publishedAt || '') || 0),
          ),
    [items, initial, publication, enabled, personalized],
  );
  function follow(event: React.MouseEvent) {
    if (event.button !== 0 && event.button !== 1) return;
    if (!(event.target instanceof Element)) return;
    const href = event.target.closest('a')?.getAttribute('href');
    const item = items.find((item) => item.url === href);
    if (item) content(item, publication);
  }
  return (
    <div onClickCapture={follow} onAuxClickCapture={follow}>
      {enabled && (
        <div className="feed-order">
          <label>
            Organizar por{' '}
            <select
              value={personalized ? 'personal' : 'recent'}
              onChange={(e) => orderContent(e.target.value === 'personal' ? 'personal' : 'recent')}
            >
              <option value="personal">Para você</option>
              <option value="recent">Mais recentes</option>
            </select>
          </label>
          <p className="fine">
            {personalized
              ? 'Seu uso ajuda a ordenar. Novidades e outras fontes continuam presentes; nenhuma matéria é removida. A ordem fica estável durante esta leitura.'
              : 'Ordem de publicação. Você pode voltar à seleção personalizada quando quiser.'}
          </p>
        </div>
      )}
      <ExpandList
        key={personalized ? 'personal' : 'recent'}
        className="news-grid"
        items={ranked}
        initial={4}
        moreLabel={moreLabel}
        lessLabel={lessLabel}
        render={render}
      />
    </div>
  );
}
