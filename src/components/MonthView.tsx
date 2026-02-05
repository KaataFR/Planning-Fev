import { useCalendarStore } from '../store/useCalendarStore';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { getCategoryAccent, getCategoryColorClass, isDefaultCategory } from '../types';

interface MonthViewProps {
  onEventMenu: (eventId: string, x: number, y: number) => void;
  onEventSelect: (eventId: string) => void;
  onDayClick: (date: Date) => void;
  onDayRightClick: (date: Date) => void;
}

export function MonthView({ onEventMenu, onEventSelect, onDayClick, onDayRightClick }: MonthViewProps) {
  const { currentDate, events } = useCalendarStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: fr });
  const endDate = endOfWeek(monthEnd, { locale: fr });

  const dateFormat = 'd';
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="flex flex-col h-full bg-background/60">
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40 backdrop-blur">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-muted-foreground border-r border-border/60 last:border-r-0 uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-6 gap-2 p-2 bg-muted/20">
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(e.start, day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`group rounded-xl border border-border/60 p-2 flex flex-col transition-all cursor-pointer hover:shadow-md hover:-translate-y-[1px] ${
                !isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : 'bg-card/80'
              } ${isToday ? 'ring-2 ring-primary/30' : ''}`}
              onClick={() => onDayClick(day)}
              onContextMenu={(e) => {
                e.preventDefault();
                onDayRightClick(day);
              }}
              title="Clic droit pour créer un événement"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : 'bg-muted/60 text-foreground'
                  }`}
                >
                  {format(day, dateFormat)}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    {dayEvents.length} év.
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 mt-2 overflow-y-auto flex-1 custom-scrollbar">
                {dayEvents.map((event) => {
                  const isDefault = isDefaultCategory(event.category);
                  const accent = getCategoryAccent(event.category);
                  const customStyle = event.color
                    ? { backgroundColor: event.color, borderLeftColor: event.color }
                    : !isDefault
                    ? { backgroundColor: accent, borderLeftColor: accent }
                    : undefined;
                  const titleColor = event.titleColor ?? (event.color || !isDefault ? '#fff' : undefined);

                  return (
                    <div
                      key={event.id}
                      style={customStyle}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventSelect(event.id);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEventMenu(event.id, e.clientX, e.clientY);
                      }}
                      className={`text-[11px] px-2 py-1 rounded-none shadow-sm truncate cursor-context-menu hover:opacity-90 border-l-4 ${
                        event.color || !isDefault ? '' : getCategoryColorClass(event.category)
                      }`}
                      title={event.title}
                    >
                      <span className="font-semibold" style={titleColor ? { color: titleColor } : undefined}>
                        {event.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
