import { requirePageSession } from '@/lib/auth';
import Settings from '@/components/Settings';

export default async function SettingsPage() {
  await requirePageSession();
  return <Settings />;
}
