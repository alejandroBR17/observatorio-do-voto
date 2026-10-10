'use client';

import { Analytics } from '@vercel/analytics/next';

export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
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
