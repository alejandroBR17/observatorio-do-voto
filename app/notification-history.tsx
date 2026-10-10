'use client';
import { useCallback, useEffect, useState } from 'react';
import { Bell, ExternalLink, Trash2 } from 'lucide-react';
import { ExpandList } from './disclosure';
type Received = {
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
export function NotificationHistory() {
  const [items, setItems] = useState<Received[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const refresh = useCallback(async (clear = false) => {
    setBusy(true);
    try {
      setItems(await historyRequest(clear));
      setError('');
      setConfirmClear(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Histórico indisponível.');
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
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
  }, [refresh]);
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
        <Bell size={20} aria-hidden="true" />
      </div>
      <p className="fine">
        Até 50 avisos dos últimos 30 dias, guardados somente aqui. Começamos a registrar a partir
        desta atualização; avisos antigos não são recuperados.
      </p>
      {error ? (
        <p role="status">
          {error}{' '}
          <button className="text-button" onClick={() => void refresh()}>
            Tentar novamente
          </button>
        </p>
      ) : !items.length ? (
        <p className="history-empty">
          Quando este aparelho receber um alerta, ele aparecerá aqui. O histórico não gera
          notificações extras.
        </p>
      ) : (
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
                href={item.url.startsWith('/?') ? item.url : '/?tab=alerts'}
              >
                Ver atualização <ExternalLink size={14} aria-hidden="true" />
              </a>
            </article>
          )}
        />
      )}
      {items.length > 0 && (
        <div className="history-tools">
          {confirmClear ? (
            <>
              <span>Apagar os avisos deste aparelho?</span>
              <button className="text-button" disabled={busy} onClick={() => void refresh(true)}>
                Apagar histórico
              </button>
              <button className="text-button" onClick={() => setConfirmClear(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <button className="text-button" onClick={() => setConfirmClear(true)}>
              <Trash2 size={14} aria-hidden="true" />
              Limpar histórico
            </button>
          )}
        </div>
      )}
    </section>
  );
}
