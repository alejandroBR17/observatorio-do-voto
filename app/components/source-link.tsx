import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
export function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="source" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={12} />
    </a>
  );
}
