export type PollSnapshot = {
  id: string;
  institute: string;
  publishedAt: string;
  fieldwork: string;
  sample: number;
  margin: number;
  confidence: number | null;
  registration: string;
  scope: string;
  turn: number;
  basis: 'valid' | 'total';
  flavio: number;
  lula: number;
  source: string;
  mode: 'snapshot' | 'automatic';
  totalVotes?: {
    flavio: number;
    lula: number;
    blankNull?: number;
    undecided?: number;
    other?: number;
  };
  note?: string;
};
export type Publication = {
  institute: string;
  title: string;
  url: string;
  publishedAt: string | null;
  source: string;
  kind: 'publication';
  dateOnly?: boolean;
  publisher?: string;
  stale?: boolean;
};

export type PollSource = {
  name: string;
  url: string;
  status: 'ok' | 'empty' | 'unavailable';
  checkedAt: string;
  count: number;
};
export type PollResponse = {
  polls: PollSnapshot[];
  publications: Publication[];
  sources: PollSource[];
  latestPublishedAt?: string | null;
  cacheSeconds?: number;
  notice?: string;
  registrationSource?: string;
};
