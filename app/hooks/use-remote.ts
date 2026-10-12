'use client';
import { useEffect, useState } from 'react';

export type RemoteState = {
  status?: string;
  checkedAt?: string | null;
  stale?: boolean;
  message?: string;
};
export type RemoteData<T> = Partial<T> & RemoteState;

// Reuse the last response during a source outage; loading responses retry briefly.
export function useRemote<T extends object>(url: string, interval: number) {
  const [data, setData] = useState<RemoteData<T> | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let canceled = false,
      attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error();
        const j = (await r.json()) as RemoteData<T>;
        if (canceled) return;
        setData(j);
        if (j.status === 'loading' && attempt++ < 12) {
          retry = setTimeout(run, 2000);
          return;
        }
        setLoading(false);
        attempt = 0;
      } catch {
        if (!canceled) {
          setLoading(false);
          setData((d) =>
            d
              ? { ...d, status: 'stale' }
              : ({
                  status: 'unavailable',
                  message: 'Sem conexão com a fonte. Tente novamente.',
                } as RemoteData<T>),
          );
        }
      }
    };
    const resume = () => {
      if (document.visibilityState === 'visible') run();
    };
    run();
    const id = setInterval(run, interval);
    document.addEventListener('visibilitychange', resume);
    return () => {
      canceled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', resume);
      if (retry) clearTimeout(retry);
    };
  }, [url, interval]);
  return { data, loading };
}
