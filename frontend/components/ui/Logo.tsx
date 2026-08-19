import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export function Logo({ size = 'md', showTagline = false }: LogoProps) {
  const sizes = {
    sm: { icon: 20, text: 'text-lg', tagline: 'text-xs' },
    md: { icon: 28, text: 'text-xl', tagline: 'text-xs' },
    lg: { icon: 40, text: 'text-3xl', tagline: 'text-sm' },
  };

  const s = sizes[size];

  return (
    <div className="flex items-center gap-3">
      {/* Route-path logo mark */}
      <svg width={s.icon} height={s.icon} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer ring */}
        <circle cx="16" cy="16" r="15" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.4" />
        {/* Route path */}
        <path
          d="M6 22 C6 22 8 10 16 10 C24 10 26 22 26 22"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Origin dot */}
        <circle cx="6" cy="22" r="2.5" fill="#f97316" />
        {/* Destination dot */}
        <circle cx="26" cy="22" r="2.5" fill="#4ade80" />
        {/* Waypoint */}
        <circle cx="16" cy="10" r="2" fill="#22d3ee" />
        {/* Center pulse */}
        <circle cx="16" cy="16" r="1.5" fill="#2563eb" opacity="0.8" />
      </svg>

      <div>
        <div className={`${s.text} font-bold tracking-tight`}>
          <span className="text-white">Travel</span>
          <span className="text-cyan-400">Ops</span>
        </div>
        {showTagline && (
          <p className={`${s.tagline} text-slate-400 leading-tight mt-0.5`}>
            When your journey breaks, we find another way.
          </p>
        )}
      </div>
    </div>
  );
}
