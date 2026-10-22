import { states } from './elections';
import {
  discoveryFeedbackKey,
  interestValue,
  type Discovery,
  type LearningState,
} from './personalization';

export function buildDiscoveries(state: LearningState, publishedAt?: string): Discovery[] {
  const items: Discovery[] = [
    {
      id: 'polls',
      topic: 'polls',
      title: 'Compare as rodadas de pesquisas',
      description: 'Veja os dois candidatos, datas de coleta e métodos de cada instituto.',
      publishedAt,
    },
    {
      id: 'history',
      topic: 'history',
      title: 'Percorra outras eleições',
      description: 'Mude o ano e o turno para descobrir como o voto se distribuiu pelo país.',
    },
    {
      id: 'municipality',
      topic: 'municipality',
      title: 'Explore o voto perto de você',
      description: 'Consulte um município e, se quiser, os resultados de um colégio ou seção.',
    },
    {
      id: 'overview',
      topic: 'overview',
      title: 'Observe as cinco regiões',
      description: 'Compare quem recebeu mais votos em cada região do Brasil.',
    },
    {
      id: 'social',
      topic: 'social',
      title: 'Confira o contexto e as fontes',
      description: 'Acesse a cobertura eleitoral identificada por veículo e data.',
    },
    {
      id: 'live',
      topic: 'live',
      title: 'Prepare seu acompanhamento da apuração',
      description: 'Consulte o horário e a disponibilidade dos resultados oficiais.',
    },
    {
      id: 'watch',
      topic: 'watch',
      title: 'Retome seu caderno',
      description: 'Reúna os lugares que acompanha e as observações que você guardou.',
    },
  ];
  const places = Object.entries(state.interests)
    .filter(([key, signal]) => !key.startsWith('topic:') && interestValue(signal) >= 0.5)
    .sort((a, b) => interestValue(b[1]) - interestValue(a[1]))
    .slice(0, 2);
  for (const [key] of places) {
    const [kind, value] = key.split(':');
    const name = kind === 'state' ? states.find((row) => row[1] === value)?.[2] : value;
    if (!name) continue;
    const place = kind === 'state' ? { state: value } : { region: value };
    items.unshift({
      id: `history:${value}`,
      topic: 'history',
      title: `Explore ${name} em outras eleições`,
      description: 'Compare anos e turnos do acervo oficial neste recorte.',
      ...place,
    });
    items.unshift({
      id: `overview:${value}`,
      topic: 'overview',
      title: `Volte a observar ${name}`,
      description: 'Veja os candidatos e os votos deste recorte no Panorama.',
      ...place,
    });
  }
  return items;
}
export function discoveryReason(state: LearningState, item: Discovery) {
  if (state.corrections[discoveryFeedbackKey(item)]?.value === 1)
    return 'Você pediu mais deste assunto.';
  if (item.state || item.region) return 'Você tem explorado este lugar.';
  if (interestValue(state.interests[`topic:${item.topic}`]) >= 0.5)
    return 'Relacionado às suas consultas recentes.';
  return 'Uma possibilidade para ampliar sua exploração.';
}
export function learningLabel(key: string) {
  const [kind, value] = key.split(':');
  if (kind === 'state') return states.find((state) => state[1] === value)?.[2] || value;
  if (kind === 'region') return value;
  const labels: Record<string, string> = {
    overview: 'Panorama e regiões',
    history: 'Eleições anteriores',
    polls: 'Pesquisas',
    social: 'Cobertura e fontes',
    live: 'Apuração',
    watch: 'Meu acompanhamento',
    municipality: 'Municípios',
  };
  return labels[value] || 'Exploração';
}
