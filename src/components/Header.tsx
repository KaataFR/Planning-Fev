import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Settings } from 'lucide-react';
import { useCalendarStore } from '../store/useCalendarStore';
import { ThemeToggle } from './ThemeToggle';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HeaderProps {
  onAddEvent: () => void;
  onOpenSettings: () => void;
}

export function Header({ onAddEvent, onOpenSettings }: HeaderProps) {
  const { view, setView, currentDate, setDate } = useCalendarStore();

  const handlePrev = () => {
    if (view === 'month') setDate(subMonths(currentDate, 1));
    else if (view === 'week') setDate(subWeeks(currentDate, 1));
    else setDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (view === 'month') setDate(addMonths(currentDate, 1));
    else if (view === 'week') setDate(addWeeks(currentDate, 1));
    else setDate(addDays(currentDate, 1));
  };

  const handleToday = () => setDate(new Date());

  const titleFormat = view === 'month' ? 'MMMM yyyy' : view === 'week' ? "'Semaine du' d MMMM" : 'd MMMM yyyy';

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 md:px-6 py-4 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight hidden md:block">Planning</h1>
        </div>

        <div className="flex items-center bg-muted/70 border border-border/70 rounded-full overflow-hidden shadow-sm">
          <button
            onClick={handlePrev}
            className="p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleToday}
            className="px-4 py-2 text-sm font-medium hover:bg-muted/80 border-l border-r border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Aujourd'hui
          </button>
          <button
            onClick={handleNext}
            className="p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-lg font-semibold min-w-[150px] capitalize">
          {format(currentDate, titleFormat, { locale: fr })}
        </h2>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="flex bg-muted/70 rounded-full p-1 border border-border/70 shadow-sm">
          {(['day', 'week', 'month'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                view === v ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>

        <ThemeToggle />

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full hover:bg-muted/70 transition-colors text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          title="Paramètres"
        >
          <Settings className="w-5 h-5" />
        </button>

        <button
          onClick={onAddEvent}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </button>
      </div>
    </header>
  );
}
