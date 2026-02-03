import { useCalendarStore } from '../store/useCalendarStore';
import { format, isSameDay, differenceInMinutes, startOfDay, addMinutes } from 'date-fns';
import { CATEGORY_COLORS, CalendarEvent } from '../types';
import { useMemo } from 'react';
import { fr } from 'date-fns/locale';
import { useEventDrag } from '../hooks/useEventDrag';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const PIXELS_PER_HOUR = 32;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;

interface DayViewProps {
  onEventClick: (eventId: string) => void;
  onEventMenu: (eventId: string, x: number, y: number) => void;
  onTimeSlotClick: (date: Date) => void;
  onTimeSlotRightClick: (date: Date) => void;
  onEventRightClick: (eventId: string) => void;
}

export function DayView({ onEventClick, onEventMenu, onTimeSlotClick, onTimeSlotRightClick, onEventRightClick }: DayViewProps) {
  const { currentDate, events } = useCalendarStore();
  const { handleMouseDown, dragState, getDragStyle, shouldSuppressClick } = useEventDrag({
    pixelsPerMinute: PIXELS_PER_MINUTE,
  });

  const dayEvents = useMemo(() => {
    return events.filter((e) => isSameDay(e.start, currentDate));
  }, [events, currentDate]);

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
      <div className="flex flex-col border-b border-border/60 bg-background/70 backdrop-blur z-10 p-4">
        <h2 className="text-2xl font-bold capitalize text-primary">
          {format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto relative custom-scrollbar">
        <div className="grid grid-cols-[80px_1fr] min-h-[768px]">
          <div className="border-r border-border/60 bg-background/80 z-20 text-right sticky left-0">
            {HOURS.map((hour) => (
              <div key={hour} className="h-[32px] text-xs text-muted-foreground pr-4 pt-1 border-b border-border/40">
                <span>{format(new Date().setHours(hour, 0), 'HH:mm')}</span>
              </div>
            ))}
          </div>

          <div className="relative group">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[32px] border-b border-border/40 hover:bg-muted/40 transition-colors"
                onClick={() => onTimeSlotClick(addMinutes(startOfDay(currentDate), hour * 60))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onTimeSlotRightClick(addMinutes(startOfDay(currentDate), hour * 60));
                }}
                title="Clic droit pour créer un événement"
              />
            ))}

            {isSameDay(currentDate, new Date()) && (
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
                  className={`group absolute left-2 right-2 rounded-xl px-4 py-2 border-l-4 overflow-hidden cursor-grab hover:brightness-110 z-10 transition-all shadow-lg ${
                    event.color ? '' : CATEGORY_COLORS[event.category]
                  } hover:z-20 ${isDragging ? 'z-50 ring-2 ring-primary ring-offset-2 cursor-grabbing' : ''}`}
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
                  <div className="font-bold text-base truncate">{event.title}</div>
                  <div className="opacity-90 text-sm flex gap-2 truncate">
                    <span>
                      {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                    </span>
                    {event.description && <span>• {event.description}</span>}
                  </div>

                  <div
                    className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize bg-black/10 opacity-0 group-hover:opacity-100"
                    onMouseDown={(e) => handleMouseDown(e, event, 'resize')}
                  >
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-1 h-0.5 w-8 rounded-full bg-black/40"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
