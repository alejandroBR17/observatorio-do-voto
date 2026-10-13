'use client';
import { useEffect, useState } from 'react';
import { AnalyticsConsent } from './privacy-consent';
import { readPrivacyChoice, savePrivacyChoice, privacyChoiceEvent } from '@/lib/privacy-choices';

export function PrivacyControls() {
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const update = () => setAllowed(!!readPrivacyChoice('analytics'));
    update();
    window.addEventListener(privacyChoiceEvent, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(privacyChoiceEvent, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  function change(checked: boolean) {
    try {
      savePrivacyChoice('analytics', checked);
      setAllowed(checked);
      setMessage(
        checked
          ? 'Estatísticas autorizadas neste navegador.'
          : 'Novas visualizações não serão enviadas ao Analytics.',
      );
    } catch {
      setMessage('Não foi possível salvar. A autorização anterior permanece. Tente novamente.');
    }
  }
  return (
    <section className="panel">
      <span className="section-index">SUAS ESCOLHAS DE PRIVACIDADE</span>
      <h2>Estatísticas de acesso</h2>
      <AnalyticsConsent checked={allowed} onChange={change} />
      {message && (
        <p className="fine" role="status">
          {message}
        </p>
      )}
      <p className="fine">
        Para cancelar alertas e remover a inscrição do servidor, use Desativar neste aparelho em
        Alertas.
      </p>
    </section>
  );
}
