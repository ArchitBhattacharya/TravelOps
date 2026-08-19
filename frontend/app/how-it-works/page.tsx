import { PageLayout } from '@/components/layout/PageLayout';
import { Card } from '@/components/ui/Card';
import { Search, GitCompare, CheckCircle, RefreshCw } from 'lucide-react';

const STEPS = [
  {
    icon: <Search size={24} className="text-cyan-400" />,
    title: '1. Describe your crisis',
    desc: 'Tell the agent what went wrong — cancelled flight, missed connection, delayed train — and where you need to be.',
  },
  {
    icon: <GitCompare size={24} className="text-blue-400" />,
    title: '2. Agent searches',
    desc: 'TravelOps autonomously searches flights, trains, and buses across multiple providers in real time.',
  },
  {
    icon: <CheckCircle size={24} className="text-green-400" />,
    title: '3. Compare & recommend',
    desc: 'Routes are ranked by your priority — fastest, cheapest, or safest — filtered by budget and deadline.',
  },
  {
    icon: <RefreshCw size={24} className="text-orange-400" />,
    title: '4. Replan on the fly',
    desc: 'If your situation changes mid-journey, hit Replan and the agent adapts instantly.',
  },
];

export default function HowItWorksPage() {
  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-3xl font-bold text-white mb-2">How It Works</h1>
        <p className="text-slate-400 mb-10">TravelOps is an autonomous AI agent that handles travel disruptions so you don&apos;t have to.</p>
        <div className="space-y-4">
          {STEPS.map((s, i) => (
            <Card key={i} padding="md" className="flex gap-4">
              <div className="flex-shrink-0 mt-1">{s.icon}</div>
              <div>
                <h2 className="text-white font-semibold mb-1">{s.title}</h2>
                <p className="text-slate-400 text-sm">{s.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
