import { useEffect } from 'react';
import { useCalendarStore } from '../store/useCalendarStore';

export function useThemeEffect() {
  const theme = useCalendarStore((state) => state.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);
}
