import { PageLayout } from '@/components/layout/PageLayout';
import { RecentRescues } from '@/components/dashboard/RecentRescues';

export default function TripsPage() {
  return (
    <PageLayout>
      <div className="py-8">
        <h1 className="text-2xl font-bold text-white mb-2">My Trips</h1>
        <p className="text-slate-400 text-sm mb-8">Your rescue history.</p>
        <RecentRescues />
      </div>
    </PageLayout>
  );
}
