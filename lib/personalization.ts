import { states } from './elections';

export const learningKey = 'observatorio.learning.v1';
export const learningTopics = [
  'overview',
  'history',
  'polls',
  'social',
  'live',
  'watch',
  'municipality',
] as const;
export type LearningTopic = (typeof learningTopics)[number];
export const learningRegions = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];
const DAY = 86400000;
type Signal = { value: number; at: number };
export type LearningState = {
  version: 1;
  enabled: boolean;
  autoDetails: boolean;
  interests: Record<string, Signal>;
  corrections: Record<string, Signal>;
  seen: Record<string, { count: number; at: number }>;
  detail: { value: number; samples: number; at: number };
};
export function emptyLearning(): LearningState {
  return {
    version: 1,
    enabled: false,
    autoDetails: true,
    interests: {},
    corrections: {},
    seen: {},
    detail: { value: 0, samples: 0, at: 0 },
  };
}
export function validInterest(key: string) {
  if (key.split(':').length !== 2) return false;
  const [kind, value, extra] = key.split(':');
  return (
    !extra &&
    (kind === 'topic'
      ? learningTopics.some((topic) => topic === value)
      : kind === 'state'
        ? states.some((state) => state[1] === value)
        : kind === 'region' && learningRegions.includes(value))
  );
}
const fresh = (at: unknown, now: number): at is number =>
  typeof at === 'number' && Number.isFinite(at) && at > now - 30 * DAY && at <= now;
export function readLearning(raw: unknown, now = Date.now()): LearningState {
  const result = emptyLearning();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
  const input = raw as Partial<LearningState>;
  if (input.version !== 1) return result;
  result.enabled = input.enabled === true;
  result.autoDetails = input.autoDetails !== false;
  for (const kind of ['interests', 'corrections'] as const) {
    if (!input[kind] || typeof input[kind] !== 'object' || Array.isArray(input[kind])) continue;
    for (const [key, signal] of Object.entries(input[kind])) {
      if (
        !validInterest(key) ||
        !signal ||
        !fresh(signal.at, now) ||
        !Number.isFinite(signal.value)
      )
        continue;
      result[kind][key] = {
        value:
          kind === 'corrections'
            ? Math.sign(signal.value)
            : Math.max(0, Math.min(12, signal.value)),
        at: signal.at,
      };
    }
  }
  if (input.seen && typeof input.seen === 'object' && !Array.isArray(input.seen)) {
    for (const [id, item] of Object.entries(input.seen).slice(0, 64)) {
      if (
        /^(overview|history|polls|social|live|watch|municipality)(:(?:[A-Z]{2}|Norte|Nordeste|Centro-Oeste|Sudeste|Sul))?$/.test(
          id,
        ) &&
        item &&
        fresh(item.at, now) &&
        Number.isInteger(item.count)
      )
        result.seen[id] = { count: Math.max(0, Math.min(10, item.count)), at: item.at };
    }
  }
  if (
    input.detail &&
    fresh(input.detail.at, now) &&
    Number.isFinite(input.detail.value) &&
    Number.isInteger(input.detail.samples)
  )
    result.detail = {
      value: Math.max(-10, Math.min(10, input.detail.value)),
      samples: Math.max(0, Math.min(100, input.detail.samples)),
      at: input.detail.at,
    };
  return result;
}
export function interestValue(signal: Signal | undefined, now = Date.now()) {
  return signal && fresh(signal.at, now)
    ? signal.value * Math.pow(0.5, (now - signal.at) / (7 * DAY))
    : 0;
}
export function learnInterest(state: LearningState, key: string, now = Date.now()): LearningState {
  if (!state.enabled || !validInterest(key)) return state;
  const previous = state.interests[key];
  // Re-rendering, rapid clicks and reloads must not turn one visit into many interests.
  if (previous && now - previous.at < 20 * 60000) return state;
  const next = readLearning(state, now);
  next.interests[key] = { value: Math.min(12, interestValue(previous, now) + 1), at: now };
  return next;
}
export function learnDetail(
  state: LearningState,
  direction: 1 | -1,
  now = Date.now(),
): LearningState {
  if (!state.enabled || !state.autoDetails) return state;
  const next = readLearning(state, now);
  if (next.detail.at && now - next.detail.at < 4000) return state;
  next.detail = {
    value: Math.max(-10, Math.min(10, next.detail.value + direction)),
    samples: next.detail.samples + 1,
    at: now,
  };
  return next;
}
export function suggestedReading(state: LearningState) {
  if (!state.enabled || !state.autoDetails || state.detail.samples < 4) return null;
  return state.detail.value >= 3
    ? ('detailed' as const)
    : state.detail.value <= -3
      ? ('essential' as const)
      : null;
}
export type Discovery = {
  id: string;
  topic: LearningTopic;
  title: string;
  description: string;
  state?: string;
  region?: string;
  publishedAt?: string;
};
export function discoveryKeys(item: Discovery) {
  return [
    `topic:${item.topic}`,
    ...(item.state ? [`state:${item.state}`] : []),
    ...(item.region ? [`region:${item.region}`] : []),
  ];
}
export function discoveryFeedbackKey(item: Discovery) {
  return item.state
    ? `state:${item.state}`
    : item.region
      ? `region:${item.region}`
      : `topic:${item.topic}`;
}
export function correctInterest(
  state: LearningState,
  key: string,
  value: -1 | 0 | 1,
  now = Date.now(),
) {
  if ((!state.enabled && value !== 0) || !validInterest(key)) return state;
  const next = readLearning(state, now);
  if (value === 0) delete next.corrections[key];
  else next.corrections[key] = { value, at: now };
  return next;
}
export function rankDiscoveries(state: LearningState, items: Discovery[], now = Date.now()) {
  if (!state.enabled) return [];
  const clean = readLearning(state, now);
  const used = new Set<string>();
  const ranked = items
    .filter((item) => {
      if (used.has(item.id)) return false;
      used.add(item.id);
      const viewed = clean.seen[item.id];
      const newerData = Date.parse(item.publishedAt || '') > (viewed?.at || Infinity);
      return (
        !(viewed && viewed.count >= 3 && now - viewed.at < 7 * DAY && !newerData) &&
        !discoveryKeys(item).some((key) => clean.corrections[key]?.value === -1)
      );
    })
    .map((item, index) => {
      const score = discoveryKeys(item).reduce(
        (sum, key) =>
          sum +
          interestValue(clean.interests[key], now) * 2 +
          (clean.corrections[key]?.value === 1 ? 50 : 0),
        0,
      );
      const published = Date.parse(item.publishedAt || '');
      const recency =
        Number.isFinite(published) && published <= now
          ? Math.max(0, 1.5 - (now - published) / DAY)
          : 0;
      const viewed = clean.seen[item.id];
      const repeat = viewed && published > viewed.at ? 0 : (viewed?.count || 0) * 2;
      return { item, score: score + recency - repeat - index * 0.01 };
    })
    .sort((a, b) => b.score - a.score);
  const topics = new Set<string>();
  return ranked
    .filter(({ item }) => {
      if (topics.has(item.topic)) return false;
      topics.add(item.topic);
      return true;
    })
    .slice(0, 3)
    .map(({ item }) => item);
}
export function noteDiscoveries(state: LearningState, ids: string[], now = Date.now()) {
  if (!state.enabled) return state;
  const next = readLearning(state, now);
  for (const id of ids) {
    const old = next.seen[id];
    if (!old || now - old.at > 20 * 60000)
      next.seen[id] = { count: Math.min(10, (old?.count || 0) + 1), at: now };
  }
  return readLearning(next, now);
}
