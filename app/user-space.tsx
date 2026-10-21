'use client';
import { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  ShieldCheck,
  UserRound,
  Radio,
  ArrowUpRight,
  MapPin,
  BookOpen,
} from 'lucide-react';
import { candidates } from '@/lib/content';
import { Disclosure } from './disclosure';
import { ThemeMenu } from './theme-menu';
import { AnalysisPreference } from './reading';
import type { AlertPreferences } from '@/lib/alerts';
import { NotificationHistory } from './notification-history';
import { PrivacyControls } from './components/privacy-controls';
import { PushConsent } from './components/privacy-consent';
import { states } from '@/lib/elections';
import { readWatch, type NotebookEntry } from '@/lib/notebook';
import type { WatchSection } from './features/watchboard';
type Prefs = AlertPreferences;
export function Profile({
  nickname,
  onNickname,
  favorite,
  onFavorite,
  onWatch,
  onCustomize,
  notification,
  onAlerts,
  theme,
  onTheme,
  observatory = false,
}: {
  observatory?: boolean;
  nickname: string;
  onNickname: (name: string) => boolean;
  favorite: string;
  onFavorite: (candidate: string) => void;
  onWatch: (section?: WatchSection) => void;
  onCustomize: () => void;
  notification: string;
  onAlerts: () => void;
  theme: 'system' | 'light' | 'dark';
  onTheme: (theme: 'system' | 'light' | 'dark') => void;
}) {
  const [draft, setDraft] = useState(nickname),
    [saved, setSaved] = useState<'idle' | 'saved' | 'error'>('idle'),
    [watchReady, setWatchReady] = useState(false),
    [watch, setWatch] = useState<{ states: string[]; entries: NotebookEntry[] }>({
      states: [],
      entries: [],
    });
  useEffect(() => setDraft(nickname), [nickname]);
  useEffect(() => {
    try {
      setWatch(readWatch(JSON.parse(localStorage.getItem('observatorio.watch') || '{}')));
    } catch {
      // Keep the empty local summary when notebook storage is unreadable.
    }
    setWatchReady(true);
  }, []);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(onNickname(draft.trim().slice(0, 40)) ? 'saved' : 'error');
  }
  const initials = nickname
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toLocaleUpperCase('pt-BR');
  return (
    <div
      className={observatory ? 'or-profile' : undefined}
      style={observatory ? undefined : { display: 'contents' }}
    >
      <section className="profile-hero panel">
        <div className="personal-avatar">{initials || <UserRound size={40} />}</div>
        <div>
          <span className="eyebrow">
            {observatory ? 'PREFERÊNCIAS DESTE APARELHO' : 'SEU ESPAÇO NO OBSERVATÓRIO'}
          </span>
          <h2>
            {nickname
              ? 'Olá, ' + nickname + '.'
              : observatory
                ? 'Do seu jeito.'
                : 'Seu olhar sobre a eleição.'}
          </h2>
          <p>
            {observatory
              ? 'Escolha como acompanhar a eleição e o que manter à mão.'
              : 'Organize o que quer acompanhar e ajuste como prefere ver o app.'}
          </p>
          <span className="privacy-label">
            <ShieldCheck size={13} />
            Preferências pessoais salvas neste navegador
          </span>
        </div>
      </section>
      <div
        className="profile-summary"
        aria-label="Resumo do seu acompanhamento"
        aria-busy={!watchReady}
      >
        <button onClick={() => onWatch(observatory ? 'estados-seguidos' : undefined)}>
          <MapPin size={20} />
          <strong>{watchReady ? watch.states.length : '—'}</strong>
          <span>Estados seguidos</span>
          <ArrowUpRight size={15} />
        </button>
        <button onClick={() => onWatch(observatory ? 'seu-caderno' : undefined)}>
          <BookOpen size={20} />
          <strong>{watchReady ? watch.entries.length : '—'}</strong>
          <span>Anotações no caderno</span>
          <ArrowUpRight size={15} />
        </button>
        <button onClick={onAlerts}>
          <Bell size={20} />
          <strong>{notification}</strong>
          <span>Notificações neste aparelho</span>
          <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="dashboard-grid equal">
        <section className="panel or-profile-identity">
          <span className="section-index">IDENTIDADE LOCAL</span>
          <h2>Como quer ser chamado?</h2>
          <form onSubmit={submit}>
            <label className="form-label">
              Nome ou apelido
              <input
                autoComplete="nickname"
                maxLength={40}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setSaved('idle');
                }}
                placeholder="Seu nome aqui"
              />
            </label>
            <button className="button primary" type="submit">
              <Check size={16} />
              Salvar meu nome
            </button>
            {saved !== 'idle' && (
              <p className="save-hint" role="status">
                {saved === 'saved'
                  ? 'Nome salvo neste aparelho.'
                  : 'Não foi possível salvar o nome. Tente novamente.'}
              </p>
            )}
          </form>
          <div className="profile-theme">
            <span>
              Aparência
              {observatory && (
                <small>
                  {theme === 'system'
                    ? 'Acompanha o sistema do aparelho'
                    : theme === 'light'
                      ? 'Tema claro selecionado'
                      : 'Tema escuro selecionado'}
                </small>
              )}
            </span>
            <ThemeMenu value={theme} onChange={onTheme} />
          </div>
          <p className="fine">
            Seu perfil não é público. Não há conta ou foto visível para outras pessoas.
          </p>
        </section>
        <section className="panel or-profile-candidates">
          <span className="section-index">SEU ACOMPANHAMENTO</span>
          <h2>Quem você quer acompanhar?</h2>
          <p className="fine">
            {observatory
              ? 'A escolha identifica o candidato em Meu acompanhamento. Acompanhar alguém não representa um voto declarado.'
              : 'A escolha aparece no seu acompanhamento. Os resultados oficiais continuam iguais para todos.'}
          </p>
          <p className="fine">
            Escolha opcional: ao selecionar um candidato, você autoriza guardar esta preferência
            política somente neste aparelho. Acompanhar os dois remove a escolha.
          </p>
          {observatory && (
            <p className="fine">
              A cobertura mantém informações favoráveis e críticas, com fontes. Pesquisas e
              resultados continuam mostrando os dois candidatos.
            </p>
          )}
          <div className="preference-options">
            <button
              aria-pressed={!favorite}
              className={!favorite ? 'chosen' : ''}
              onClick={() => onFavorite('')}
            >
              <ShieldCheck size={20} />
              <span>
                Acompanhar os dois<small>Visão completa da eleição</small>
              </span>
              {!favorite && <Check size={16} />}
            </button>
            {candidates.map((c) => (
              <button
                className={favorite === c.number ? 'chosen' : ''}
                key={c.number}
                aria-pressed={favorite === c.number}
                onClick={() => onFavorite(c.number)}
              >
                <img src={c.photo} alt="" />
                <span>
                  {c.name}
                  <small>
                    {c.party} · número {c.number}
                  </small>
                </span>
                {favorite === c.number && <Check size={16} />}
              </button>
            ))}
          </div>
        </section>
      </div>
      <AnalysisPreference />
      {observatory ? (
        <div className="or-profile-privacy">
          <Disclosure
            title="Privacidade e dados deste aparelho"
            summary="Estatísticas opcionais e orientações sobre suas escolhas"
          >
            <PrivacyControls />
          </Disclosure>
        </div>
      ) : (
        <PrivacyControls />
      )}
      {watch.states.length > 0 && (
        <section className="panel profile-following">
          <div className="panel-head">
            <h2>Os lugares que você acompanha</h2>
            <button
              className="text-button"
              onClick={() => onWatch(observatory ? 'estados-seguidos' : undefined)}
            >
              Abrir comparação
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="followed-labels">
            {watch.states.map((code) => (
              <span key={code}>
                <MapPin size={13} />
                {states.find((s) => s[1] === code)?.[2]}
              </span>
            ))}
          </div>
        </section>
      )}
      <div className="profile-bottom-actions">
        <button className="text-button" onClick={onCustomize}>
          Rever boas-vindas e personalização
          <ArrowUpRight size={15} />
        </button>
        <a className="text-button" href="/privacidade">
          Privacidade do meu espaço
          <ShieldCheck size={14} />
        </a>
        <a className="text-button" href="/termos">
          Termos de Uso
          <ArrowUpRight size={14} />
        </a>
      </div>
    </div>
  );
}
export function Alerts({
  notification,
  prefs,
  onPrefs,
  onEnable,
  onDisable,
  onLive,
  serviceReady,
  serviceMessage,
  onRetry,
  onTest,
  consentAccepted,
  onConsent,
  observatory = false,
}: {
  observatory?: boolean;
  notification: string;
  prefs: Prefs;
  onPrefs: (next: Prefs) => void;
  onEnable: () => Promise<{ ok: boolean; message: string }>;
  onDisable: () => void;
  onLive: () => void;
  serviceReady: boolean;
  serviceMessage: string;
  onRetry: () => void;
  onTest: () => Promise<{ ok: boolean; message: string }>;
  consentAccepted: boolean;
  onConsent: (accepted: boolean) => void;
}) {
  const labels: [Exclude<keyof Prefs, 'frequency'>, string, string][] = [
    ['winner', 'Resultado confirmado', 'Quando o TSE informar o candidato eleito.'],
    [
      'mathematical',
      'Vantagem numericamente irreversível',
      'Quando os votos pendentes não puderem superar a diferença.',
    ],
    ['lead', 'Mudança de liderança', 'Quando outro candidato passar à frente.'],
    [
      'margin',
      'Mudança na vantagem',
      'Variação acumulada de pelo menos 0,5 ponto percentual desde o último aviso de vantagem.',
    ],
    [
      'progress',
      'Outras atualizações da apuração',
      'Novos parciais do TSE, além dos eventos acima.',
    ],
    [
      'polls',
      'Pesquisas e publicações dos institutos',
      'Novos resultados, análises dos institutos e reportagens sobre os levantamentos.',
    ],
    [
      'coverage',
      'Novas notícias',
      'Novos links reunidos em um único aviso, respeitando o intervalo escolhido.',
    ],
  ];
  const [activating, setActivating] = useState(false);
  async function enable() {
    if (activating) return;
    setActivating(true);
    try {
      await onEnable();
    } finally {
      setActivating(false);
    }
  }
  const [testing, setTesting] = useState(false),
    [testFeedback, setTestFeedback] = useState(''),
    [testOk, setTestOk] = useState(false);
  async function test() {
    if (testing) return;
    setTesting(true);
    setTestFeedback('Enviando teste e aguardando o navegador…');
    try {
      const result = await onTest();
      setTestFeedback(result.message);
      setTestOk(result.ok);
    } finally {
      setTesting(false);
    }
  }
  const [supported, setSupported] = useState(true);
  useEffect(
    () =>
      setSupported(
        'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator,
      ),
    [],
  );
  const renderOption = ([key, title, description]: (typeof labels)[number]) => (
    <label className="alert-option" key={key}>
      <input
        type="checkbox"
        checked={prefs[key]}
        onChange={(e) => onPrefs({ ...prefs, [key]: e.target.checked })}
      />
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </label>
  );
  const testPanel = (
    <section className="push-test-panel panel">
      <div>
        <span className="eyebrow">CONFIRA A ENTREGA</span>
        <h2>Seu aparelho está recebendo?</h2>
        <p>Envie um aviso identificado como teste. Ele usa a mesma inscrição dos alertas reais.</p>
      </div>
      <button
        className="button secondary"
        disabled={testing || notification !== 'Ativadas'}
        onClick={test}
      >
        <Bell size={16} />
        {testing ? 'Aguardando confirmação…' : 'Enviar notificação de teste'}
      </button>
      {notification !== 'Ativadas' && (
        <p className="fine">Ative as notificações acima para testar neste aparelho.</p>
      )}
      {testFeedback && (
        <div className={'test-feedback ' + (testOk ? 'confirmed' : '')} role="status">
          {testFeedback}
        </div>
      )}
    </section>
  );
  return (
    <div
      className={observatory ? 'or-alerts' : undefined}
      style={observatory ? undefined : { display: 'contents' }}
    >
      <section className="alert-hero panel">
        <span className="alert-orbit">
          <Bell size={30} />
        </span>
        <div>
          <span className="eyebrow">ACOMPANHE SEM PERDER O MOMENTO</span>
          <h2>Os acontecimentos chegam até você.</h2>
          <p>Escolha os eventos que fazem sentido para o seu acompanhamento.</p>
          <span className={'notification-status ' + (notification === 'Ativadas' ? 'active' : '')}>
            {notification === 'Ativadas' ? <Check size={14} /> : <Bell size={14} />}Notificações{' '}
            {notification.toLowerCase()}
          </span>
        </div>
        <div className="alert-cta">
          <button
            className="button primary"
            onClick={enable}
            disabled={
              activating || !supported || !serviceReady || (observatory && !consentAccepted)
            }
            aria-busy={activating}
          >
            <Bell size={16} />
            {activating
              ? 'Aguarde…'
              : notification === 'Ativadas'
                ? 'Atualizar inscrição'
                : 'Ativar notificações'}
          </button>
          {notification === 'Ativadas' && (
            <>
              <button className="text-button" onClick={onDisable} disabled={activating}>
                Desativar neste aparelho
              </button>
            </>
          )}
        </div>
      </section>
      {observatory && !consentAccepted && (
        <p className="or-alert-guidance">
          Para ativar neste aparelho, leia a autorização abaixo e marque sua escolha. Os eventos
          podem ser ajustados antes de ativar.
        </p>
      )}
      {observatory && (
        <nav className="or-alert-nav" aria-label="Nesta página">
          <a href="#eventos-alertas">
            <Check size={17} aria-hidden="true" />
            Escolher eventos
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
          <a href="#avisos-recebidos">
            <Bell size={17} aria-hidden="true" />
            Avisos recebidos
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </nav>
      )}
      {!consentAccepted && (
        <section className="panel" aria-label="Autorização das notificações">
          <h2>Você decide como receber.</h2>
          <PushConsent checked={consentAccepted} onChange={onConsent} />
          <p className="fine">
            Depois de autorizar, use Ativar notificações ou Atualizar inscrição acima. Aceitar os
            Termos de Uso não ativa alertas.
          </p>
        </section>
      )}
      {!observatory && testPanel}
      {!supported && (
        <div className="notice" role="status">
          No iPhone ou iPad com iOS 16.4 ou mais recente, adicione o app à Tela de Início pelo menu
          Compartilhar e abra pelo ícone instalado para ativar os alertas. No computador e Android,
          use um navegador compatível e permita notificações.
        </div>
      )}
      {serviceMessage && (
        <div className="notice" role="status">
          <span>{serviceMessage}</span>
          <button className="text-button" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      )}
      <section className="panel or-alert-settings" id="eventos-alertas">
        <div className="panel-head">
          <div>
            <span className="section-index">SEUS EVENTOS</span>
            <h2>Avise-me quando…</h2>
          </div>
          <span className="subtle-tag">Salvo automaticamente</span>
        </div>
        {observatory && (
          <div className="or-alert-events-group">
            <span className="eyebrow">01 / MARCOS DA APURAÇÃO</span>
            <h3>Quando a disputa muda.</h3>
            <p className="fine">
              Estes eventos têm prioridade, se selecionados. A entrega ocorre depois que a
              atualização é identificada nas fontes.
            </p>
            <div className="alert-options">
              {labels
                .filter(([key]) => ['winner', 'mathematical', 'lead'].includes(key))
                .map(renderOption)}
            </div>
          </div>
        )}
        {observatory && (
          <div className="or-alert-group-heading">
            <span className="eyebrow">02 / SEGUIR A ELEIÇÃO</span>
            <h3>Atualizações no seu ritmo.</h3>
            <p className="fine">
              Pesquisas, notícias, mudanças de vantagem e novos parciais respeitam o intervalo
              escolhido abaixo.
            </p>
          </div>
        )}
        <fieldset className="alert-frequency">
          <legend>Com que frequência quer receber atualizações comuns?</legend>
          <div className="frequency-options">
            {(
              [
                ['immediate', 'Resumo rápido · no máximo a cada 15 minutos'],
                ['hourly', 'No máximo uma vez por hora'],
                ['daily', 'No máximo uma vez por dia'],
              ] as const
            ).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="alert-frequency"
                  checked={prefs.frequency === value}
                  onChange={() => onPrefs({ ...prefs, frequency: value })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className="fine">
            Agrupamos pesquisas, notícias e parciais. Resultado, vantagem irreversível e mudança de
            liderança chegam assim que identificados, se você escolher esses eventos. Os avisos
            agrupados são enviados na próxima consulta após o intervalo.
          </p>
        </fieldset>
        <div className="alert-options">
          {(observatory
            ? labels.filter(([key]) => !['winner', 'mathematical', 'lead'].includes(key))
            : labels
          ).map(renderOption)}
        </div>
        <p className="fine">
          Categorias atualizadas automaticamente na inscrição ativa. A entrega depende da permissão
          do navegador.
        </p>
      </section>
      <div className="delivery-status">
        <Radio size={19} />
        <div>
          <strong>Apuração consultada a cada 30 segundos com o app conectado.</strong>
          <p>
            Mesmo sem visitantes, um monitor consulta as fontes em intervalos previstos de 5
            minutos. A agenda e a entrega podem atrasar. Antes da votação, você pode receber avisos
            das pesquisas e notícias que escolher acima.
          </p>
        </div>
      </div>
      {observatory && (
        <div className="or-alert-test">
          <Disclosure
            title="Conferir entrega neste aparelho"
            summary={
              notification === 'Ativadas'
                ? 'Envie um teste quando quiser verificar sua inscrição'
                : 'Ative as notificações para poder testar a entrega'
            }
          >
            {testPanel}
          </Disclosure>
        </div>
      )}
      <div id="avisos-recebidos" style={observatory ? undefined : { display: 'contents' }}>
        <NotificationHistory />
      </div>
      <Disclosure
        title="Como os alertas são calculados"
        summary="Fonte oficial, limites de vitória e privacidade"
      >
        <p>
          A confirmação de eleito vem do TSE. A vantagem numericamente irreversível exige uma
          diferença maior que o limite conservador de votos das seções pendentes. Ela depende da
          integridade dos registros atuais e não substitui a confirmação oficial.
        </p>
        <p>
          Uma liderança parcial pode mudar. Notificações podem atrasar ou não chegar; confira os
          resultados na tela de apuração.
        </p>
        <p>
          {observatory
            ? 'O candidato escolhido para acompanhar fica neste aparelho e não é enviado ao serviço de notificações.'
            : 'Seu candidato preferido não é enviado ao serviço de notificações.'}
        </p>
      </Disclosure>
      <button className="destination-card" onClick={onLive}>
        <Radio size={24} />
        <div>
          <strong>Abrir a apuração</strong>
          <span>Veja os resultados e a evolução dos votos.</span>
        </div>
        <ArrowUpRight size={22} />
      </button>
    </div>
  );
}
