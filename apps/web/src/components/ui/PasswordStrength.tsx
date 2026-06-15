'use client';

interface PasswordStrengthProps {
  password: string;
}

function getStrength(password: string): { score: number; label: string; color: string; bg: string } {
  if (!password) return { score: 0, label: '', color: '', bg: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'var(--color-emergency)', bg: 'var(--color-emergency)' };
  if (score <= 4) return { score, label: 'Fair', color: 'var(--color-warning)', bg: 'var(--color-warning)' };
  if (score === 5) return { score, label: 'Good', color: 'var(--color-safe)', bg: 'var(--color-safe)' };
  return { score, label: 'Strong', color: 'var(--color-safe)', bg: 'var(--color-safe)' };
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label, color, bg } = getStrength(password);
  if (!password) return null;

  const segments = 4;
  const filled = Math.ceil((score / 6) * segments);

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {Array.from({ length: segments }).map((_, index) => (
          <div key={index} className="h-1 flex-1 rounded-full" style={{ background: index < filled ? bg : 'var(--color-border-soft)' }} />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color }}>
        {label} password
      </p>
    </div>
  );
}
