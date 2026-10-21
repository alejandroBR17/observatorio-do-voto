'use client';
import { useCallback, useEffect, useState } from 'react';
import { Bell, ExternalLink, Trash2, RotateCcw, LoaderCircle, CloudOff } from 'lucide-react';
import { ExpandList } from './disclosure';
export type Received = {
  id: string;
  title: string;
  body: string;
  url: string;
  receivedAt: number;
  test?: boolean;
};
async function historyRequest(clear = false): Promise<Received[]> {
  if (!('serviceWorker' in navigator)) return [];
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.active) return [];
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(Error('Atualize a página para consultar o histórico.'));
    }, 5000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      if (event.data.error) reject(Error(event.data.error));
      else resolve(Array.isArray(event.data.items) ? event.data.items : []);
    };
    registration.active!.postMessage(
      { type: clear ? 'notification-history:clear' : 'notification-history:list' },
      [channel.port2],
    );
  });
}
export type HistoryPreview = { status: 'loading' | 'ready' | 'error'; items: Received[] };
export function NotificationHistory({ preview }: { preview?: HistoryPreview } = {}) {
  const [items, setItems] = useState<Received[]>(preview?.items || []);
  const [error, setError] = useState(
    preview?.status === 'error' ? 'Não foi possível consultar os avisos agora.' : '',
  );
  const [busy, setBusy] = useState(!preview || preview.status === 'loading');
  const [loaded, setLoaded] = useState(!!preview && preview.status !== 'loading');
  const [confirmClear, setConfirmClear] = useState(false);
  const refresh = useCallback(
    async (clear = false) => {
      if (preview) {
        setItems(clear ? [] : preview.items);
        setError('');
        setConfirmClear(false);
        setBusy(false);
        setLoaded(true);
        return;
      }
      setBusy(true);
      try {
        setItems(await historyRequest(clear));
        setError('');
        setConfirmClear(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Histórico indisponível.');
      } finally {
        setBusy(false);
        setLoaded(true);
      }
    },
    [preview],
  );
  useEffect(() => {
    if (preview) return;
    void refresh();
    const update = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const message = (event: MessageEvent) => {
      if (event.data?.type === 'notification-history:updated') void refresh();
    };
    document.addEventListener('visibilitychange', update);
    navigator.serviceWorker?.addEventListener('message', message);
    navigator.serviceWorker?.addEventListener('controllerchange', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      navigator.serviceWorker?.removeEventListener('message', message);
      navigator.serviceWorker?.removeEventListener('controllerchange', update);
    };
  }, [refresh, preview]);
  return (
    <section
      className="panel notification-history"
      aria-labelledby="received-alerts-title"
      aria-busy={busy}
    >
      <div className="panel-head">
        <div>
          <span className="eyebrow">NESTE APARELHO</span>
          <h2 id="received-alerts-title">Avisos recebidos</h2>
        </div>
        {!error && (
          <button
            className="button secondary history-refresh"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RotateCcw size={16} aria-hidden="true" />
            {busy ? 'Consultando…' : 'Atualizar histórico'}
          </button>
        )}
      </div>
      <p className="fine">Até 50 avisos dos últimos 30 dias, guardados somente neste aparelho.</p>
      {error && (
        <div className="history-state history-error" role="status">
          <CloudOff size={26} aria-hidden="true" />
          <div>
            <strong>A consulta não terminou.</strong>
            <p>
              {error}
              {items.length > 0 && ' Os avisos já carregados continuam abaixo.'}
            </p>
            <button className="button secondary" disabled={busy} onClick={() => void refresh()}>
              Tentar novamente
            </button>
          </div>
        </div>
      )}
      {busy && !loaded ? (
        <div className="history-state" role="status">
          <LoaderCircle className="history-loader" size={26} aria-hidden="true" />
          <div>
            <strong>Consultando seus avisos.</strong>
            <p>Buscando o que ficou guardado neste aparelho.</p>
          </div>
        </div>
      ) : !items.length && !error ? (
        <div className="history-state history-empty">
          <Bell size={26} aria-hidden="true" />
          <div>
            <strong>Seu próximo aviso aparece aqui.</strong>
            <p>
              Releia as atualizações que este aparelho receber. Guardar o histórico não gera
              notificações extras.
            </p>
          </div>
        </div>
      ) : items.length > 0 ? (
        <ExpandList
          items={items}
          initial={4}
          className="received-list"
          moreLabel="Ver mais avisos"
          lessLabel="Ver menos avisos"
          render={(item) => (
            <article className="received-alert" key={item.id}>
              <time dateTime={new Date(item.receivedAt).toISOString()}>
                {new Date(item.receivedAt).toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
                {item.test ? ' · Teste' : ''}
              </time>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <a
                className="text-button"
                href={
                  preview
                    ? `/identidade${item.url.startsWith('/?') ? item.url.slice(1) : '?tab=alerts'}`
                    : item.url.startsWith('/?')
                      ? item.url
                      : '/?tab=alerts'
                }
              >
                Ver atualização <ExternalLink size={14} aria-hidden="true" />
              </a>
            </article>
          )}
        />
      ) : null}
      {items.length > 0 && (
        <div className="history-tools">
          {confirmClear ? (
            <>
              <span>Apagar os avisos deste aparelho?</span>
              <button className="button danger" disabled={busy} onClick={() => void refresh(true)}>
                Apagar histórico
              </button>
              <button className="button secondary" onClick={() => setConfirmClear(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <button className="text-button danger" onClick={() => setConfirmClear(true)}>
              <Trash2 size={14} aria-hidden="true" />
              Limpar histórico
            </button>
          )}
        </div>
      )}
    </section>
  );
}
