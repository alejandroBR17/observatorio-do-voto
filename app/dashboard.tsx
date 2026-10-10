'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Globe2,
  Heart,
  Info,
  Radio,
  Search,
  ShieldCheck,
  Users,
  X,
  TrendingUp,
  RefreshCw,
  Vote,
  BarChart3,
  UserRound,
  ArrowUp,
  PanelLeft,
  MapPin,
  Expand,
  Smartphone,
} from 'lucide-react';
import { normalize, states, Result } from '@/lib/elections';
import { candidates, bioSource, years } from '@/lib/content';
import { PollOverview, PollExplorer, MediaExplorer, Watchboard } from './insights';
import { Disclosure } from './disclosure';
import { Profile, Alerts } from './user-space';
import { usePresence, transitionPage, scrollBehavior } from './motion';
import { ReadingProvider, useReading } from './reading';
import { Onboarding, type WelcomeChoices } from './onboarding';
import { Map } from './geo-map';
import { LiveCountdown } from './live-countdown';
import { ThemeMenu } from './theme-menu';
import { TransferScenario } from './transfer-scenario';
import { RecentUpdates } from './recent-updates';
import { readWatch, type NotebookEntry } from '@/lib/notebook';
import { termsVersion } from '@/lib/terms';
import { alertPreferences, defaultAlerts } from '@/lib/alerts';
import { Source } from './components/source-link';
import { Progression, type ProgressionPoint } from './components/vote-progression';
import { DataFreshness } from './components/data-freshness';
import { MunicipalityExplorer } from './municipality-explorer';
import { ElectionNight } from './election-night';
import { electionNightAvailable } from '@/lib/election-night';
import { AppDock, InstallAction, PwaPanel, PwaProvider, usePwa } from './pwa';
import {
  formatVotes as fmt,
  formatPercent as pct,
  candidateColor as color,
  candidateName as name,
} from '@/lib/presentation';
const readJson = (r: Response): Promise<any> => r.json();
const regions = ['Brasil', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];
const nav = [
  ['overview', 'Panorama', Globe2],
  ['live', 'Apuração ao vivo', Radio],
  ['history', 'Histórico eleitoral', BookOpen],
  ['municipality', 'Seu município', MapPin],
  ['polls', 'Pesquisas e cenários', TrendingUp],
  ['candidates', 'Os candidatos', Vote],
  ['social', 'Cobertura e fontes', BarChart3],
  ['watch', 'Meu acompanhamento', Heart],
  ['profile', 'Meu perfil', UserRound],
  ['alerts', 'Alertas', Bell],
  ['app', 'Meu app', Smartphone],
] as const;
export default function Dashboard() {
  return (
    <PwaProvider>
      <ReadingProvider>
        <DashboardContent />
      </ReadingProvider>
    </PwaProvider>
  );
}
function DashboardContent() {
  const { installed } = usePwa();
  const { setReading } = useReading();
  const [welcome, setWelcome] = useState(false),
    [pushKey, setPushKey] = useState(''),
    [pushMessage, setPushMessage] = useState('Verificando serviço de notificações…');
  async function checkPush() {
    setPushKey('');
    setPushMessage('Verificando serviço de notificações…');
    try {
      const r = await fetch('/api/push', { cache: 'no-store' }),
        data = await r.json();
      if (!r.ok || !data.publicKey)
        throw Error(data.error || 'Serviço de notificações temporariamente indisponível.');
      setPushKey(data.publicKey);
      setPushMessage('');
    } catch (e) {
      setPushMessage((e as Error).message);
    }
  }
  useEffect(() => {
    void checkPush();
  }, []);
  const [tab, setTab] = useState('overview'),
    [mobile, setMobile] = useState(false),
    [region, setRegion] = useState('Brasil'),
    [uf, setUf] = useState('BR'),
    [all, setAll] = useState<Result[]>([]),
    [hist, setHist] = useState<Result[]>([]),
    [year, setYear] = useState(2022),
    [turn, setTurn] = useState(2),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [favorite, setFavorite] = useState(''),
    [live, setLive] = useState<any>({ status: 'waiting' }),
    [connection, setConnection] = useState('Conectando'),
    [points, setPoints] = useState<ProgressionPoint[]>([]),
    [prefs, setPrefs] = useState(defaultAlerts),
    [notification, setNotification] = useState('Desativadas'),
    [historyError, setHistoryError] = useState(''),
    [search, setSearch] = useState('');
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [selectedNote, setSelectedNote] = useState('');
  function contextNote(note: Pick<NotebookEntry, 'title' | 'body' | 'topic' | 'uf'>) {
    try {
      const previous = readWatch(JSON.parse(localStorage.getItem('observatorio.watch') || '{}'));
      if (previous.entries.length >= 100) {
        notify('Seu caderno chegou a 100 anotações. Remova uma antes de criar outra.');
        return;
      }
      const entry = { ...note, id: crypto.randomUUID(), updated: new Date().toISOString() };
      localStorage.setItem(
        'observatorio.watch',
        JSON.stringify({ version: 2, ...previous, entries: [entry, ...previous.entries] }),
      );
      setSelectedNote(entry.id);
      go('watch');
      notify('Contexto guardado no caderno. Acrescente sua observação.');
    } catch {
      notify('Não foi possível guardar a anotação neste navegador.');
    }
  }
  const [nickname, setNickname] = useState(''),
    [showTop, setShowTop] = useState(false),
    [hydrated, setHydrated] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawerPresent = usePresence(mobile, 240);
  const [livePoints, setLivePoints] = useState<ProgressionPoint[]>([]),
    [liveStates, setLiveStates] = useState<Result[]>([]);
  const [night, setNight] = useState<'preview' | 'live' | null>(null);
  const [nightPoints, setNightPoints] = useState<ProgressionPoint[]>([]);
  const [nightNational, setNightNational] = useState<{
    result?: Result;
    checkedAt?: string;
    status?: string;
    victory?: { message: string };
  } | null>(null);
  const closeNight = useCallback(() => setNight(null), []);
  useEffect(() => {
    if (night !== 'live') return;
    setNightPoints([]);
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch('/api/live?uf=BR', { signal: controller.signal });
        if (!response.ok) throw Error('Fonte indisponível');
        const payload = await response.json();
        if (!controller.signal.aborted) {
          setNightNational((old) => ({
            ...payload,
            result: payload.result || payload.lastGood || old?.result,
          }));
          const result: Result | undefined = payload.status === 'live' ? payload.result : undefined;
          if (result?.turn === 2)
            setNightPoints((previous) =>
              previous.some((p) => p.id === result.id)
                ? previous
                : [
                    ...previous,
                    {
                      id: result.id,
                      counted: result.counted,
                      lula: result.candidates.find((c) => c.number === '13')?.percent || 0,
                      bolsonaro: result.candidates.find((c) => c.number === '22')?.percent || 0,
                    },
                  ].slice(-300),
            );
        }
      } catch {
        if (!controller.signal.aborted)
          setNightNational((old) => ({ ...old, status: 'unavailable' }));
      }
    };
    void refresh();
    const timer = setInterval(refresh, 30000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [night]);
  function notify(s: string) {
    setToast(s);
    setTimeout(() => setToast(''), 5000);
  }
  function save(f = favorite, a = prefs, t = theme) {
    try {
      localStorage.setItem(
        'observatorio.preferences',
        JSON.stringify({ theme: t, favorite: f, alerts: a }),
      );
    } catch {
      notify('Não foi possível salvar preferências neste navegador.');
    }
  }
  const go = (next: string) => {
    setMobile(false);
    if (next === tab) {
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
      return;
    }
    const u = new URL(location.href);
    u.searchParams.set('tab', next);
    history.pushState({}, '', u);
    transitionPage(() => {
      setTab(next);
      window.scrollTo({ top: 0, behavior: 'instant' });
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[data-page-title]')?.focus({ preventScroll: true }),
      );
    });
  };
  function saveNickname(value: string) {
    try {
      localStorage.setItem('observatorio.profile', JSON.stringify({ nickname: value }));
      setNickname(value);
      return true;
    } catch {
      notify('Não foi possível salvar seu nome neste aparelho.');
      return false;
    }
  }
  function favoriteChange(value: string) {
    setFavorite(value);
    save(value);
  }
  function dismissWelcome() {
    try {
      localStorage.setItem('observatorio.welcome', '1');
    } catch {
      notify('As boas-vindas poderão aparecer novamente neste navegador.');
    }
    setWelcome(false);
  }
  function finishWelcome(choices: WelcomeChoices, alerts: boolean) {
    try {
      localStorage.setItem(
        'observatorio.terms',
        JSON.stringify({ version: termsVersion, acceptedAt: new Date().toISOString() }),
      );
    } catch {
      notify('Não foi possível salvar a aceitação neste navegador.');
      return false;
    }
    if (!saveNickname(choices.nickname)) return false;
    favoriteChange(choices.favorite);
    setReading(choices.details ? 'detailed' : 'essential');
    dismissWelcome();
    if (alerts) go('alerts');
    return true;
  }
  async function updateAlerts(next: typeof prefs) {
    setPrefs(next);
    save(favorite, next);
    if (notification !== 'Ativadas') return;
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js'),
        sub = await reg?.pushManager.getSubscription();
      if (!sub) return;
      const r = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          subscription: sub.toJSON(),
          preferences: next,
        }),
      });
      if (!r.ok) throw new Error();
    } catch {
      notify(
        'Categorias salvas no aparelho. Não foi possível atualizar a inscrição; tente Atualizar inscrição.',
      );
    }
  }
  useEffect(() => {
    const handle = () => setShowTop(window.scrollY > 500);
    window.addEventListener('scroll', handle, { passive: true });
    handle();
    return () => window.removeEventListener('scroll', handle);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const old = document.body.style.overflow;
    const trigger = menuButton.current;
    document.body.style.overflow = 'hidden';
    const drawer = document.getElementById('main-navigation');
    drawer?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobile(false);
      }
      if (e.key === 'Tab') {
        const items = Array.from(
          drawer?.querySelectorAll<HTMLElement>('button,a[href]') || [],
        ).filter((n) => n.getClientRects().length);
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', onKey);
      trigger?.focus({ preventScroll: true });
    };
  }, [mobile]);
  useEffect(() => {
    const back = () => {
      const p = new URLSearchParams(location.search);
      setMobile(false);
      transitionPage(() => {
        setTab(nav.some((n) => n[0] === p.get('tab')) ? p.get('tab')! : 'overview');
        setUf(states.some((s) => s[1] === p.get('uf')) ? p.get('uf')! : 'BR');
        setRegion(regions.includes(p.get('region') || '') ? p.get('region')! : 'Brasil');
        const y = years.includes(Number(p.get('year'))) ? Number(p.get('year')) : 2022;
        setYear(y);
        setTurn(
          ['1', '2'].includes(p.get('turn') || '')
            ? Number(p.get('turn'))
            : [1994, 1998].includes(y)
              ? 1
              : 2,
        );
        setMobile(false);
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
    };
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const u = new URL(location.href);
    u.searchParams.set('tab', tab);
    u.searchParams.set('uf', uf);
    u.searchParams.set('region', region);
    if (tab === 'history') {
      u.searchParams.set('year', String(year));
      u.searchParams.set('turn', String(turn));
    }
    history.replaceState({}, '', u);
  }, [tab, uf, region, year, turn, hydrated]);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('observatorio.preferences') || '{}');
      setTheme(p.theme === 'light' || p.theme === 'dark' ? p.theme : 'system');
      setFavorite(p.favorite || '');
      const profile = JSON.parse(localStorage.getItem('observatorio.profile') || '{}');
      setNickname(typeof profile.nickname === 'string' ? profile.nickname.slice(0, 40) : '');
      setPrefs(alertPreferences(p.alerts));
    } catch {
      // Unreadable local preferences leave the initial defaults in place.
    }
    const params = new URLSearchParams(location.search);
    if (nav.some((n) => n[0] === params.get('tab'))) setTab(params.get('tab')!);
    if (states.some((s) => s[1] === params.get('uf'))) setUf(params.get('uf')!);
    if (regions.includes(params.get('region') || '')) setRegion(params.get('region')!);
    if (years.includes(Number(params.get('year')))) setYear(Number(params.get('year')));
    if (['1', '2'].includes(params.get('turn') || '')) setTurn(Number(params.get('turn')));
    setHydrated(true);
    try {
      setWelcome(
        localStorage.getItem('observatorio.welcome') !== '1' ||
          JSON.parse(localStorage.getItem('observatorio.terms') || '{}').version !== termsVersion,
      );
    } catch {
      setWelcome(true);
    }
    Promise.all(
      ['BR', ...states.map((s) => s[1]), 'ZZ'].map(async (code) => {
        const r = await fetch(`/data/2026-${code.toLowerCase()}.json`);
        if (!r.ok) throw new Error('Falha ao carregar resultados oficiais.');
        return normalize(
          await readJson(r),
          `https://resultados.tse.jus.br/oficial/ele2026/6257/dados/${code.toLowerCase()}/${code.toLowerCase()}-c0001-e006257-u.json`,
        );
      }),
    )
      .then(setAll)
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
    navigator.serviceWorker
      ?.register('/sw.js')
      .then(async (r) => {
        const sub = await r?.pushManager?.getSubscription();
        if (!sub) return;
        let stored;
        try {
          stored = JSON.parse(localStorage.getItem('observatorio.preferences') || '{}').alerts;
        } catch {
          // Normalize absent preferences to the default alert categories below.
        }
        const saved = await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            subscription: sub.toJSON(),
            preferences: alertPreferences(stored),
          }),
        });
        if (saved.ok) setNotification('Ativadas');
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const next = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.dataset.theme = next ? 'dark' : 'light';
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme, hydrated]);
  useEffect(() => {
    let canceled = false;
    setHist([]);
    setHistoryError('');
    fetch(`/data/history-${year}.json`)
      .then((r) => {
        if (!r.ok)
          throw new Error(
            'Este ano está disponível no acervo do TSE, mas não foi importado nesta versão.',
          );
        return readJson(r);
      })
      .then((d) => {
        if (!canceled) setHist(d as Result[]);
      })
      .catch((e) => {
        if (!canceled) setHistoryError(e.message);
      });
    return () => {
      canceled = true;
    };
  }, [year]);
  useEffect(() => {
    fetch(`/data/progression-2022-${turn}.json`)
      .then((r) => readJson(r))
      .then((d) => setPoints(d as any[]))
      .catch(() => setPoints([]));
  }, [turn]);
  useEffect(() => {
    if (tab !== 'live' || live.status !== 'live') {
      setConnection('Consulta automática ativa');
      return;
    }
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    let ws: WebSocket;
    const connect = () => {
      if (stop) return;
      setConnection('Conectando');
      ws = new WebSocket(
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/socket`,
      );
      ws.onopen = () => {
        setConnection('Conectado');
        ws.send('{}');
      };
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m.type === 'live' && uf === 'BR') setLive(m.data);
        } catch {
          // Discard malformed socket messages; HTTP polling remains available.
        }
      };
      ws.onclose = () => {
        if (!stop) {
          setConnection('Consulta automática ativa');
          timer = setTimeout(connect, 30000);
        }
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => {
      stop = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, [uf, tab, live.status]);
  useEffect(() => {
    let stopped = false;
    const refresh = () =>
      fetch(`/api/live?uf=${uf}`)
        .then((r) => readJson(r))
        .then((d) => {
          if (!stopped) setLive(d);
        })
        .catch(() => {
          if (!stopped)
            setLive({ status: 'unavailable', message: 'Sem conexão. Tentaremos novamente.' });
        });
    refresh();
    const t = setInterval(refresh, 30000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [uf]);
  useEffect(() => {
    if (!live.result || live.result.uf !== uf) return;
    setLivePoints((p) =>
      p.some((x) => x.id === live.result.id)
        ? p
        : [
            ...p,
            {
              id: live.result.id,
              counted: live.result.counted,
              lula: live.result.candidates.find((c: any) => c.number === '13')?.percent || 0,
              bolsonaro: live.result.candidates.find((c: any) => c.number === '22')?.percent || 0,
            },
          ].slice(-300),
    );
  }, [live, uf]);
  useEffect(() => setLivePoints([]), [uf]);
  useEffect(() => {
    if (tab !== 'live' || live.status !== 'live') return;
    let canceled = false;
    const refresh = async () => {
      const result = [];
      for (const s of states) {
        try {
          const d: any = await (await fetch(`/api/live?uf=${s[1]}`)).json();
          if (d.result) result.push(d.result);
        } catch {
          // One unavailable state must not prevent loading the other states.
        }
      }
      if (!canceled) setLiveStates(result);
    };
    refresh();
    const t = setInterval(refresh, 60000);
    return () => {
      canceled = true;
      clearInterval(t);
    };
  }, [tab, live.status]);
  const national = all.find((d) => d.uf === 'BR'),
    selected = all.find((d) => d.uf === uf) || national,
    historical = hist.filter((d) => d.turn === turn),
    past = historical.find((d) => d.uf === uf) || historical.find((d) => d.uf === 'BR'),
    stateData = all.filter((d) => states.some((s) => s[1] === d.uf));
  const filtered = states.filter(
    (s) =>
      (region === 'Brasil' || s[3] === region) &&
      `${s[1]} ${s[2]}`.toLowerCase().includes(search.toLowerCase()),
  );
  const regionData = regions.slice(1).map((r) => {
    const list = stateData.filter((d) => states.find((s) => s[1] === d.uf)?.[3] === r),
      total = list.reduce((a, d) => a + d.valid, 0);
    return {
      region: r,
      f:
        (100 *
          list.reduce((a, d) => a + (d.candidates.find((c) => c.number === '22')?.votes || 0), 0)) /
        (total || 1),
      l:
        (100 *
          list.reduce((a, d) => a + (d.candidates.find((c) => c.number === '13')?.votes || 0), 0)) /
        (total || 1),
    };
  });
  const f = national?.candidates.find((c) => c.number === '22'),
    l = national?.candidates.find((c) => c.number === '13'),
    others = Math.max(0, (national?.valid || 0) - (f?.votes || 0) - (l?.votes || 0));
  async function pushEnable() {
    try {
      if (
        !('Notification' in window) ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      )
        throw new Error(
          'Notificações indisponíveis neste navegador. No iPhone, instale na tela inicial.',
        );
      if (!pushKey)
        throw new Error(pushMessage || 'Aguarde a conexão com o serviço de notificações.');
      if ((await Notification.requestPermission()) !== 'granted')
        throw new Error('Notificações não autorizadas. Verifique a permissão do navegador.');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const raw = Uint8Array.from(atob(pushKey.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
          c.charCodeAt(0),
        ),
        sub =
          (await reg.pushManager.getSubscription()) ||
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw }));
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          subscription: sub.toJSON(),
          preferences: prefs,
        }),
      });
      if (!res.ok) throw new Error((await readJson(res)).error);
      setNotification('Ativadas');
      save();
      notify('Notificações ativadas para as próximas atualizações.');
      return { ok: true, message: 'Notificações ativadas neste aparelho.' };
    } catch (e) {
      const message = (e as Error).message;
      notify(message);
      return { ok: false, message };
    }
  }
  async function pushDisable() {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js'),
        sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setNotification('Desativadas');
      notify('Notificações desativadas neste aparelho.');
    } catch {
      notify('Não foi possível desativar. Tente novamente.');
    }
  }
  async function pushTest(): Promise<{ ok: boolean; message: string }> {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted')
        throw Error(
          'Permita notificações nas configurações do navegador e ative sua inscrição novamente.',
        );
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub)
        throw Error('A inscrição deste aparelho não está ativa. Use Ativar notificações acima.');
      async function sync(subscription: PushSubscription) {
        const response = await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            subscription: subscription.toJSON(),
            preferences: prefs,
          }),
        });
        if (!response.ok)
          throw Error('Não foi possível atualizar a inscrição. Tente novamente com conexão ativa.');
      }
      async function send(subscription: PushSubscription) {
        const response = await fetch('/api/push/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        return { response, data: await response.json() };
      }
      await sync(sub);
      let result = await send(sub),
        renewed = false;
      if (['expired', 'subscription_mismatch'].includes(result.data.code)) {
        const keyResponse = await fetch('/api/push', { cache: 'no-store' }),
          fresh = await keyResponse.json();
        if (!keyResponse.ok || !fresh.publicKey)
          throw Error('Não foi possível renovar a inscrição. Tente novamente em instantes.');
        setPushKey(fresh.publicKey);
        const raw = Uint8Array.from(
          atob(fresh.publicKey.replace(/-/g, '+').replace(/_/g, '/')),
          (c) => c.charCodeAt(0),
        );
        await sub.unsubscribe();
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw });
        await sync(sub);
        result = await send(sub);
        renewed = true;
      }
      if (!result.response.ok)
        throw Error(result.data.error || 'O serviço de teste está indisponível.');
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const receipt = await fetch('/api/push/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint, id: result.data.id, check: true }),
        });
        if (receipt.ok && (await receipt.json()).received)
          return {
            ok: true,
            message:
              (renewed ? 'A inscrição foi renovada. ' : '') +
              'O navegador confirmou o recebimento. Confira a central de notificações do aparelho. Se o aviso não aparecer, verifique o modo Não perturbe e as notificações do sistema.',
          };
      }
      return {
        ok: false,
        message:
          'O serviço aceitou o teste, mas o navegador ainda não confirmou a entrega. Confira a conexão e as permissões do navegador e do sistema. Aguarde um minuto antes de tentar novamente.',
      };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }

  const legend = (
    <div className="legend">
      <span>
        <i style={{ background: '#24796d' }} />
        Flávio Bolsonaro
      </span>
      <span>
        <i style={{ background: '#c96856' }} />
        Lula
      </span>
      <span>
        <i style={{ background: '#d6dfdc' }} />
        Outros
      </span>
    </div>
  );
  return (
    <div className={'app-shell' + (installed ? ' installed-app' : '')}>
      {drawerPresent && (
        <>
          <button
            className="scrim"
            data-state={mobile ? 'open' : 'closing'}
            aria-hidden={!mobile}
            aria-label="Fechar navegação pelo fundo"
            tabIndex={-1}
            onClick={() => setMobile(false)}
          />
          <aside
            id="main-navigation"
            className="sidebar open"
            data-state={mobile ? 'open' : 'closing'}
            inert={!mobile}
            aria-hidden={!mobile}
            role="dialog"
            aria-modal="true"
            aria-labelledby="navigation-title"
          >
            <div className="drawer-title">
              <strong id="navigation-title">Explore o Observatório</strong>
              <button
                className="icon-button"
                aria-label="Fechar navegação"
                onClick={() => setMobile(false)}
              >
                <X size={21} />
              </button>
            </div>
            <a
              className="brand"
              href="/"
              onClick={(e) => {
                e.preventDefault();
                go('overview');
              }}
            >
              <span className="brand-mark">
                <img src="/app-icon.svg" alt="" />
              </span>
              <span>
                observatório<span className="brand-sub">DO VOTO · BRASIL</span>
              </span>
            </a>
            <nav aria-label="Seções do aplicativo">
              {nav.map(([id, label, Icon]) => (
                <div key={id}>
                  {id === 'overview' && <div className="side-label">A ELEIÇÃO</div>}
                  {id === 'watch' && <div className="side-label personal-label">SEU ESPAÇO</div>}
                  <button
                    onClick={() => go(id)}
                    aria-current={tab === id ? 'page' : undefined}
                    className={'nav-item ' + (tab === id ? 'active' : '')}
                  >
                    <Icon size={19} />
                    <span>{label}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </nav>
            <div className="drawer-footer">
              <ShieldCheck size={17} />
              <span>Dados públicos. Preferências privadas.</span>
            </div>
          </aside>
        </>
      )}
      <div className="main-shell" inert={mobile}>
        <header className="topbar">
          <div className="top-brand">
            <button
              ref={menuButton}
              className="menu-trigger"
              aria-label="Abrir navegação"
              aria-haspopup="dialog"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <PanelLeft size={21} />
              <span>Menu</span>
            </button>
            <a
              className="header-brand"
              href="/"
              onClick={(e) => {
                e.preventDefault();
                go('overview');
              }}
            >
              <img src="/app-icon.svg" alt="" />
              <span>
                observatório<small>DO VOTO</small>
              </span>
            </a>
          </div>
          <div className="top-actions">
            <InstallAction onOpen={() => go('app')} />
            <ThemeMenu
              value={theme}
              onChange={(next) => {
                setTheme(next);
                save(favorite, prefs, next);
              }}
            />
            <button
              className="header-alerts"
              aria-label="Abrir alertas"
              onClick={() => go('alerts')}
            >
              <Bell size={19} />
              <span>Alertas</span>
            </button>
            <button className="avatar" aria-label="Abrir meu perfil" onClick={() => go('profile')}>
              {nickname ? nickname.slice(0, 2).toUpperCase() : <UserRound size={20} />}
            </button>
          </div>
        </header>
        <main id="page-content">
          <div className="page-view" key={tab}>
            {['overview', 'history', 'live'].includes(tab) &&
              (region !== 'Brasil' || uf !== 'BR') && (
                <div className="scope-notice" role="status">
                  <Globe2 size={17} />
                  <span>
                    Visualizando{' '}
                    <strong>{uf !== 'BR' ? states.find((s) => s[1] === uf)?.[2] : region}</strong>
                  </span>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setRegion('Brasil');
                      setUf('BR');
                      notify('Visualização nacional restaurada.');
                    }}
                  >
                    Ver Brasil inteiro
                    <X size={14} />
                  </button>
                </div>
              )}
            <div className="page-heading">
              <div>
                <div className="eyebrow">INFORMAÇÃO PARA ENTENDER O PAÍS</div>
                <h1 tabIndex={-1} data-page-title>
                  {tab === 'overview'
                    ? 'O Brasil, voto a voto.'
                    : nav.find((n) => n[0] === tab)?.[1]}
                </h1>
                <p>
                  {tab === 'overview'
                    ? 'Acompanhe o presente, explore o passado e entenda as tendências.'
                    : tab === 'live'
                      ? 'A evolução dos votos, direto da fonte oficial.'
                      : tab === 'history'
                        ? 'O país que votou ontem ajuda a entender o país de hoje.'
                        : tab === 'municipality'
                          ? 'Da cidade à sua seção: descubra os votos perto de você.'
                          : tab === 'polls'
                            ? 'Pesquisas mostram um momento. Cenários exploram possibilidades.'
                            : tab === 'watch'
                              ? 'Sua seleção de estados, pesquisas e alertas. Tudo no seu aparelho.'
                              : tab === 'social'
                                ? 'Cobertura pública, atualização automática e fontes transparentes.'
                                : tab === 'profile'
                                  ? 'Seu nome e suas preferências, em um espaço pessoal.'
                                  : tab === 'alerts'
                                    ? 'Escolha os eventos que quer receber.'
                                    : tab === 'app'
                                      ? 'Instale, prepare seus atalhos e leve o Observatório com você.'
                                      : 'Conheça as trajetórias dos dois candidatos à Presidência.'}
                </p>
              </div>
            </div>
            {error && (
              <div className="notice error">
                {error}
                <button onClick={() => location.reload()}>Tentar novamente</button>
              </div>
            )}
            {tab === 'overview' && (
              <div className="election-banner">
                <div className="banner-icon">
                  <Vote size={23} />
                </div>
                <div>
                  <strong>O próximo capítulo é em 25 de outubro.</strong>
                  <span>2º turno presidencial · domingo · votação das 8h às 17h (Brasília)</span>
                </div>
                <span className="pill">
                  <Clock size={12} />
                  {live.status === 'live' ? 'APURAÇÃO INICIADA' : 'AGUARDANDO VOTAÇÃO'}
                </span>
                <button onClick={() => go('live')}>
                  Acompanhar
                  <ArrowUpRight size={17} />
                </button>
              </div>
            )}
            {(tab === 'overview' || tab === 'history') && (
              <div className="active-filters">
                <span>{tab === 'history' ? `${year} · ${turn}º turno` : '2026 · 1º turno'}</span>
                <span>{uf !== 'BR' ? states.find((s) => s[1] === uf)?.[2] : region}</span>
                {(uf !== 'BR' ||
                  region !== 'Brasil' ||
                  (tab === 'history' && (year !== 2022 || turn !== 2))) && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setRegion('Brasil');
                      setUf('BR');
                      setYear(2022);
                      setTurn(2);
                    }}
                  >
                    Limpar filtros
                    <X size={13} />
                  </button>
                )}
              </div>
            )}
            {(tab === 'overview' || tab === 'history') && (
              <div className="filters">
                <div className="segmented">
                  {tab === 'overview' ? (
                    <>
                      <button
                        className="selected"
                        onClick={() => {
                          setUf('BR');
                          setRegion('Brasil');
                        }}
                      >
                        2026 · 1º turno
                      </button>
                      <button onClick={() => go('live')}>
                        2º turno
                        <Clock size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <label>
                        Ano
                        <select
                          value={year}
                          onChange={(e) => {
                            setYear(+e.target.value);
                            setTurn([1994, 1998].includes(+e.target.value) ? 1 : 2);
                          }}
                        >
                          {years.map((y) => (
                            <option key={y}>{y}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Turno
                        <select value={turn} onChange={(e) => setTurn(+e.target.value)}>
                          <option value={1}>1º turno</option>
                          <option value={2}>2º turno</option>
                        </select>
                      </label>
                    </>
                  )}
                </div>
                <div className="filter-selects">
                  <Globe2 size={16} />
                  <select
                    aria-label="Filtrar por região"
                    value={region}
                    onChange={(e) => {
                      setRegion(e.target.value);
                      setUf('BR');
                    }}
                  >
                    {regions.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Selecionar estado"
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                  >
                    <option value="BR">Todos os estados</option>
                    {states
                      .filter((s) => region === 'Brasil' || s[3] === region)
                      .map((s) => (
                        <option value={s[1]} key={s[1]}>
                          {s[2]}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {tab === 'app' && (
              <PwaPanel result={national} onAlerts={() => go('alerts')} onGo={go} />
            )}
            {tab === 'profile' && (
              <Profile
                nickname={nickname}
                onNickname={saveNickname}
                favorite={favorite}
                onFavorite={favoriteChange}
                onWatch={() => go('watch')}
                onCustomize={() => {
                  setMobile(false);
                  setWelcome(true);
                }}
                notification={notification}
                onAlerts={() => go('alerts')}
                theme={theme}
                onTheme={(value) => {
                  setTheme(value);
                  save(favorite, prefs, value);
                }}
              />
            )}
            {tab === 'alerts' && (
              <Alerts
                notification={notification}
                prefs={prefs}
                onPrefs={updateAlerts}
                onEnable={pushEnable}
                onDisable={pushDisable}
                onLive={() => go('live')}
                serviceReady={!!pushKey}
                serviceMessage={pushMessage}
                onRetry={checkPush}
                onTest={pushTest}
              />
            )}
            {['profile', 'alerts', 'app'].includes(tab) ? null : busy ? (
              <div className="loading large">
                <RefreshCw size={20} />
                Carregando dados oficiais…
              </div>
            ) : (
              <>
                {tab === 'overview' && selected && (
                  <>
                    <RecentUpdates onGo={go} />
                    <DataFreshness archived generated={selected.generated} />
                    <button
                      className="text-button municipality-entry"
                      onClick={() => go('municipality')}
                    >
                      <MapPin size={16} aria-hidden="true" />
                      Explorar meu município e local de votação
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                    <div className="stats-grid">
                      {[
                        {
                          label: 'VOTOS VÁLIDOS',
                          value: (selected.valid / 1e6).toLocaleString('pt-BR', {
                            maximumFractionDigits: 2,
                          }),
                          detail: 'milhões de votos · ' + (uf === 'BR' ? 'Brasil' : uf),
                          icon: Vote,
                        },
                        {
                          label: 'PESSOAS QUE VOTARAM',
                          value: pct(100 - selected.abstention),
                          detail: fmt(selected.turnout) + ' eleitores',
                          icon: Users,
                        },
                        {
                          label: 'ABSTENÇÃO',
                          value: pct(selected.abstention),
                          detail: 'Eleitores que não compareceram',
                          icon: Clock,
                        },
                        {
                          label: 'SEÇÕES CONTADAS',
                          value: pct(selected.counted, 0),
                          detail: 'Resultado do 1º turno',
                          icon: Check,
                        },
                      ].map((s) => (
                        <div className="stat" key={s.label}>
                          <div>
                            <span className="eyebrow">{s.label}</span>
                            <s.icon size={17} />
                          </div>
                          <strong>{s.value}</strong>
                          <small>{s.detail}</small>
                        </div>
                      ))}
                    </div>
                    <div className="dashboard-grid">
                      <section className="panel map-panel">
                        <div className="panel-head">
                          <div>
                            <span className="eyebrow">O VOTO NO TERRITÓRIO</span>
                            <h2>Um país, muitas escolhas.</h2>
                          </div>
                          <span className="subtle-tag">1º turno · 2026</span>
                        </div>
                        <div className="map-columns">
                          <Map data={stateData} region={region} selected={uf} onSelect={setUf} />
                          <div className="map-summary">
                            <span className="eyebrow">
                              {uf === 'BR'
                                ? 'RESULTADO NACIONAL'
                                : states.find((s) => s[1] === uf)?.[2].toUpperCase()}
                            </span>
                            {['22', '13'].map((n) => {
                              const c = selected.candidates.find((c) => c.number === n);
                              return (
                                c && (
                                  <div className="candidate-result" key={n}>
                                    <div>
                                      <i style={{ background: color(n) }} />
                                      <span>{name(c.name)}</span>
                                      <small>{c.party}</small>
                                    </div>
                                    <strong style={{ color: color(n) }}>{pct(c.percent)}</strong>
                                    <span>{fmt(c.votes)} votos</span>
                                    <div className="bar-track">
                                      <div
                                        style={{ width: c.percent + '%', background: color(n) }}
                                      />
                                    </div>
                                  </div>
                                )
                              );
                            })}
                            <div className="mini-note">
                              <Info size={14} />
                              <span>Cores indicam quem recebeu mais votos em cada estado.</span>
                            </div>
                            <button
                              className="text-button context-note"
                              onClick={() =>
                                contextNote({
                                  title: `Resultado de ${uf === 'BR' ? 'Brasil' : states.find((s) => s[1] === uf)?.[2]} · 1º turno de 2026`,
                                  body: `Resultado oficial do TSE · ${selected.generated}\n${selected.candidates
                                    .slice(0, 2)
                                    .map((c) => `${name(c.name)}: ${pct(c.percent)}`)
                                    .join('\n')}\nFonte: ${selected.source}\n\nMinha observação:\n`,
                                  topic: 'Apuração',
                                  uf,
                                })
                              }
                            >
                              Anotar sobre este resultado
                              <BookOpen size={14} />
                            </button>
                            <Source href={selected.source}>TSE · {selected.generated}</Source>
                          </div>
                        </div>
                      </section>
                      <PollOverview onExplore={() => go('polls')} />
                    </div>
                    <div className="dashboard-grid lower">
                      <section className="panel">
                        <div className="panel-head">
                          <div>
                            <span className="eyebrow">COMPARAÇÃO REGIONAL</span>
                            <h2>Como cada região votou</h2>
                          </div>
                          <span className="subtle-tag">Votos válidos</span>
                        </div>
                        {legend}
                        <div className="regional-bars">
                          {regionData
                            .filter((r) => region === 'Brasil' || r.region === region)
                            .map((r) => (
                              <div className="regional-static" key={r.region}>
                                <span>{r.region}</span>
                                <div className="stack">
                                  <i style={{ width: r.f + '%', background: '#24796d' }}>
                                    {pct(r.f, 1)}
                                  </i>
                                  <i style={{ width: r.l + '%', background: '#c96856' }}>
                                    {pct(r.l, 1)}
                                  </i>
                                  <i
                                    style={{ width: 100 - r.f - r.l + '%', background: '#d6dfdc' }}
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                        <p className="fine">
                          Somamos os votos dos estados de cada região. O voto no exterior entra
                          apenas no total nacional. Uma região mais colorida para um candidato
                          indica maior participação dele nos votos válidos desse recorte.
                        </p>
                      </section>
                      <section className="panel history-callout">
                        <span className="eyebrow">O PASSADO CONTA UMA HISTÓRIA</span>
                        <h2>
                          Uma eleição pode mudar.
                          <br />A história fica.
                        </h2>
                        <div className="history-years">
                          1989<span>→</span>2026
                        </div>
                        <p>
                          Explore candidatos, resultados e diferenças regionais das eleições
                          presidenciais.
                        </p>
                        <button className="button secondary" onClick={() => go('history')}>
                          Explorar o histórico
                          <ArrowUpRight size={16} />
                        </button>
                        <BookOpen className="watermark" size={115} />
                      </section>
                    </div>
                    <Disclosure
                      title="Resultados detalhados por estado"
                      summary="Votos, participação e totalização das 27 unidades da federação."
                    >
                      <div className="panel-head">
                        <h2>Estado por estado</h2>
                        <label className="search">
                          <Search size={15} />
                          <input
                            aria-label="Buscar estado"
                            placeholder="Buscar estado"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </label>
                      </div>
                      <div
                        className="table-scroll"
                        tabIndex={0}
                        role="region"
                        aria-label="Tabela de resultados; deslize ou use as setas para ver mais colunas"
                      >
                        <table>
                          <thead>
                            <tr>
                              <th>Estado</th>
                              <th>Flávio Bolsonaro</th>
                              <th>Lula</th>
                              <th>Votos válidos</th>
                              <th>Abstenção</th>
                              <th>Totalização</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((s) => {
                              const d = all.find((d) => d.uf === s[1]);
                              return (
                                d && (
                                  <tr key={s[1]}>
                                    <td>
                                      <button
                                        className="table-state"
                                        onClick={() => {
                                          setUf(s[1]);
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                      >
                                        {s[2]}
                                        <small>{s[1]}</small>
                                      </button>
                                    </td>
                                    <td style={{ color: 'var(--candidate-a)' }}>
                                      {pct(d.candidates.find((c) => c.number === '22')!.percent)}
                                    </td>
                                    <td style={{ color: 'var(--candidate-b)' }}>
                                      {pct(d.candidates.find((c) => c.number === '13')!.percent)}
                                    </td>
                                    <td>{fmt(d.valid)}</td>
                                    <td>{pct(d.abstention)}</td>
                                    <td>
                                      <span className="complete">
                                        <Check size={12} />
                                        {pct(d.counted, 0)}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {!filtered.length && <p className="fine">Nenhum estado encontrado.</p>}
                    </Disclosure>
                    <Disclosure
                      title="Todos os candidatos do primeiro turno"
                      summary="Abra a tabela completa de votação, partidos e situação."
                    >
                      <h2>Todos os candidatos no primeiro turno</h2>
                      <div
                        className="table-scroll"
                        tabIndex={0}
                        role="region"
                        aria-label="Tabela de resultados; deslize ou use as setas para ver mais colunas"
                      >
                        <table>
                          <thead>
                            <tr>
                              <th>Candidato</th>
                              <th>Partido</th>
                              <th>Votos</th>
                              <th>Válidos</th>
                              <th>Situação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.candidates.map((c) => (
                              <tr key={c.number}>
                                <td>{name(c.name)}</td>
                                <td>{c.party}</td>
                                <td>{fmt(c.votes)}</td>
                                <td>{pct(c.percent)}</td>
                                <td>{c.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="fine">
                        Brancos: {fmt(selected.blank)} · Nulos: {fmt(selected.nullVotes)}
                      </p>
                    </Disclosure>
                  </>
                )}
                {tab === 'live' && (
                  <>
                    <div className="live-toolbar">
                      <span className="connection">
                        <i className={connection === 'Conectado' ? 'connected' : ''} />
                        {connection === 'Conectado' ? 'Conexão ativa' : 'Atualização automática'} ·
                        consulta a cada 30 s
                      </span>
                      <select
                        aria-label="Apuração por estado"
                        value={uf}
                        onChange={(e) => setUf(e.target.value)}
                      >
                        <option value="BR">Brasil</option>
                        {states.map((s) => (
                          <option key={s[1]} value={s[1]}>
                            {s[2]}
                          </option>
                        ))}
                      </select>
                      {live.result && (
                        <button className="button secondary" onClick={() => go('alerts')}>
                          <Bell size={15} />
                          Configurar alertas
                        </button>
                      )}
                      {national && (
                        <button
                          className="button secondary"
                          onClick={() => {
                            setNightNational(null);
                            setNight(
                              electionNightAvailable(live.status, live.result?.turn)
                                ? 'live'
                                : 'preview',
                            );
                          }}
                        >
                          <Expand size={16} aria-hidden="true" />
                          {electionNightAvailable(live.status, live.result?.turn)
                            ? 'Abrir noite da apuração'
                            : 'Ver prévia com o 1º turno'}
                        </button>
                      )}
                    </div>
                    <section className="panel live-stage">
                      <span className="live-orbit">
                        <Radio size={38} />
                      </span>
                      {live.result && (
                        <>
                          <span className="eyebrow">SEGUNDO TURNO · PRESIDÊNCIA</span>
                          <h2>
                            {live.status === 'live'
                              ? 'Cada atualização, um novo retrato.'
                              : live.status === 'unavailable'
                                ? 'A fonte está temporariamente indisponível.'
                                : 'Prontos para acompanhar cada voto.'}
                          </h2>
                          <p>
                            {live.message ||
                              'Assim que o TSE iniciar a divulgação, os resultados aparecerão aqui.'}
                          </p>
                        </>
                      )}
                      {live.result ? (
                        <>
                          <div className="live-results">
                            {live.result.candidates.map((c: any) => (
                              <div key={c.number}>
                                <span>{name(c.name)}</span>
                                <strong style={{ color: color(c.number) }}>{pct(c.percent)}</strong>
                                <small>{fmt(c.votes)} votos</small>
                              </div>
                            ))}
                          </div>
                          <div className="notice">{live.victory.message}</div>
                          <p>
                            Totalização: {pct(live.result.counted)} · {live.result.generated}
                          </p>
                          <Source href={live.result.source}>Arquivo oficial</Source>
                        </>
                      ) : (
                        <>
                          <LiveCountdown
                            notification={notification}
                            serviceReady={!!pushKey}
                            onEnable={pushEnable}
                            onAlerts={() => go('alerts')}
                          />
                          {live.status === 'unavailable' && (
                            <p className="notice">{live.message}</p>
                          )}
                        </>
                      )}
                      <small>
                        Atualizações a cada 30 segundos enquanto esta tela estiver aberta.
                      </small>
                      <DataFreshness
                        checkedAt={live.checkedAt}
                        generated={live.result?.generated}
                        stale={live.stale}
                        unavailable={live.status === 'unavailable'}
                      />
                    </section>
                    {live.result && (
                      <section className="panel">
                        <h2>Progressão da apuração · sessão atual</h2>
                        <Progression
                          points={livePoints}
                          greenName="Flávio Bolsonaro"
                          label={`Progressão da apuração durante esta sessão · ${uf}`}
                        />
                        <p className="fine">
                          Flávio Bolsonaro em verde; Lula em vermelho. Histórico registrado desde
                          que você abriu esta tela.
                        </p>
                        <Map data={liveStates} region={region} selected={uf} onSelect={setUf} />
                        <select
                          value={region}
                          aria-label="Região da apuração"
                          onChange={(e) => setRegion(e.target.value)}
                        >
                          {regions.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                        <div
                          className="table-scroll"
                          tabIndex={0}
                          role="region"
                          aria-label="Tabela de resultados; deslize ou use as setas para ver mais colunas"
                        >
                          <table>
                            <thead>
                              <tr>
                                <th>Estado (UF)</th>
                                <th>Apuração</th>
                                <th>Na liderança</th>
                                <th>Percentual</th>
                              </tr>
                            </thead>
                            <tbody>
                              {liveStates
                                .filter(
                                  (d) =>
                                    region === 'Brasil' ||
                                    states.find((s) => s[1] === d.uf)?.[3] === region,
                                )
                                .map((d) => (
                                  <tr key={d.uf}>
                                    <td>{d.uf}</td>
                                    <td>{pct(d.counted)}</td>
                                    <td>{name(d.candidates[0]?.name)}</td>
                                    <td>{pct(d.candidates[0]?.percent)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}
                    <div className="dashboard-grid lower">
                      <section className="panel">
                        <h2>Três formas de ler um resultado</h2>
                        {[
                          [
                            'Resultado parcial',
                            'A liderança pode mudar com votos de regiões ainda não apuradas.',
                          ],
                          [
                            'Vantagem numericamente irreversível',
                            'A diferença supera o máximo de votos que os eleitores das seções pendentes poderiam dar ao outro candidato. Condicionada à integridade dos dados atuais.',
                          ],
                          [
                            'Eleito pelo TSE',
                            'O arquivo oficial informa o candidato eleito. Este é o alerta de resultado confirmado.',
                          ],
                        ].map(([t, p]) => (
                          <div className="explain-row" key={t}>
                            <ShieldCheck size={19} />
                            <div>
                              <strong>{t}</strong>
                              <p>{p}</p>
                            </div>
                          </div>
                        ))}
                      </section>
                      <section className="panel">
                        <h2>Enquanto os votos não chegam</h2>
                        <p>Explore a progressão real da última eleição presidencial.</p>
                        <button
                          className="button secondary"
                          onClick={() => {
                            setYear(2022);
                            setTurn(2);
                            go('history');
                          }}
                        >
                          Rever a apuração de 2022
                          <ArrowUpRight size={15} />
                        </button>
                        <div className="notice">
                          Novos avisos dependem de o serviço acompanhar a apuração. A entrega também
                          depende da permissão do navegador e da disponibilidade das fontes.
                        </div>
                      </section>
                    </div>
                  </>
                )}
                {tab === 'history' && (
                  <>
                    {past && <DataFreshness archived generated={past.generated} />}
                    <div className="timeline">
                      {years.map((y) => (
                        <button
                          className={year === y ? 'active' : ''}
                          key={y}
                          onClick={() => {
                            setYear(y);
                            setTurn([1994, 1998].includes(y) ? 1 : 2);
                          }}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                    {historyError || !past ? (
                      <section className="panel empty">
                        <BookOpen size={30} />
                        <h2>{historyError ? 'Acervo histórico' : 'Consultando o histórico…'}</h2>
                        <p>{historyError || 'Buscando o ano e o turno selecionados.'}</p>
                        {!historyError && hist.length > 0 && (
                          <p>
                            Este ano não teve este turno ou não há dados para a abrangência
                            selecionada.
                          </p>
                        )}
                        <Source href="https://www.tse.jus.br/eleicoes/resultados-eleicoes">
                          Consultar acervo oficial
                        </Source>
                      </section>
                    ) : (
                      <>
                        <div className="dashboard-grid">
                          <section className="panel map-panel">
                            <div className="panel-head">
                              <h2>
                                {year} · {turn}º turno
                              </h2>
                              <span className="subtle-tag">{uf === 'BR' ? 'Brasil' : uf}</span>
                            </div>
                            <Map data={historical} region={region} selected={uf} onSelect={setUf} />
                            <Source href={past.source}>Arquivo original TSE</Source>
                          </section>
                          <section className="panel">
                            <h2>Resultados por candidato</h2>
                            <div className="history-candidates">
                              {past.candidates.map((c, i) => (
                                <div key={c.number}>
                                  <div>
                                    <span className="ranking">{i + 1}</span>
                                    <strong>{name(c.name)}</strong>
                                    <span className="subtle-tag">{c.party}</span>
                                  </div>
                                  <strong style={{ color: color(c.number) }}>
                                    {pct(c.percent)}
                                  </strong>
                                  <small>{fmt(c.votes)} votos</small>
                                  <div className="bar-track">
                                    <div
                                      style={{
                                        width: c.percent + '%',
                                        background: color(c.number),
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="fine">
                              Votação nominal por município e zona agregada por UF. Dados de
                              1994–1998 têm cobertura incompleta no acervo.
                            </p>
                          </section>
                        </div>
                        <Disclosure
                          title="Comparação histórica por estado"
                          summary="Compare a participação do PT no ano selecionado com o primeiro turno de 2026."
                        >
                          <h2>Participação do PT nos votos válidos</h2>
                          <p className="fine">
                            {year} · {turn}º turno × 2026 · 1º turno. Candidatos e contextos
                            distintos; a variação não é uma previsão.
                          </p>
                          <div
                            className="table-scroll"
                            tabIndex={0}
                            role="region"
                            aria-label="Tabela de resultados; deslize ou use as setas para ver mais colunas"
                          >
                            <table>
                              <thead>
                                <tr>
                                  <th>Estado</th>
                                  <th>PT em {year}</th>
                                  <th>Lula em 2026</th>
                                  <th>Variação</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.map((s) => {
                                  const before = historical
                                      .find((d) => d.uf === s[1])
                                      ?.candidates.find((c) => c.party === 'PT'),
                                    after = all
                                      .find((d) => d.uf === s[1])
                                      ?.candidates.find((c) => c.number === '13');
                                  return (
                                    <tr key={s[1]}>
                                      <td>{s[2]}</td>
                                      <td>{before ? pct(before.percent) : 'Sem dados'}</td>
                                      <td>{after ? pct(after.percent) : 'Sem dados'}</td>
                                      <td>
                                        {before && after
                                          ? (after.percent - before.percent > 0 ? '+' : '') +
                                            (after.percent - before.percent)
                                              .toFixed(2)
                                              .replace('.', ',') +
                                            ' p.p.'
                                          : '—'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </Disclosure>
                      </>
                    )}
                    {past && (
                      <button
                        className="button secondary context-note"
                        onClick={() =>
                          contextNote({
                            title: `${year} · ${turn}º turno · ${uf}`,
                            body: `${past.candidates
                              .slice(0, 2)
                              .map((c) => `${name(c.name)}: ${pct(c.percent)}`)
                              .join('\n')}\nFonte: ${past.source}\n\nMinha observação:\n`,
                            topic: 'Histórico',
                            uf,
                          })
                        }
                      >
                        Anotar sobre este resultado
                        <BookOpen size={14} />
                      </button>
                    )}
                    {year === 2022 && points.length > 0 && (
                      <section className="panel">
                        <div className="panel-head">
                          <div>
                            <span className="eyebrow">APURAÇÃO REAL · ARQUIVO HISTÓRICO</span>
                            <h2>A progressão dos votos em 2022</h2>
                          </div>
                          <span className="subtle-tag">{turn}º turno</span>
                        </div>
                        <Progression
                          points={points}
                          label={`Progressão histórica da apuração presidencial de 2022 · ${turn}º turno · Lula e Jair Bolsonaro`}
                        />
                        <div className="legend">
                          <span>
                            <i style={{ background: '#c96856' }} />
                            Lula
                          </span>
                          <span>
                            <i style={{ background: '#24796d' }} />
                            Jair Bolsonaro
                          </span>
                        </div>
                        <Source
                          href={`https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/Historico_Totalizacao_Presidente_BR_${turn}T_2022.zip`}
                        >
                          Histórico de totalização TSE · cerca de 100 instantes
                        </Source>
                      </section>
                    )}
                  </>
                )}
                {tab === 'municipality' && <MunicipalityExplorer initialUf={uf} />}
                {tab === 'polls' && (
                  <>
                    <PollExplorer onNote={contextNote} />
                    <Disclosure
                      title="Simular transferência de votos"
                      summary="Distribua os votos dos demais candidatos e veja uma hipótese de segundo turno."
                    >
                      <TransferScenario a={f?.votes || 0} b={l?.votes || 0} others={others} />
                    </Disclosure>
                  </>
                )}
                {tab === 'candidates' && (
                  <>
                    <div className="candidate-profiles">
                      {candidates.map((c) => (
                        <section className="panel profile" key={c.number}>
                          <div className="profile-top">
                            <div className="portrait">
                              <img src={c.photo} alt={c.name} />
                            </div>
                            <span className="ballot" style={{ color: c.color }}>
                              {c.number}
                              <small>NÚMERO NA URNA</small>
                            </span>
                          </div>
                          <span className="eyebrow">{c.party} · CANDIDATO À PRESIDÊNCIA</span>
                          <h2>{c.name}</h2>
                          <p className="full-name">{c.full}</p>
                          <p>{c.bio}</p>
                          <div className="vice">
                            <Users size={16} />
                            <span>
                              Vice na chapa<strong>{c.vice}</strong>
                            </span>
                          </div>
                          <details className="inline-details candidate-details">
                            <summary>Ver trajetória</summary>
                            <div className="bio-timeline">
                              {c.timeline.map(([y, t]) => (
                                <div key={y}>
                                  <i style={{ background: c.color }} />
                                  <strong>{y}</strong>
                                  <span>{t}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                          <button
                            className={`button ${favorite === c.number ? 'primary' : 'secondary'}`}
                            onClick={() => {
                              const n = favorite === c.number ? '' : c.number;
                              setFavorite(n);
                              save(n);
                              notify(
                                n
                                  ? 'Preferência salva apenas neste aparelho.'
                                  : 'Preferência removida.',
                              );
                            }}
                          >
                            <Heart
                              size={16}
                              fill={favorite === c.number ? 'currentColor' : 'none'}
                            />
                            {favorite === c.number
                              ? 'Meu candidato preferido'
                              : 'Escolher como preferido'}
                          </button>
                          <Source href={bioSource}>Trajetória · Agência Senado</Source>
                        </section>
                      ))}
                    </div>
                    <div className="notice">
                      <ShieldCheck size={16} />
                      Sua preferência fica no armazenamento deste navegador e não altera os
                      resultados ou a apresentação dos dados.
                    </div>
                  </>
                )}
                {tab === 'social' && <MediaExplorer />}

                {tab === 'watch' && (
                  <Watchboard
                    selectedNote={selectedNote}
                    favorite={favorite}
                    onAlerts={() => go('alerts')}
                    data={all}
                    region={region}
                    uf={uf}
                    year={year}
                    turn={turn}
                    onState={(code, destination) => {
                      setUf(code);
                      setRegion('Brasil');
                      go(destination);
                    }}
                  />
                )}
              </>
            )}
          </div>
          <footer className="main-footer">
            <div>
              <Activity size={14} />
              <strong>observatório</strong>
              <span>Informação para um voto consciente.</span>
            </div>
            <div className="footer-links">
              <a href="/termos">Termos de Uso</a>
              <a href="/privacidade">Privacidade</a>
              <button onClick={() => go('social')}>
                Fontes e metodologia
                <ArrowUpRight size={12} />
              </button>
            </div>
          </footer>
        </main>
      </div>
      {night === 'preview' && national && (
        <ElectionNight
          preview
          result={national}
          states={stateData}
          points={[]}
          onClose={closeNight}
        />
      )}
      {night === 'live' && nightNational?.result && (
        <ElectionNight
          preview={false}
          result={nightNational.result}
          states={liveStates}
          points={nightPoints}
          checkedAt={nightNational.checkedAt}
          unavailable={nightNational.status !== 'live'}
          message={nightNational.victory?.message}
          onClose={closeNight}
        />
      )}
      {night === 'live' && !nightNational?.result && (
        <div className="toast" role="status">
          {nightNational?.status === 'unavailable'
            ? 'Fonte indisponível. Tentaremos novamente.'
            : 'Preparando a noite da apuração…'}
          <button onClick={closeNight} aria-label="Cancelar abertura da noite da apuração">
            <X size={16} />
          </button>
        </div>
      )}
      {welcome && (
        <Onboarding
          nickname={nickname}
          favorite={favorite}
          onFinish={finishWelcome}
          onEnable={pushEnable}
          notification={notification}
          serviceReady={!!pushKey}
          serviceMessage={pushMessage}
        />
      )}
      {!welcome && !mobile && !night && <AppDock tab={tab} onGo={go} />}
      {showTop && (
        <button
          className="back-to-top"
          aria-label="Voltar ao topo"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: scrollBehavior() });
            document
              .querySelector<HTMLElement>('[data-page-title]')
              ?.focus({ preventScroll: true });
          }}
        >
          <ArrowUp size={18} />
          <span>Topo</span>
        </button>
      )}
      {toast && (
        <div className="toast" role="status">
          <Info size={17} />
          {toast}
          <button aria-label="Fechar aviso" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
