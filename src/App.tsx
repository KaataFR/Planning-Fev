import { useEffect, useMemo, useState } from 'react';
import { useCalendarStore } from './store/useCalendarStore';
import { Header } from './components/Header';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { DayView } from './components/DayView';
import { EventModal } from './components/EventModal';
import { SettingsModal } from './components/SettingsModal';
import { EventDetailsModal } from './components/EventDetailsModal';
import { useThemeEffect } from './hooks/useThemeEffect';
import { format, isAfter, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './types';
import { Clock } from 'lucide-react';

function formatCountdown(ms: number) {
  if (ms <= 0) return 'Maintenant';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function App() {
  useThemeEffect();
  const { view, setView, setDate, events } = useCalendarStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailsEventId, setDetailsEventId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [menuState, setMenuState] = useState<{ eventId: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleAddEvent = () => {
    setSelectedDate(new Date());
    setSelectedEventId(null);
    setIsModalOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setDate(date);
    setView('day');
  };

  const handleTimeSlotClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEventId(null);
    setIsModalOpen(true);
  };

  const handleQuickCreate = (date: Date) => {
    const withTime = new Date(date);
    if (Number.isNaN(withTime.getTime())) return;
    if (withTime.getHours() === 0 && withTime.getMinutes() === 0) {
      withTime.setHours(9, 0, 0, 0);
    }
    setSelectedDate(withTime);
    setSelectedEventId(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedDate(null);
    setIsModalOpen(true);
  };

  const handleEventMenu = (eventId: string, x: number, y: number) => {
    const menuWidth = 220;
    const menuHeight = 120;
    const maxX = Math.max(8, window.innerWidth - menuWidth - 8);
    const maxY = Math.max(8, window.innerHeight - menuHeight - 8);
    setMenuState({ eventId, x: Math.min(x, maxX), y: Math.min(y, maxY) });
  };

  const nextEvent = useMemo(() => {
    const futureEvents = events.filter((e) => isAfter(e.start, now));
    futureEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
    return futureEvents[0];
  }, [events, now]);

  const currentEvent = useMemo(() => {
    return events.find((e) => e.start <= now && e.end >= now) || null;
  }, [events, now]);

  const countdown = nextEvent ? formatCountdown(nextEvent.start.getTime() - now.getTime()) : 'Aucun';

  return (
    <div className="w-full flex justify-center gap-6 px-4">
      <aside className="hidden xl:flex flex-col gap-4 w-64 pt-8">
        <div className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur p-4 shadow-lg">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Événement en cours</div>
          {currentEvent ? (
            <div className="mt-2">
              <div className="text-lg font-semibold truncate">{currentEvent.title}</div>
              <div className="text-sm text-muted-foreground">
                {format(currentEvent.start, 'HH:mm')} - {format(currentEvent.end, 'HH:mm')}
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        ((now.getTime() - currentEvent.start.getTime()) /
                          (currentEvent.end.getTime() - currentEvent.start.getTime())) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Aucun événement</div>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur p-4 shadow-lg">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Prochain événement</div>
          {nextEvent ? (
            <div className="mt-2">
              <div className="text-lg font-semibold truncate">{nextEvent.title}</div>
              <div className="text-sm text-muted-foreground">
                {format(nextEvent.start, 'EEEE d MMMM', { locale: fr })} • {format(nextEvent.start, 'HH:mm')}
              </div>
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Départ dans </span>
                <span className="font-semibold text-primary">{countdown}</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Aucun événement</div>
          )}
        </div>
      </aside>

      <div className="flex-1">
        <div className="flex flex-col min-h-screen w-full max-w-[1100px] xl:max-w-[1200px] mx-auto bg-background/80 text-foreground overflow-hidden border border-border/60 shadow-2xl rounded-2xl md:rounded-3xl backdrop-blur-xl">
          {nextEvent && isToday(nextEvent.start) && (
            <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-6 py-2.5 flex items-center gap-3 border-b border-border/60 text-sm backdrop-blur">
              <span className="font-bold text-primary flex items-center gap-1">
                <Clock className="w-4 h-4" /> Prochain événement :
              </span>
              <span className="font-semibold">{format(nextEvent.start, 'HH:mm')}</span>
              <span>{nextEvent.title}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${CATEGORY_COLORS[
                  nextEvent.category
                ].replace('text-white', 'text-white/90')}`}
              >
                {CATEGORY_LABELS[nextEvent.category]}
              </span>
            </div>
          )}

          <Header onAddEvent={handleAddEvent} onOpenSettings={() => setIsSettingsOpen(true)} />

          <main className="flex-1 overflow-hidden relative">
            {view === 'month' && (
              <MonthView
                onEventClick={handleEventClick}
                onEventMenu={handleEventMenu}
                onDayClick={handleDayClick}
                onDayRightClick={handleQuickCreate}
              />
            )}
            {view === 'week' && (
              <WeekView
                onEventClick={handleEventClick}
                onEventMenu={handleEventMenu}
                onTimeSlotClick={handleTimeSlotClick}
                onTimeSlotRightClick={handleQuickCreate}
                onEventRightClick={handleEventClick}
              />
            )}
            {view === 'day' && (
              <DayView
                onEventClick={handleEventClick}
                onEventMenu={handleEventMenu}
                onTimeSlotClick={handleTimeSlotClick}
                onTimeSlotRightClick={handleQuickCreate}
                onEventRightClick={handleEventClick}
              />
            )}
          </main>

          <EventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            selectedDate={selectedDate}
            selectedEventId={selectedEventId}
          />

          <EventDetailsModal
            isOpen={!!detailsEventId}
            onClose={() => setDetailsEventId(null)}
            eventId={detailsEventId}
          />

          <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

          {menuState && (
            <div
              className="fixed inset-0 z-50"
              onClick={() => setMenuState(null)}
            >
              <div
                className="absolute bg-background/95 border border-border/70 rounded-xl shadow-xl p-2 text-sm"
                style={{ left: menuState.x, top: menuState.y, width: 220 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/60"
                  onClick={() => {
                    setDetailsEventId(menuState.eventId);
                    setMenuState(null);
                  }}
                >
                  Lire la description
                </button>
                <button
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/60"
                  onClick={() => {
                    handleEventClick(menuState.eventId);
                    setMenuState(null);
                  }}
                >
                  Modifier l'événement
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="hidden xl:flex flex-col gap-4 w-64 pt-8">
        <div className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur p-4 shadow-lg">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Résumé</div>
          <div className="mt-2 text-sm text-muted-foreground">Vue {view === 'week' ? 'semaine' : view === 'day' ? 'jour' : 'mois'}</div>
          <div className="mt-2 text-sm text-muted-foreground">Événements: {events.length}</div>
        </div>
      </aside>
    </div>
  );
}

export default App;
