'use client';
import { useEffect, useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
export function ShareButton({
  title,
  url,
  text,
  label = 'Compartilhar',
}: {
  title: string;
  url: string | (() => string);
  text?: string;
  label?: string;
}) {
  const [status, setStatus] = useState('');
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(typeof navigator.share === 'function');
  }, []);
  async function copy(link = typeof url === 'function' ? url() : url) {
    setManual('');
    try {
      await navigator.clipboard.writeText(link);
      setStatus('Link copiado.');
    } catch {
      setManual(link);
      setStatus('Selecione e copie o link abaixo.');
    }
  }
  async function share() {
    if (busy) return;
    setBusy(true);
    setStatus('');
    setManual('');
    const link = typeof url === 'function' ? url() : url;
    try {
      if (navigator.share) await navigator.share({ title, text, url: link });
      else await copy(link);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        await copy(link);
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="share-control">
      <div className="share-actions" role="group" aria-label={`Compartilhar: ${title}`}>
        <button
          type="button"
          className="button secondary share-button"
          onClick={() => void share()}
          disabled={busy}
          aria-label={`${label}: ${title}`}
        >
          {status === 'Link copiado.' ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <Share2 size={15} aria-hidden="true" />
          )}
          <span className="share-label">{label}</span>
          {label !== 'Compartilhar' && <span className="share-label-short">Compartilhar</span>}
        </button>
        {native && (
          <button
            type="button"
            className="button secondary copy-link-button"
            disabled={busy}
            title="Copiar link"
            aria-label={`Copiar link: ${title}`}
            onClick={() => void copy()}
          >
            {status === 'Link copiado.' ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      <span className="share-feedback" role="status" aria-atomic="true">
        {status && (
          <>
            {status === 'Link copiado.' && <Check size={14} aria-hidden="true" />}
            {status}
          </>
        )}
      </span>
      {manual && (
        <input
          aria-label="Link para compartilhar"
          readOnly
          value={manual}
          onFocus={(e) => e.target.select()}
        />
      )}
    </div>
  );
}
