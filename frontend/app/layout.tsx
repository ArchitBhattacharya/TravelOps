import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { CrisisProvider } from '@/store/crisisStore';

export const metadata: Metadata = {
  title: 'TravelOps — Travel Crisis Recovery Agent',
  description: 'When your journey breaks, we find another way.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CrisisProvider>
          {/* Background grid pattern */}
          <div className="fixed inset-0 pointer-events-none">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
            {/* Radial gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37,99,235,0.12) 0%, transparent 70%)',
              }}
            />
          </div>

          <Navbar />
          {children}
        </CrisisProvider>
      </body>
    </html>
  );
}
