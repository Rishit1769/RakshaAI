'use client';

import { cn } from '@/lib/cn';

type LinePoint = {
  label: string;
  value: number;
};

type DualLinePoint = {
  label: string;
  primary: number;
  secondary: number;
};

function buildCoordinates(values: number[], width: number, height: number, padding: number) {
  const max = Math.max(...values, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return values.map((value, index) => {
    const x = padding + (values.length === 1 ? innerWidth / 2 : (index / (values.length - 1)) * innerWidth);
    const y = padding + innerHeight - (value / max) * innerHeight;
    return { x, y, value };
  });
}

function linePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export function DualLineChart({
  data,
  className,
  primaryLabel,
  secondaryLabel,
}: {
  data: DualLinePoint[];
  className?: string;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  const width = 760;
  const height = 280;
  const padding = 24;
  const primaryPoints = buildCoordinates(data.map((item) => item.primary), width, height, padding);
  const secondaryPoints = buildCoordinates(data.map((item) => item.secondary), width, height, padding);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap gap-4 text-xs font-mono uppercase tracking-[0.14em] text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          {primaryLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emergency" />
          {secondaryLabel}
        </span>
      </div>
      <div className="overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface-soft/45 p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-72 min-w-[760px] w-full">
          <defs>
            <linearGradient id="line-primary" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#0052FF" />
              <stop offset="100%" stopColor="#4D7CFF" />
            </linearGradient>
            <linearGradient id="line-secondary" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#d72638" />
              <stop offset="100%" stopColor="#ff7a87" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((step) => (
            <line
              key={step}
              x1={padding}
              x2={width - padding}
              y1={padding + ((height - padding * 2) / 3) * step}
              y2={padding + ((height - padding * 2) / 3) * step}
              stroke="rgba(148,163,184,0.18)"
              strokeDasharray="4 6"
            />
          ))}
          <path d={linePath(primaryPoints)} fill="none" stroke="url(#line-primary)" strokeWidth="4" strokeLinecap="round" />
          <path d={linePath(secondaryPoints)} fill="none" stroke="url(#line-secondary)" strokeWidth="3" strokeLinecap="round" />
          {primaryPoints.map((point, index) => (
            <g key={data[index].label}>
              <circle cx={point.x} cy={point.y} r="4" fill="#0052FF" />
              <circle cx={secondaryPoints[index].x} cy={secondaryPoints[index].y} r="4" fill="#d72638" />
            </g>
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-5 gap-2 text-[11px] text-muted md:grid-cols-10">
        {data.map((item) => (
          <span key={item.label}>{item.label.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

export function BarChart({
  data,
  className,
}: {
  data: LinePoint[];
  className?: string;
}) {
  const width = 760;
  const height = 280;
  const padding = 24;
  const values = data.map((item) => item.value);
  const max = Math.max(...values, 1);
  const innerWidth = width - padding * 2;
  const barWidth = Math.max(12, innerWidth / Math.max(data.length, 1) - 6);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface-soft/45 p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-72 min-w-[760px] w-full">
          <defs>
            <linearGradient id="bar-primary" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#4D7CFF" />
              <stop offset="100%" stopColor="#0052FF" />
            </linearGradient>
          </defs>
          {data.map((item, index) => {
            const x = padding + index * (barWidth + 6);
            const barHeight = ((height - padding * 2) * item.value) / max;
            const y = height - padding - barHeight;
            return <rect key={item.label} x={x} y={y} width={barWidth} height={barHeight} rx="10" fill="url(#bar-primary)" />;
          })}
        </svg>
      </div>
      <div className="grid grid-cols-5 gap-2 text-[11px] text-muted md:grid-cols-10">
        {data.map((item) => (
          <span key={item.label}>{item.label.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}
