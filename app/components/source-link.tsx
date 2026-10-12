import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
export function Source({
  href,
  children,
  iconSize = 12,
}: {
  href: string;
  children: ReactNode;
  iconSize?: number;
}) {
  return (
    <a className="source" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={iconSize} />
    </a>
  );
}
