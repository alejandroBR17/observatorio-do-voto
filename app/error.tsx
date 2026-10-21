'use client';
import { RecoveryScreen } from './components/recovery-screen';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <RecoveryScreen kind="error" onRetry={reset} />;
}
