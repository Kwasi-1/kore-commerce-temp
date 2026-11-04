import { useEffect, useState } from 'react';

/** Same query as the `short:` Tailwind variant: a phone on its side (wide, under 500px tall) */
export const SHORT_SCREEN_QUERY = '(max-height: 500px) and (min-width: 640px)';

export function useIsShortScreen() {
  const [isShort, setIsShort] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(SHORT_SCREEN_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(SHORT_SCREEN_QUERY);
    const onChange = () => setIsShort(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isShort;
}
