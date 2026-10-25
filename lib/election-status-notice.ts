import type { Result } from './elections';

/** A sourced explanation for one published partial, never a clock-based prediction. */
export function electionStatusNotice(result?: Result) {
  if (
    result?.year !== 2026 ||
    result.turn !== 2 ||
    result.uf !== 'BR' ||
    result.id !== '3948414' ||
    result.final
  )
    return null;
  return {
    title: 'Por que a parcial não avança?',
    text: 'A Agência Brasil informou que o TSE pausou a totalização às 17h06 após a prorrogação da votação até as 19h de Brasília. Este painel mantém a última parcial oficial e continua consultando o TSE. O horário de retomada não foi confirmado; novos dados aparecerão automaticamente quando a fonte os publicar.',
    source:
      'https://agenciabrasil.ebc.com.br/justica/noticia/2026-10/zanin-manda-ampliar-horario-de-votacao-ate-19h',
  };
}
