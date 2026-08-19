import { PageLayout } from '@/components/layout/PageLayout';
import { HeroSection } from '@/components/dashboard/HeroSection';
import { QuickCrisisGrid } from '@/components/dashboard/QuickCrisisGrid';
import { RecentRescues } from '@/components/dashboard/RecentRescues';

export default function DashboardPage() {
  return (
    <PageLayout>
      <HeroSection />
      <QuickCrisisGrid />
      <RecentRescues />
    </PageLayout>
  );
}
