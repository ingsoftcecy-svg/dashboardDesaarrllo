interface Props {
  value: number; // 0-5
  max?: number;
  label?: string;
}

export function AutonomyGauge({ value, max = 5, label }: Props) {
  const pct = Math.min(value / max, 1);
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} stroke="#e2e8f0" strokeWidth="12" fill="none" />
        <circle
          cx="70"
          cy="70"
          r={r}
          stroke="url(#goldGrad)"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-blue-900">{value.toFixed(2)}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">/ {max.toFixed(2)}</span>
      </div>
      {label && <div className="mt-2 text-xs font-medium text-slate-600">{label}</div>}
    </div>
  );
}
