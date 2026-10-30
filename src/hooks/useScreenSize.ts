import { useState, useEffect } from 'react';

export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    }
    return 'desktop';
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return screenSize;
};

export const useIsMobile = () => {
  const size = useScreenSize();
  return size === 'mobile';
};

/**
 * Phones (under 640px): pages switched to their desktop layout from 640px (PageLayout
 * desktopFrom="sm") use this instead of useIsMobile, which still means "under md".
 */
export const useIsPhone = () => {
  const [isPhone, setIsPhone] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isPhone;
};

export default useScreenSize;
