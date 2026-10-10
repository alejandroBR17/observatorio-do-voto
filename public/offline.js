(() => {
  const get = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  };
  const preferences = get('observatorio.preferences');
  if (preferences && ['light', 'dark'].includes(preferences.theme))
    document.documentElement.dataset.theme = preferences.theme;
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const connection = () => {
    document.getElementById('connection').textContent = navigator.onLine
      ? 'A conexão parece disponível. Volte ao app para consultar novos dados.'
      : 'Sem conexão. Os dados abaixo são os que você guardou, sem atualização ao vivo.';
  };
  connection();
  window.addEventListener('online', connection);
  window.addEventListener('offline', connection);
  document.getElementById('reconnect').addEventListener('click', () => {
    location.href = '/?tab=overview';
  });
  const result = get('observatorio.offline-result');
  if (
    result?.version === 1 &&
    result.final === true &&
    result.uf === 'BR' &&
    Number.isInteger(result.year) &&
    [1, 2].includes(result.turn) &&
    Array.isArray(result.candidates) &&
    result.candidates.length <= 30 &&
    typeof result.savedAt === 'string' &&
    Number.isFinite(Date.parse(result.savedAt))
  ) {
    const candidates = result.candidates.filter(
      (c) =>
        typeof c?.name === 'string' &&
        Number.isSafeInteger(c.votes) &&
        c.votes >= 0 &&
        Number.isFinite(c.percent) &&
        c.percent >= 0 &&
        c.percent <= 100,
    );
    if (candidates.length === result.candidates.length && candidates.length) {
      const container = document.getElementById('saved-result');
      container.hidden = false;
      document.getElementById('result-empty').hidden = true;
      container.append(
        element('p', `Brasil · resultado final do ${result.turn}º turno de ${result.year}`),
      );
      container.append(
        element(
          'p',
          `Guardado em ${new Date(result.savedAt).toLocaleString('pt-BR')}. Esta cópia não recebe atualizações.`,
          'fine',
        ),
      );
      for (const c of candidates) {
        const row = element('div', '', 'saved-candidate');
        row.append(
          element('strong', c.name.slice(0, 100)),
          element(
            'span',
            `${c.percent.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% · ${c.votes.toLocaleString('pt-BR')} votos`,
          ),
        );
        container.append(row);
      }
      if (typeof result.generated === 'string')
        container.append(element('p', `Fonte gerada em ${result.generated.slice(0, 100)}`, 'fine'));
      try {
        const url = new URL(result.source);
        if (url.protocol === 'https:' && url.hostname === 'resultados.tse.jus.br') {
          const link = element('a', 'Conferir a fonte quando estiver conectado');
          link.href = url.href;
          link.rel = 'noopener noreferrer';
          container.append(link);
        }
      } catch {}
    }
  }
  const watch = get('observatorio.watch');
  const notes = Array.isArray(watch?.entries)
    ? watch.entries.slice(0, 100)
    : typeof watch?.note === 'string'
      ? [{ title: 'Minha anotação anterior', body: watch.note }]
      : [];
  for (const note of notes) {
    if (typeof note?.body !== 'string' || !note.body.trim()) continue;
    document.getElementById('notes-empty').hidden = true;
    const card = element('article', '', 'note');
    card.append(
      element(
        'h3',
        typeof note.title === 'string'
          ? note.title.slice(0, 80) || 'Minha anotação'
          : 'Minha anotação',
      ),
      element('p', note.body.slice(0, 10000)),
    );
    document.getElementById('notes').append(card);
  }
})();
