import { cn } from '@/lib/cn';

interface FilterOption {
  label: string;
  value: string;
}

export function FilterPills({
  options,
  selectedValue,
  onChange,
  className,
}: {
  options: FilterOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('nav-pill-group', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={selectedValue === option.value ? 'nav-pill-active' : 'nav-pill'}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
