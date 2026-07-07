import { useInspection } from '@/store/useInspection';
import { SetupScreen } from '@/components/SetupScreen';
import { CaptureScreen } from '@/components/CaptureScreen';

export default function App() {
  const stage = useInspection((s) => s.stage);
  return stage === 'setup' ? <SetupScreen /> : <CaptureScreen />;
}
