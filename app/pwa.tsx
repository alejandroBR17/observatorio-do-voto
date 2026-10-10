'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownToLine, BookOpen, Check, Globe2, Radio, Smartphone, WifiOff } from 'lucide-react';
import type { Result } from '@/lib/elections';
import { installationPlatform, offlineSnapshot } from '@/lib/pwa';

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
type PwaState = {
  installed: boolean;
  canInstall: boolean;
  platform: ReturnType<typeof installationPlatform>;
  message: string;
  installing: boolean;
  install(): Promise<boolean>;
};
const PwaContext = createContext<PwaState | null>(null);
const fallback: PwaState = {
  installed: false,
  canInstall: false,
  platform: 'desktop',
  message: '',
  installing: false,
  install: async () => false,
};
export const usePwa = () => useContext(PwaContext) || fallback;

export function PwaProvider({ children }: { children: ReactNode }) {
  const prompt = useRef<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [platform, setPlatform] = useState<PwaState['platform']>('desktop');
  const [message, setMessage] = useState('');
  const [installing, setInstalling] = useState(false);
  useEffect(() => {
    const media = matchMedia('(display-mode: standalone)');
    const update = () =>
      setInstalled(
        media.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    update();
    setPlatform(installationPlatform(navigator.userAgent, navigator.maxTouchPoints));
    const ready = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPrompt;
      setCanInstall(true);
    };
    const complete = () => {
      prompt.current = null;
      setCanInstall(false);
      setMessage('Instalação concluída. Abra o Observatório pelo ícone do aparelho.');
      update();
    };
    media.addEventListener('change', update);
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', complete);
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', complete);
    };
  }, []);
  async function install() {
    const event = prompt.current;
    if (!event || installing) return false;
    prompt.current = null;
    setCanInstall(false);
    setInstalling(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setMessage(
        choice.outcome === 'accepted'
          ? 'Abra o app pelo novo ícone para usar o modo instalado.'
          : 'Você pode instalar depois pelo menu do navegador.',
      );
      return true;
    } catch {
      setMessage('O navegador não abriu a instalação. Use as instruções abaixo.');
      return false;
    } finally {
      setInstalling(false);
    }
  }
  return (
    <PwaContext.Provider value={{ installed, canInstall, platform, message, installing, install }}>
      {children}
    </PwaContext.Provider>
  );
}

export function InstallAction({ onOpen }: { onOpen: () => void }) {
  const pwa = usePwa();
  const label = pwa.installed ? 'Meu app' : pwa.canInstall ? 'Instalar app' : 'Como instalar';
  return (
    <button
      className="header-app"
      aria-label={label}
      title={label}
      disabled={pwa.installing}
      onClick={() => {
        if (pwa.canInstall && !pwa.installed)
          void pwa.install().then((opened) => {
            if (!opened) onOpen();
          });
        else onOpen();
      }}
    >
      {pwa.installed ? <Smartphone size={18} /> : <ArrowDownToLine size={18} />}
      <span>{label}</span>
    </button>
  );
}

