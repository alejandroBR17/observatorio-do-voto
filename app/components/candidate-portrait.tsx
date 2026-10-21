'use client';
import { useState } from 'react';
import { candidateIdentity } from '@/lib/candidate-identity';

export function CandidatePortrait({ name }: { name: string }) {
  const person = candidateIdentity(name);
  const [failedSource, setFailedSource] = useState('');
  return person && failedSource !== person.photo ? (
    <img
      className="candidate-portrait"
      src={person.photo}
      alt=""
      width="40"
      height="48"
      loading="lazy"
      onError={() => setFailedSource(person.photo)}
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
