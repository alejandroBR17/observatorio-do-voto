'use client';
import { pushConsentText, pushTransferText } from '@/lib/privacy';
export function PushConsent({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="privacy-choice">
      <label className="terms-check">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{pushConsentText}</span>
      </label>
      <p className="fine">{pushTransferText}</p>
      <a
        className="text-button privacy-info-link"
        href="/privacidade#transferencias"
        target="_blank"
        rel="noreferrer"
      >
        Como meus dados são usados
      </a>
    </div>
  );
}
export function AnalyticsConsent({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="privacy-choice">
      <label className="terms-check">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>Quero ajudar a melhorar o app com estatísticas de acesso opcionais.</span>
      </label>
      <p className="fine">
        A Vercel pode processar dados técnicos da visita fora do Brasil. Os relatórios mostram
        visitas, navegador, dispositivo e localização aproximada; suas escolhas políticas, anotações
        e filtros da consulta não são enviados. Você pode mudar esta autorização no Perfil.
      </p>
      <a
        className="text-button privacy-info-link"
        href="/privacidade#estatisticas"
        target="_blank"
        rel="noreferrer"
      >
        Saiba mais
      </a>
    </div>
  );
}
