'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  ShieldCheck,
  Globe2,
  SlidersHorizontal,
  ChevronLeft,
} from 'lucide-react';
import { candidates } from '@/lib/content';
import { useReading } from './reading';
import { AnalyticsConsent, PushConsent } from './components/privacy-consent';
import { readPrivacyChoice } from '@/lib/privacy-choices';
export type WelcomeChoices = {
  nickname: string;
  favorite: string;
  details: boolean;
  analytics: boolean;
};
export const welcomeTermsStep = 3;
const welcomeSteps = [
  { label: 'Boas-vindas', title: 'Seu próprio olhar.' },
  { label: 'Quem acompanhar', title: 'Qual perspectiva você prefere?' },
  { label: 'Seu jeito de ler', title: 'Quanto contexto faz sentido?' },
  { label: 'Termos', title: 'Transparência antes de começar.' },
  { label: 'Notificações', title: 'Avisos no seu ritmo.' },
  { label: 'Estatísticas', title: 'Tudo pronto para acompanhar.' },
];
export function Onboarding({
  nickname,
  favorite,
  onFinish,
  onEnable,
  notification,
  serviceReady,
  serviceMessage,
  initialStep = 0,
  consentAccepted,
  onConsent,
}: {
  nickname: string;
  favorite: string;
  onFinish: (choices: WelcomeChoices, alerts: boolean) => boolean;
  onEnable: () => Promise<{ ok: boolean; message: string }>;
  notification: string;
  serviceReady: boolean;
  serviceMessage: string;
  initialStep?: number;
  consentAccepted: boolean;
  onConsent: (accepted: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    { reading } = useReading();
  const [step, setStep] = useState(initialStep),
    [name, setName] = useState(nickname),
    [choice, setChoice] = useState(favorite),
    [details, setDetails] = useState(reading === 'detailed'),
    [accepted, setAccepted] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  useEffect(() => setAnalytics(!!readPrivacyChoice('analytics')), []);
  const [supported, setSupported] = useState(false),
    [activating, setActivating] = useState(false),
    [message, setMessage] = useState('');
  useEffect(
    () =>
      setSupported(
        'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator,
      ),
    [],
  );
  useEffect(() => {
    const modal = dialog.current,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modal?.showModal();
    return () => {
      modal?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  useEffect(() => {
    setMessage('');
    dialog.current?.querySelector<HTMLElement>('#welcome-title')?.focus({ preventScroll: true });
    dialog.current?.scrollTo({ top: 0 });
  }, [step]);
  async function activate() {
    if (activating || !accepted || !consentAccepted) return;
    setActivating(true);
    try {
      const result = await onEnable();
      setMessage(result.message);
      if (result.ok) setStep(5);
    } finally {
      setActivating(false);
    }
  }
  function finish(alerts = false) {
    if (!accepted) {
      setMessage('Leia e aceite os Termos de Uso para continuar.');
      return;
    }
    if (
      !onFinish(
        { nickname: name.trim().slice(0, 40), favorite: choice, details, analytics },
        alerts,
      )
    )
      setMessage('Não foi possível salvar. Verifique o armazenamento deste navegador.');
  }
  return (
    <dialog
      ref={dialog}
      className="welcome-dialog"
      aria-labelledby="welcome-title"
      onCancel={(e) => {
        e.preventDefault();
        setStep(welcomeTermsStep);
      }}
    >
      <div className="welcome-layout">
        <aside className="welcome-story">
          <div className="welcome-brand">
            <img src="/app-icon.svg" width="42" height="42" alt="" />
            <span>
              observatório<small>DO VOTO</small>
            </span>
          </div>
          <div className="welcome-story-copy">
            <span className="eyebrow">OBSERVAR O VOTO. ENTENDER O PAÍS.</span>
            <h2>
              O território.
              <br />
              A história.
              <br />
              <em>O seu olhar.</em>
            </h2>
            <div className="welcome-art" aria-hidden="true">
              <Globe2 size={125} strokeWidth={0.7} />
              <i />
              <i />
              <i />
            </div>
            <p>
              Aproxime o olhar. Conecte lugares, pesquisas e história com as fontes sempre à vista.
            </p>
          </div>
          <ol className="welcome-steps" aria-label="Etapas das boas-vindas">
            {welcomeSteps.map(({ label }, i) => (
              <li
                key={label}
                className={step === i ? 'current' : step > i ? 'done' : ''}
                aria-current={step === i ? 'step' : undefined}
                aria-label={`${i + 1}. ${label}`}
              >
                <span className="welcome-step-number" aria-hidden="true">
                  {step > i ? <Check size={13} /> : i + 1}
                </span>
                <span className="welcome-step-label">{label}</span>
              </li>
            ))}
          </ol>
        </aside>
        <div className="welcome-pane">
          <header className="welcome-step-heading">
            <span>SEU OBSERVATÓRIO</span>
            <span>
              {step + 1} / {welcomeSteps.length} · {welcomeSteps[step].label}
            </span>
          </header>
          <div className="welcome-content" key={step}>
            <h2 id="welcome-title" tabIndex={-1}>
              {welcomeSteps[step].title}
            </h2>
            {step === 0 ? (
              <>
                <p>
                  Antes de começar, vamos preparar um espaço de acompanhamento para você. Sem criar
                  uma conta.
                </p>
                <label className="form-label">
                  <span>
                    Como podemos chamar você? <small>Opcional</small>
                  </span>
                  <input
                    autoComplete="nickname"
                    placeholder="Nome ou apelido"
                    maxLength={40}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setStep(1);
                    }}
                  />
                </label>
                <div className="welcome-promise">
                  <ShieldCheck size={24} />
                  <div>
                    <strong>Seu espaço fica com você.</strong>
                    <p>Seu nome, suas preferências e suas notas ficam neste navegador.</p>
                  </div>
                </div>
              </>
            ) : step === 1 ? (
              <>
                <p>
                  Acompanhe os dois candidatos ou dê destaque ao seu preferido. Você pode mudar
                  depois, no perfil.
                </p>
                <p className="fine">
                  Ao escolher um candidato, você autoriza guardar esta preferência política somente
                  neste aparelho. A escolha é opcional e pode ser removida ao acompanhar os dois.
                </p>
                <div className="preference-options">
                  <button
                    aria-pressed={!choice}
                    className={!choice ? 'chosen' : ''}
                    onClick={() => setChoice('')}
                  >
                    <Globe2 size={20} />
                    <span>
                      Os dois candidatos<small>Visão completa da eleição</small>
                    </span>
                    {!choice && <Check size={16} />}
                  </button>
                  {candidates.map((c) => (
                    <button
                      key={c.number}
                      aria-pressed={choice === c.number}
                      className={choice === c.number ? 'chosen' : ''}
                      onClick={() => setChoice(c.number)}
                    >
                      <img src={c.photo} alt="" />
                      <span>
                        {c.name}
                        <small>{c.party}</small>
                      </span>
                      {choice === c.number && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </>
            ) : step === 2 ? (
              <>
                <p>Escolha quanto detalhe quer ver ao comparar as pesquisas.</p>
                <fieldset className="welcome-reading">
                  <legend className="sr-only">Como apresentar as pesquisas</legend>
                  {[
                    {
                      value: false,
                      title: 'Direto ao ponto',
                      description:
                        'Os principais números primeiro, com detalhes disponíveis quando quiser.',
                      items: ['Intenção de voto', 'Margem de erro'],
                    },
                    {
                      value: true,
                      title: 'Mais contexto',
                      description:
                        'Veja também como e quando a pesquisa foi feita, com os detalhes já abertos.',
                      items: ['Período', 'Amostra', 'Metodologia'],
                    },
                  ].map((option) => (
                    <label className="welcome-reading-option" key={option.title}>
                      <input
                        type="radio"
                        name="welcome-reading"
                        checked={details === option.value}
                        onChange={() => setDetails(option.value)}
                      />
                      <span className="welcome-reading-copy">
                        <strong>{option.title}</strong>
                        <span>{option.description}</span>
                        <span className="welcome-reading-preview" aria-hidden="true">
                          {option.items.map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <p className="fine">
                  Você pode mudar depois no Perfil. Os resultados oficiais são iguais para todos.
                </p>
              </>
            ) : step === welcomeTermsStep ? (
              <>
                <p>
                  Um projeto independente, com fontes identificadas. Leia os documentos antes de
                  seguir.
                </p>
                <div className="welcome-terms">
                  <ShieldCheck size={22} />
                  <div>
                    <strong>Informação com responsabilidade</strong>
                    <p>
                      Pesquisas são retratos do momento. Resultados parciais podem mudar. Seus dados
                      pessoais de acompanhamento ficam neste aparelho.
                    </p>
                    <div className="legal-links">
                      <a href="/termos" target="_blank" rel="noreferrer">
                        Termos de Uso ↗
                      </a>
                      <a href="/privacidade" target="_blank" rel="noreferrer">
                        Aviso de Privacidade ↗
                      </a>
                    </div>
                  </div>
                </div>
                <label className="terms-check">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                  />
                  <span>
                    Li e aceito os{' '}
                    <a href="/termos" target="_blank" rel="noreferrer">
                      Termos de Uso
                    </a>
                    .
                  </span>
                </label>
              </>
            ) : step === 4 ? (
              <>
                <p>
                  Novas pesquisas e os principais momentos da apuração, mesmo com o app fechado.
                </p>
                <div className="welcome-notifications">
                  <Bell size={23} />
                  <div>
                    <strong>
                      {notification === 'Ativadas'
                        ? 'Seus alertas estão ativados'
                        : 'Você escolhe o que receber'}
                    </strong>
                    {notification === 'Ativadas' && (
                      <p>Categorias e frequência podem ser ajustadas em Alertas.</p>
                    )}
                    {notification !== 'Ativadas' && (
                      <PushConsent checked={consentAccepted} onChange={onConsent} />
                    )}
                    {!supported && (
                      <p className="fine">
                        No iPhone, adicione à Tela de Início e abra pelo ícone instalado para
                        ativar.
                      </p>
                    )}
                    {serviceMessage && <p className="fine">{serviceMessage}</p>}
                  </div>
                </div>
              </>
            ) : (
              <>
                <p>
                  Se quiser, ajude a melhorar o app com estatísticas de acesso. A escolha é
                  opcional.
                </p>
                <AnalyticsConsent checked={analytics} onChange={setAnalytics} />
              </>
            )}
          </div>
          <div className="welcome-actions">
            {step === 0 ? (
              <>
                <button className="text-button" onClick={() => setStep(welcomeTermsStep)}>
                  Continuar sem personalizar
                </button>
                <button className="button primary" onClick={() => setStep(1)}>
                  Personalizar
                  <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  className="text-button"
                  disabled={activating}
                  onClick={() => setStep(step - 1)}
                >
                  <ChevronLeft size={14} />
                  Voltar
                </button>
                {step === 4 && notification !== 'Ativadas' && (
                  <button className="text-button" disabled={activating} onClick={() => setStep(5)}>
                    Agora não
                  </button>
                )}
                <button
                  className="button primary"
                  disabled={
                    activating ||
                    (step >= welcomeTermsStep && !accepted) ||
                    (step === 4 &&
                      notification !== 'Ativadas' &&
                      (!accepted || !consentAccepted || !supported || !serviceReady))
                  }
                  aria-busy={activating}
                  onClick={() => {
                    if (step === 5) finish();
                    else if (step === 4 && notification !== 'Ativadas') void activate();
                    else setStep(step + 1);
                  }}
                >
                  {activating
                    ? 'Ativando…'
                    : step === 5
                      ? 'Entrar no Observatório'
                      : step === 4 && notification !== 'Ativadas'
                        ? 'Ativar e continuar'
                        : 'Continuar'}
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
          {message && (
            <p className="welcome-feedback" role="status">
              {message}
            </p>
          )}
          {step === 5 && (
            <button className="welcome-alerts" disabled={!accepted} onClick={() => finish(true)}>
              <SlidersHorizontal size={15} />
              Entrar e escolher categorias de alertas
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
