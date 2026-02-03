import { Moon, Sun } from 'lucide-react';
import { useCalendarStore } from '../store/useCalendarStore';

export function ThemeToggle() {
  const { theme, setTheme } = useCalendarStore();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-full hover:bg-muted/70 transition-colors text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      title={theme === 'dark' ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