export function PwaPanel({ result, onAlerts }: { result?: Result; onAlerts: () => void }) {
  const pwa = usePwa();
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('observatorio.offline-result') || 'null');
      if (data?.savedAt) setSaved(data.savedAt);
    } catch {
      // Unreadable local storage leaves offline setup available for a new save.
    }
  }, []);
  const guides = {
    ios: [
      'Abra este endereço no Safari.',
      'Toque em Compartilhar e escolha “Adicionar à Tela de Início”. Se aparecer “Abrir como App da Web”, mantenha ativado.',
      'Confirme em Adicionar e abra pelo novo ícone.',
    ],
    android: [
      'Abra o endereço no Chrome ou em um navegador compatível.',
      'No menu ⋮, procure “Instalar app” ou “Adicionar à tela inicial”.',
      'Confirme e abra pelo ícone do Observatório.',
    ],
    safari: [
      'Abra o endereço no Safari do Mac.',
      'No menu Arquivo, escolha “Adicionar ao Dock”, se essa opção estiver disponível.',
      'Confirme e abra o Observatório pelo Dock.',
    ],
    desktop: [
      'Abra o endereço no Chrome ou Edge.',
      'Clique no ícone de instalação na barra de endereços ou procure “Instalar app” no menu do navegador.',
      'Confirme e abra pelo novo ícone. Se a opção não existir, use um navegador compatível.',
    ],
  };
  function save() {
    if (!result) return;
    try {
      const snapshot = offlineSnapshot(result);
      localStorage.setItem('observatorio.offline-result', JSON.stringify(snapshot));
      setSaved(snapshot.savedAt);
      setError('');
    } catch {
      setError(
        'Não foi possível guardar o resultado neste aparelho. Confira se o armazenamento está disponível.',
      );
    }
  }
  return (
    <div className="pwa-panels">
      <section className="panel pwa-hero">
        <img src="/app-icon-192.png" width="72" height="72" alt="" />
        <div>
          <span className="eyebrow">O OBSERVATÓRIO NO SEU APARELHO</span>
          <h2>
            {pwa.installed
              ? 'Seu app, pronto para acompanhar.'
              : 'Leve o país, voto a voto, com você.'}
          </h2>
          <p>
            {pwa.installed
              ? 'Acesso direto, atalhos na tela e um espaço para consultar mesmo sem conexão.'
              : 'Gratuito, sem loja de aplicativos. Abra pelo ícone e tenha uma experiência dedicada.'}
          </p>
          {!pwa.installed && pwa.canInstall && (
            <button
              className="button primary"
              disabled={pwa.installing}
              onClick={() => void pwa.install()}
            >
              <ArrowDownToLine size={17} />
              {pwa.installing ? 'Abrindo instalação…' : 'Instalar app'}
            </button>
          )}
          {pwa.installed && (
            <span className="subtle-tag">
              <Check size={15} />
              Aberto como aplicativo
            </span>
          )}
        </div>
      </section>
      {pwa.message && (
        <p className="notice" role="status">
          {pwa.message}
        </p>
      )}
      {!pwa.installed && (
        <section className="panel pwa-guide">
          <h2>Como instalar neste aparelho</h2>
          <ol>
            {guides[pwa.platform].map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="fine">
            Em navegadores de redes sociais ou dentro de outros apps, abra primeiro o link no
            navegador do aparelho. A instalação varia conforme o sistema e o navegador.
          </p>
        </section>
      )}
      <div className="pwa-features">
        <section className="panel">
          <Smartphone size={23} />
          <h3>Uma experiência própria</h3>
          <p>
            Ao abrir pelo ícone, use os atalhos fixos para Panorama, Apuração e Caderno. Navegadores
            compatíveis também oferecem atalhos ao pressionar o ícone do app.
          </p>
        </section>
        <section className="panel">
          <Radio size={23} />
          <h3>Prepare os seus alertas</h3>
          <p>
            Escolha pesquisas, notícias e eventos da apuração. No iPhone compatível, ative depois de
            abrir pela tela inicial.
          </p>
          <button className="button secondary" onClick={onAlerts}>
            Escolher meus alertas
          </button>
          <p className="fine">
            A entrega depende das permissões, da conexão e do sistema; a instalação não aumenta a
            frequência da coleta.
          </p>
        </section>
        <section className="panel">
          <WifiOff size={23} />
          <h3>Seu espaço sem conexão</h3>
          <p>
            Consulte as anotações deste app e um resultado final guardado no aparelho. Pesquisas e
            apuração ao vivo precisam de internet.
          </p>
          {pwa.installed ? (
            <>
              <button className="button secondary" disabled={!result?.final} onClick={save}>
                {saved
                  ? 'Atualizar resultado guardado'
                  : 'Guardar resultado para consultar offline'}
              </button>
              {saved && (
                <p className="fine" role="status">
                  Guardado neste aparelho em {new Date(saved).toLocaleString('pt-BR')}.
                </p>
              )}
              {error && (
                <p role="alert" className="notice error">
                  {error}
                </p>
              )}
              <a className="text-button" href="/offline.html">
                Abrir meu espaço offline
              </a>
            </>
          ) : (
            <p className="fine">Abra pelo ícone do app para preparar seu resultado offline.</p>
          )}
        </section>
        <section className="panel">
          <BookOpen size={23} />
          <h3>Para a noite da apuração</h3>
          <p>
            No app instalado, mantenha a tela acesa enquanto acompanha a tela especial, quando o
            aparelho permitir. Você controla quando ativar e desligar.
          </p>
        </section>
      </div>
      <p className="fine">
        As preferências e anotações ficam neste ambiente do aparelho. O app instalado pode ter
        armazenamento separado do navegador. Não há sincronização automática entre aparelhos.
      </p>
    </div>
  );
}

export function AppDock({ tab, onGo }: { tab: string; onGo: (tab: string) => void }) {
  const { installed } = usePwa();
  if (!installed) return null;
  return (
    <nav className="app-dock" aria-label="Atalhos do app instalado">
      {(
        [
          ['overview', 'Panorama', Globe2],
          ['live', 'Apuração', Radio],
          ['watch', 'Caderno', BookOpen],
        ] as const
      ).map(([id, label, Icon]) => (
        <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => onGo(id)}>
          <Icon size={21} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function ScreenAwakeButton() {
  const { installed } = usePwa();
  const [supported, setSupported] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setSupported('wakeLock' in navigator), []);
  useEffect(() => {
    if (!wanted || !supported) return;
    let canceled = false;
    let held: WakeLockSentinel | undefined;
    let requesting = false;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || requesting || (held && !held.released)) return;
      requesting = true;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (canceled) {
          await lock.release();
          return;
        }
        held = lock;
        setActive(true);
        lock.addEventListener('release', () => {
          if (!canceled) setActive(false);
        });
      } catch {
        if (!canceled) {
          setError('O aparelho não permitiu manter a tela acesa.');
          setWanted(false);
        }
      } finally {
        requesting = false;
      }
    };
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      canceled = true;
      document.removeEventListener('visibilitychange', acquire);
      void held?.release().catch(() => {});
      setActive(false);
    };
  }, [wanted, supported]);
  if (!installed || !supported) return null;
  return (
    <div className="awake-control">
      <button
        className="button secondary"
        aria-pressed={wanted}
        onClick={() => {
          setError('');
          setWanted(!wanted);
        }}
      >
        {active
          ? 'Tela acesa · desligar'
          : wanted
            ? 'Tela acesa · aguardando'
            : 'Manter tela acesa'}
      </button>
      {error && <span role="status">{error}</span>}
    </div>
  );
}
