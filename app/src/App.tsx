import { useEffect } from 'react';
import { useInspection } from '@/store/useInspection';
import { usePersistence } from '@/store/usePersistence';
import { hydrate, startPersistence } from '@/lib/persistence';
import { SetupScreen } from '@/components/SetupScreen';
import { CaptureScreen } from '@/components/CaptureScreen';

export default function App() {
  const stage = useInspection((s) => s.stage);
  const hydrated = usePersistence((s) => s.hydrated);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void hydrate().then(() => {
      unsubscribe = startPersistence();
    });
    return () => unsubscribe?.();
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="flex flex-col items-center gap-3 text-ink-400">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-ink-200 border-t-brand-500" />
          <span className="text-sm font-medium">Loading inspection…</span>
        </div>
      </div>
    );
  }

  return stage === 'setup' ? <SetupScreen /> : <CaptureScreen />;
}
