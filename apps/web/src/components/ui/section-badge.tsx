import { cn } from '@/lib/cn';

export function SectionBadge({
  label,
  pulse = false,
  className,
}: {
  label: string;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('eyebrow', className)}>
      <span className={cn('h-2 w-2 rounded-full bg-primary', pulse && 'animate-pulse-dot')} />
      <span>{label}</span>
    </div>
  );
}
