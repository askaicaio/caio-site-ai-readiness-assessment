import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-2.5">
        <span className="kicker text-slate-500">Progress</span>
        <span className="text-xs text-slate-400 tabular">{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)',
            boxShadow: '0 0 14px rgba(129,140,248,0.55)',
          }}
        />
      </div>
    </div>
  );
};
