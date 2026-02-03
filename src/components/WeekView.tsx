import { useCalendarStore } from '../store/useCalendarStore';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  differenceInMinutes,
  startOfDay,
  addMinutes,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { CATEGORY_COLORS, CalendarEvent } from '../types';
import { useMemo } from 'react';
import { useEventDrag } from '../hooks/useEventDrag';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const PIXELS_PER_HOUR = 32;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;

interface WeekViewProps {
  onEventClick: (eventId: string) => void;
  onEventMenu: (eventId: string, x: number, y: number) => void;
  onTimeSlotClick: (date: Date) => void;
  onTimeSlotRightClick: (date: Date) => void;
  onEventRightClick: (eventId: string) => void;
}

export function WeekView({
  onEventClick,
  onEventMenu,
  onTimeSlotClick,
  onTimeSlotRightClick,
  onEventRightClick,
}: WeekViewProps) {
  const { currentDate, events } = useCalendarStore();
  const { handleMouseDown, dragState, getDragStyle, shouldSuppressClick } = useEventDrag({
    pixelsPerMinute: PIXELS_PER_MINUTE,
  });

  const startDate = startOfWeek(currentDate, { locale: fr });
  const endDate = endOfWeek(currentDate, { locale: fr });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekEvents = useMemo(() => {
    return events.filter(
      (e) => (e.start >= startDate && e.start <= endDate) || (e.end >= startDate && e.end <= endDate)
    );
  }, [events, startDate, endDate]);

  const getEventStyle = (event: CalendarEvent) => {
    const startMinutes = differenceInMinutes(event.start, startOfDay(event.start));
    const duration = differenceInMinutes(event.end, event.start);

    return {
      top: `${startMinutes * PIXELS_PER_MINUTE}px`,
      height: `${Math.max(duration, 15) * PIXELS_PER_MINUTE}px`,
    };
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/60">
      <div className="grid grid-cols-8 border-b border-border/60 bg-background/70 backdrop-blur sticky top-0 z-20">
        <div className="w-16 border-r border-border/60"></div>
        {days.map((day) => (
          <div
            key={day.toString()}
            className={`py-2 text-center border-r border-border/60 last:border-r-0 ${
              isSameDay(day, new Date()) ? 'bg-primary/10' : ''
            }`}
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {format(day, 'EEE', { locale: fr })}
            </div>
            <div className={`text-xl font-bold ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto relative custom-scrollbar">
        <div className="grid grid-cols-8 min-h-[768px]">
          <div className="w-16 border-r border-border/60 bg-background/80 z-20 sticky left-0 text-right">
            {HOURS.map((hour) => (
              <div key={hour} className="h-[32px] text-xs text-muted-foreground pr-2 pt-1 border-b border-border/40">
                <span>{format(new Date().setHours(hour, 0), 'HH:mm')}</span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayEvents = weekEvents.filter((e) => isSameDay(e.start, day));
            return (
              <div key={day.toString()} className="relative border-r border-border/60 last:border-r-0 group">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-[32px] border-b border-border/40 hover:bg-muted/40 transition-colors"
                    onClick={() => onTimeSlotClick(addMinutes(startOfDay(day), hour * 60))}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onTimeSlotRightClick(addMinutes(startOfDay(day), hour * 60));
                    }}
                    title="Clic droit pour créer un événement"
                  />
                ))}

                {isSameDay(day, new Date()) && (
                  <div
                    className="absolute w-full border-t-2 border-primary z-30 pointer-events-none"
                    style={{
                      top: `${(new Date().getHours() * 60 + new Date().getMinutes()) * PIXELS_PER_MINUTE}px`,
                    }}
                  >
                    <div className="w-2 h-2 bg-primary rounded-full absolute -left-1 -top-[5px]"></div>
                  </div>
                )}

                {dayEvents.map((event) => {
                  const isDragging = dragState?.event.id === event.id;
                  const style = isDragging ? getDragStyle() : getEventStyle(event);
                  if (!style) return null;

                  const customStyle = event.color
                    ? { ...style, backgroundColor: event.color, borderLeftColor: event.color, color: '#fff' }
                    : style;

                  return (
                    <div
                      key={event.id}
                      style={customStyle}
                      className={`group absolute left-1 right-1 rounded-lg px-2 py-1 text-[11px] border-l-4 overflow-hidden cursor-grab hover:brightness-110 z-10 transition-all shadow-md ${
                        event.color ? '' : CATEGORY_COLORS[event.category]
                      } opacity-90 hover:opacity-100 hover:z-20 ${
                        isDragging ? 'z-50 ring-2 ring-primary ring-offset-2 cursor-grabbing' : ''
                      }`}
                      onClick={(e) => {
                        if (isDragging || shouldSuppressClick()) return;
                        e.stopPropagation();
                        onEventMenu(event.id, e.clientX, e.clientY);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEventRightClick(event.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event.id);
                      }}
                      onMouseDown={(e) => handleMouseDown(e, event, 'move')}
                      title="Glisser pour déplacer. Tirer en bas pour redimensionner."
                    >
                      <div className="font-semibold truncate">{event.title}</div>
                      <div className="opacity-90 truncate">
                        {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                      </div>

                      <div
                        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize bg-black/10 opacity-0 group-hover:opacity-100"
                        onMouseDown={(e) => handleMouseDown(e, event, 'resize')}
                      >
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-1 h-0.5 w-6 rounded-full bg-black/40"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
