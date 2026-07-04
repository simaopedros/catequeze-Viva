import { useEffect, useState } from 'react';

function getIsVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return !document.hidden;
}

export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(getIsVisible);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(getIsVisible());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
