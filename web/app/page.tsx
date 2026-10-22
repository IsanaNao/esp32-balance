import { requirePageSession } from '@/lib/auth';
import Dashboard from '@/components/Dashboard';

export default async function Home() {
  await requirePageSession();
  return <Dashboard />;
}
