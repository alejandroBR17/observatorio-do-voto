'use client';
import { useState } from 'react';
import { candidateIdentity } from '@/lib/candidate-identity';

export function CandidatePortrait({ name }: { name: string }) {
  const person = candidateIdentity(name);
  const [failed, setFailed] = useState(false);
  return person && !failed ? (
    <img
      className="candidate-portrait"
      src={person.photo}
      alt=""
      width="40"
      height="48"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <span className="candidate-portrait-fallback" aria-label="Retrato indisponível">
      {name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')}
    </span>
  );
}
