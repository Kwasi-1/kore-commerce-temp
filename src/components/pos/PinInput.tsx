import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (pin: string) => void;
  /** Called once all four digits are in */
  onComplete?: (pin: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

// Stop browser and extension password managers from filling or saving PINs: a saved PIN that
// fills itself in lets anyone at the till sign in or approve as that person.
const NO_AUTOFILL = {
  autoComplete: 'one-time-code',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
} as const;

/**
 * Four one-digit boxes for a till PIN. Password managers don't treat single-character boxes as a
 * password field, unlike one 4-character password input.
 */
export default function PinInput({ value, onChange, onComplete, error, autoFocus, disabled }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = [0, 1, 2, 3].map((i) => value[i] || '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setDigits = (next: string[]) => {
    const pin = next.join('').slice(0, 4);
    onChange(pin);
    if (pin.length === 4) onComplete?.(pin);
  };

  const handleChange = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, '');
    if (!typed) {
      const next = [...digits];
      next[i] = '';
      setDigits(next);
      return;
    }
    // Pasting or fast typing can put several digits in one box: spread them forward
    const next = [...digits];
    typed.split('').forEach((d, k) => {
      if (i + k < 4) next[i + k] = d;
    });
    setDigits(next);
    refs.current[Math.min(i + typed.length, 3)]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = [...digits];
      next[i - 1] = '';
      setDigits(next);
      refs.current[i - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="password"
          inputMode="numeric"
          maxLength={4}
          name={`pin-digit-${i}`}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`PIN digit ${i + 1}`}
          {...NO_AUTOFILL}
          className={cn(
            'w-14 h-14 text-center text-2xl font-bold rounded-xl border bg-background transition-all focus:outline-none',
            error ? 'border-destructive bg-destructive/5 text-destructive' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary'
          )}
        />
      ))}
    </div>
  );
}
