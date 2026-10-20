'use client';

import { useEffect, useState } from 'react';
import { ObservationDesk } from '../observation-desk';
import { ThemeMenu, type Theme } from '../theme-menu';

export function IdentityReview() {
  const [theme, setTheme] = useState<Theme>('system');
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  return (
    <>
      <header className="topbar">
        <a className="header-brand" href="/">
          <img src="/app-icon.svg" alt="" width="36" height="36" />
          <span>
            observatório<small>DO VOTO</small>
          </span>
        </a>
        <ThemeMenu value={theme} onChange={setTheme} />
      </header>
      <main>
        <div className="notice">
          <strong>Prévia da identidade</strong>
          <span>Revisão visual. O site em produção continua com o visual atual.</span>
        </div>
        <div className="page-heading">
          <div>
            <div className="eyebrow">OBSERVATÓRIO DO VOTO / PANORAMA</div>
            <h1>O país em perspectiva.</h1>
            <p>Resultados, pesquisas e contexto para observar a eleição de perto.</p>
          </div>
        </div>
        <ObservationDesk
          liveStatus="waiting"
          onGo={(tab) => {
            window.location.assign(`/?tab=${tab}`);
          }}
        />
        <p className="fine">
          Os atalhos abrem as seções do app nesta mesma prévia. Esta página apresenta a composição
          visual antes do segundo turno, sem simular resultados ou ativar notificações.
        </p>
      </main>
    </>
  );
}
