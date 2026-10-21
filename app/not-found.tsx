import { RecoveryScreen } from './components/recovery-screen';
export default function NotFound() {
  return (
    <RecoveryScreen
      kind="missing"
      home={process.env.VERCEL_ENV === 'preview' ? '/identidade' : '/'}
    />
  );
}
