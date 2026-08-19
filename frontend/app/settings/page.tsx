import { PageLayout } from '@/components/layout/PageLayout';
import { Card } from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <PageLayout>
      <div className="max-w-xl mx-auto py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400 mb-8">Preferences and account configuration.</p>
        <Card padding="md">
          <p className="text-slate-400 text-sm">Settings panel coming soon.</p>
        </Card>
      </div>
    </PageLayout>
  );
}
