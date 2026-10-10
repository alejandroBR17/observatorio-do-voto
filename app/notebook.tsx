'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  BookOpen,
  PenLine,
  Check,
  RotateCcw,
  LoaderCircle,
  TriangleAlert,
} from 'lucide-react';
import { states } from '@/lib/elections';
import { noteTopics, type NotebookEntry } from '@/lib/notebook';
export function Notebook({
  entries,
  onChange,
  saved,
  savedAt,
  selectedNote,
}: {
  entries: NotebookEntry[];
  onChange: (entries: NotebookEntry[]) => void;
  saved: 'saving' | 'saved' | 'error';
  savedAt: string | null;
  selectedNote?: string;
}) {
  const [selected, setSelected] = useState(selectedNote || entries[0]?.id || ''),
    [deleted, setDeleted] = useState<NotebookEntry | null>(null),
    body = useRef<HTMLTextAreaElement>(null);
  const active = entries.find((n) => n.id === selected) || entries[0];
  useEffect(() => {
    if (selectedNote) setSelected(selectedNote);
  }, [selectedNote]);
  function add() {
    if (entries.length >= 100) return;
    const entry: NotebookEntry = {
      id: crypto.randomUUID(),
      title: '',
      body: '',
      topic: 'Observações',
      uf: 'BR',
      updated: new Date().toISOString(),
    };
    onChange([entry, ...entries]);
    setSelected(entry.id);
    requestAnimationFrame(() => body.current?.focus());
  }
  function update(fields: Partial<NotebookEntry>) {
    if (!active) return;
    onChange(
      entries.map((n) =>
        n.id === active.id ? { ...n, ...fields, updated: new Date().toISOString() } : n,
      ),
    );
  }
  function remove() {
    if (!active) return;
    setDeleted(active);
    onChange(entries.filter((n) => n.id !== active.id));
    setSelected('');
  }
  const title = (n: NotebookEntry) =>
    n.title ||
    n.body
      .split('\n')
      .find((line) => line.trim())
      ?.slice(0, 65) ||
    'Nova anotação';
  const status = (
    <span className={'notebook-save ' + saved} role="status" aria-live="polite">
      {saved === 'saving' ? (
        <LoaderCircle size={16} />
      ) : saved === 'error' ? (
        <TriangleAlert size={16} />
      ) : (
        <Check size={16} />
      )}
      <span>
        {saved === 'saving'
          ? 'Salvando…'
          : saved === 'error'
            ? 'Não foi possível salvar. Seu texto continua nesta tela.'
            : savedAt
              ? 'Salvo neste aparelho às ' +
                new Date(savedAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'Anotações recuperadas deste aparelho'}
      </span>
    </span>
  );
  return (
    <section className="panel notebook">
      <div className="panel-head">
        <div>
          <span className="eyebrow">SEU CADERNO</span>
          <h2>O que você quer guardar?</h2>
          <p className="fine">Escreva livremente. Salvamos automaticamente neste navegador.</p>
        </div>
        <button className="button secondary" disabled={entries.length >= 100} onClick={add}>
          <Plus size={16} />
          Nova anotação
        </button>
      </div>
      {status}
      {entries.length ? (
        <div className="notebook-layout">
          <nav className="notebook-list" aria-label="Suas anotações">
            {entries.map((n) => (
              <button
                key={n.id}
                className={active?.id === n.id ? 'selected' : ''}
                aria-pressed={active?.id === n.id}
                onClick={() => setSelected(n.id)}
              >
                <PenLine size={15} />
                <span>
                  <strong>{title(n)}</strong>
                  <small>
                    {n.topic} · {n.uf === 'BR' ? 'Brasil' : states.find((s) => s[1] === n.uf)?.[2]}
                  </small>
                </span>
              </button>
            ))}
          </nav>
          {active && (
            <div className="notebook-editor" key={active.id}>
              <label className="form-label note-body-label">
                Sua anotação
                <textarea
                  ref={body}
                  aria-label="Sua anotação"
                  value={active.body}
                  onChange={(e) => update({ body: e.target.value })}
                  maxLength={10000}
                  rows={9}
                  placeholder="Uma diferença entre estados, uma pesquisa que chamou atenção ou uma pergunta para conferir depois…"
                />
              </label>
              {active.body.length > 9500 && (
                <small>{active.body.length.toLocaleString('pt-BR')}/10.000 caracteres</small>
              )}
              <details className="inline-details note-organize">
                <summary>Organizar esta anotação · opcional</summary>
                <label className="form-label">
                  Título
                  <input
                    value={active.title}
                    onChange={(e) => update({ title: e.target.value })}
                    maxLength={80}
                    placeholder="Dê um nome, se quiser"
                  />
                </label>
                <div className="note-fields">
                  <label className="form-label">
                    Assunto
                    <select
                      aria-label="Assunto da anotação"
                      value={active.topic}
                      onChange={(e) => update({ topic: e.target.value })}
                    >
                      {noteTopics.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="form-label">
                    Estado ou país
                    <select
                      aria-label="Abrangência da anotação"
                      value={active.uf}
                      onChange={(e) => update({ uf: e.target.value })}
                    >
                      <option value="BR">Brasil inteiro</option>
                      {states.map((s) => (
                        <option key={s[1]} value={s[1]}>
                          {s[2]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </details>
              <div className="note-editor-footer">
                <small>
                  {active.updated
                    ? 'Editada em ' + new Date(active.updated).toLocaleString('pt-BR')
                    : 'Anotação recuperada do caderno anterior'}
                </small>
                <button className="text-button" onClick={remove}>
                  <Trash2 size={14} />
                  Excluir anotação
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="notebook-empty">
          <BookOpen size={40} strokeWidth={1.3} />
          <h3>Comece com uma observação.</h3>
          <p>
            Você também pode usar “Anotar sobre este resultado” nas pesquisas e nos resultados. O
            contexto vem junto.
          </p>
          <button className="button primary" onClick={add}>
            <Plus size={16} />
            Criar minha primeira anotação
          </button>
        </div>
      )}
      {deleted && (
        <div className="notice" role="status">
          <span>Anotação excluída.</span>
          <button
            className="text-button"
            onClick={() => {
              onChange([deleted, ...entries]);
              setSelected(deleted.id);
              setDeleted(null);
            }}
          >
            <RotateCcw size={14} />
            Desfazer
          </button>
        </div>
      )}
      <p className="fine notebook-privacy">
        As anotações ficam somente neste navegador. Limpar os dados do site remove o caderno.
      </p>
    </section>
  );
}
