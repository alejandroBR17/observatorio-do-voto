'use client';

import { Analytics } from '@vercel/analytics/next';
import { useEffect, useState } from 'react';
import { readPrivacyChoice, privacyChoiceEvent } from '@/lib/privacy-choices';

export function SiteAnalytics() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const update = () => setEnabled(!!readPrivacyChoice('analytics'));
    update();
    window.addEventListener(privacyChoiceEvent, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(privacyChoiceEvent, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  if (!enabled) return null;
  return (
    <Analytics
      beforeSend={(event) => {
        if (!readPrivacyChoice('analytics')) return null;
        if (event.type !== 'pageview') return null;
        try {
          const url = new URL(event.url);
          // Count visits without sending filters, URL fragments or personal query values.
          url.search = '';
          url.hash = '';
          return { ...event, url: url.href };
        } catch {
          return null;
        }
      }}
    />
  );
}
