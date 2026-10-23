import { useEffect, useRef, useState } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** Called with the PIN as soon as the 4th digit is in */
  onComplete: (pin: string) => void;
  error?: string | null;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/**
 * Sign-in PIN pad for the till: four dots and a touch keypad, submitting on the 4th digit.
 * Also takes digits and Backspace from a physical keyboard. No input element, so nothing for a
 * browser to autofill. (NumPad is the general-purpose pad with a ✓ key, used for amounts.)
 */
export default function PinPad({ onComplete, error, disabled }: Props) {
  const [pin, setPin] = useState('');

  const press = (key: string) => {
    if (disabled) return;
    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) setTimeout(() => onComplete(next), 80); // let the 4th dot show first
  };

  // A wrong PIN clears the dots so they can try again
  useEffect(() => {
    if (error) setPin('');
  }, [error]);

  // Physical keyboard: always call the latest press() (it sees the current props)
  const pressRef = useRef(press);
  pressRef.current = press;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) pressRef.current(e.key);
      else if (e.key === 'Backspace') pressRef.current('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The error shows until they start typing again
  const showError = !!error && pin.length === 0;

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex justify-center gap-4 h-6 items-center" aria-label={`${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-3.5 w-3.5 rounded-full transition-colors',
              showError ? 'bg-destructive' : i < pin.length ? 'bg-foreground' : 'bg-muted-foreground/25'
            )}
          />
        ))}
      </div>
      <p className={cn('h-5 mt-3 mb-4 text-center text-[13px]', showError ? 'text-destructive' : 'text-transparent')}>{showError ? error : '.'}</p>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(key)}
              disabled={disabled}
              aria-label={key === 'del' ? 'Delete' : key}
              className="h-14 rounded-xl text-2xl font-medium text-foreground hover:bg-muted active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center"
            >
              {key === 'del' ? <Delete className="h-6 w-6 text-muted-foreground" /> : key}
            </button>
          )
        )}
      </div>
    </div>
  );
}
