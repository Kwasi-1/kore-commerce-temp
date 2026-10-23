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
// fills itself in lets anyone at the till sign in or approve as that person. The boxes are plain
// text inputs that display a dot per digit (the digits live in state): browsers only offer saved
// logins for password-type inputs, and ignore autocomplete hints once they see one.
const MASK = '•';
const NO_AUTOFILL = {
  autoComplete: 'off',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
} as const;

/** Four one-digit boxes for a till PIN, masked with dots and invisible to password managers. */
export default function PinInput({ value, onChange, onComplete, error, autoFocus, disabled }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // Random field names so browsers have no saved history to suggest
  const nameSuffix = useRef(Math.random().toString(36).slice(2, 8)).current;
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
    const typed = raw.replace(new RegExp(MASK, 'g'), '').replace(/\D/g, '');
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
          type="text"
          inputMode="numeric"
          maxLength={5}
          name={`code-${i}-${nameSuffix}`}
          value={d ? MASK : ''}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`PIN digit ${i + 1}`}
          {...NO_AUTOFILL}
          className={cn(
            'w-14 h-14 text-center text-2xl font-bold rounded-lg border bg-background transition-all focus:outline-none outline-none ring-0',
            error ? 'border-destructive bg-destructive/5 text-destructive' : 'border-border focus:border-foreground focus:ring-0'
          )}
        />
      ))}
    </div>
  );
}
