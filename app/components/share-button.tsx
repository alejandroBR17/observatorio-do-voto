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
      <button
        className="text-button share-button"
        onClick={() => void share()}
        disabled={busy}
        aria-label={`${label}: ${title}`}
      >
        {status === 'Link copiado.' ? (
          <Check size={15} aria-hidden="true" />
        ) : (
          <Share2 size={15} aria-hidden="true" />
        )}
        {label}
      </button>
      {native && (
        <button
          className="text-button copy-link-button"
          title="Copiar link"
          aria-label={`Copiar link: ${title}`}
          onClick={() => void copy()}
        >
          <Copy size={15} aria-hidden="true" />
        </button>
      )}
      <span className="share-feedback" role="status">
        {status}
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
