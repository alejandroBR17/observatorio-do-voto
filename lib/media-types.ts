/** Public coverage returned by /api/media; no individual voter data. */
export type MediaArticle = {
  id: string | number;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  image?: string;
};

export type MediaResponse = {
  stats?: {
    articles: number;
    sources: number;
    today: number;
    updated: string;
    cutoff: string;
  };
  candidates?: { slug: string; name: string; articles: number }[];
  articles: MediaArticle[];
  feedSources?: {
    name: string;
    url: string;
    status: string;
    checkedAt: string;
    count: number;
  }[];
};
