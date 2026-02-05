import { useCalendarStore } from '../store/useCalendarStore';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  differenceInMinutes,
  startOfDay,
  endOfDay,
  addMinutes,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { getCategoryAccent, getCategoryColorClass, isDefaultCategory, CalendarEvent } from '../types';
import { useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const EVENT_GAP_PX = 6;
const BASE_MIN_EVENT_HEIGHT = 22;
const MIN_PIXELS_PER_HOUR = 30;
const MAX_PIXELS_PER_HOUR = 110;
const ZOOM_STEP = 5;
const UNSCHEDULED_MIME = 'application/x-kplanning-unscheduled';

interface WeekViewProps {
  onEventSelect: (eventId: string) => void;
}

export function WeekView({
  onEventSelect,
}: WeekViewProps) {
  const { currentDate, events, addEvent, unscheduledEvents, removeUnscheduledEvent, timeScale, setTimeScale } =
    useCalendarStore();
  const pixelsPerHour = Math.min(MAX_PIXELS_PER_HOUR, Math.max(MIN_PIXELS_PER_HOUR, timeScale || 80));
  const pixelsPerMinute = pixelsPerHour / 60;
  const gridExtraSpace = Math.round(pixelsPerHour * 2);
  const minEventHeight = Math.max(12, Math.min(BASE_MIN_EVENT_HEIGHT, Math.round(pixelsPerHour * 0.55)));
  const zoomRef = useRef<HTMLDivElement | null>(null);

  const startDate = startOfWeek(currentDate, { locale: fr });
  const endDate = endOfWeek(currentDate, { locale: fr });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekEvents = useMemo(() => {
    return events.filter((e) => e.start <= endDate && e.end >= startDate);
  }, [events, startDate, endDate]);

  useEffect(() => {
    const el = zoomRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey || e.altKey) return;
      const direction = e.deltaY > 0 ? -1 : 1;
      const next = Math.min(
        MAX_PIXELS_PER_HOUR,
        Math.max(MIN_PIXELS_PER_HOUR, pixelsPerHour + direction * ZOOM_STEP)
      );
      if (next === pixelsPerHour) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const pointerMinutes = (window.scrollY + rect.top + offsetY) / pixelsPerMinute;
      const nextPixelsPerMinute = next / 60;
      setTimeScale(next);
      requestAnimationFrame(() => {
        const targetScroll = pointerMinutes * nextPixelsPerMinute - (rect.top + offsetY);
        window.scrollTo({ top: Math.max(0, targetScroll) });
      });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [pixelsPerHour, pixelsPerMinute, setTimeScale]);

  const getEventStyle = (event: CalendarEvent, dayStart: Date, dayEnd: Date) => {
    const clampedStart = event.start < dayStart ? dayStart : event.start;
    const clampedEnd = event.end > dayEnd ? dayEnd : event.end;
    const startMinutes = differenceInMinutes(clampedStart, dayStart);
    const duration = differenceInMinutes(clampedEnd, clampedStart);
    const rawHeight = duration * pixelsPerMinute;
    const height = Math.max(rawHeight - EVENT_GAP_PX, minEventHeight);

    return {
      top: `${startMinutes * pixelsPerMinute}px`,
      height: `${height}px`,
    };
  };

  const getOverlapLayout = (dayEvents: CalendarEvent[], dayStart: Date, dayEnd: Date) => {
    const sorted = [...dayEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
    const layout = new Map<string, { column: number; columns: number }>();
    let clusterEvents: CalendarEvent[] = [];
    let active: Array<{ end: Date; column: number }> = [];
    let clusterEnd: Date | null = null;
    let maxColumns = 0;

    const finalizeCluster = () => {
      if (clusterEvents.length === 0) return;
      for (const evt of clusterEvents) {
        const existing = layout.get(evt.id);
        if (existing) {
          layout.set(evt.id, { ...existing, columns: Math.max(1, maxColumns) });
        }
      }
      clusterEvents = [];
      active = [];
      maxColumns = 0;
      clusterEnd = null;
    };

    for (const event of sorted) {
      const clampedStart = event.start < dayStart ? dayStart : event.start;
      const clampedEnd = event.end > dayEnd ? dayEnd : event.end;
      if (!clusterEnd || clampedStart >= clusterEnd) {
        finalizeCluster();
      }

      if (!clusterEnd || clampedEnd > clusterEnd) {
        clusterEnd = clampedEnd;
      }

      active = active.filter((item) => item.end > clampedStart);
      const usedColumns = new Set(active.map((item) => item.column));
      let column = 0;
      while (usedColumns.has(column)) column += 1;

      active.push({ end: clampedEnd, column });
      maxColumns = Math.max(maxColumns, active.length);
      layout.set(event.id, { column, columns: maxColumns });
      clusterEvents.push(event);
    }

    finalizeCluster();
    return layout;
  };

  return (
    <div className="flex flex-col bg-background/60">
      <div
        ref={zoomRef}
        className="overflow-visible relative custom-scrollbar pb-12"
      >
        <div
          className="grid grid-cols-8"
          style={{ minHeight: `${HOURS.length * pixelsPerHour + gridExtraSpace}px` }}
        >
          <div className="w-16 border-r border-border/60 bg-background/80 z-20 sticky left-0 text-right">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="text-xs text-muted-foreground pr-2 pt-1 border-b border-border/40"
                style={{ height: `${pixelsPerHour}px` }}
              >
                <span>{format(new Date().setHours(hour, 0), 'HH:mm')}</span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            const dayEvents = weekEvents.filter((e) => e.start <= dayEnd && e.end >= dayStart);
            const layout = getOverlapLayout(dayEvents, dayStart, dayEnd);
            return (
              <div
                key={day.toString()}
                className="relative border-r border-border/60 last:border-r-0 group"
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes(UNSCHEDULED_MIME)) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDrop={(e) => {
                  const payload = e.dataTransfer.getData(UNSCHEDULED_MIME);
                  if (!payload) return;
                  e.preventDefault();
                  let data: { id: string } | null = null;
                  try {
                    data = JSON.parse(payload);
                  } catch {
                    data = null;
                  }
                  if (!data?.id) return;
                  const item = unscheduledEvents.find((evt) => evt.id === data?.id);
                  if (!item) return;
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const offsetY = e.clientY - rect.top;
                  const rawMinutes = Math.round(offsetY / pixelsPerMinute / 15) * 15;
                  const minutes = Math.min(Math.max(0, rawMinutes), 24 * 60 - 15);
                  const start = addMinutes(dayStart, minutes);
                  const durationMinutes = Math.max(15, item.durationMinutes || 60);
                  const end = addMinutes(start, durationMinutes);
                  addEvent({
                    id: uuidv4(),
                    title: item.title,
                    category: item.category,
                    start,
                    end,
                    description: item.description,
                    color: item.color,
                    titleColor: item.titleColor,
                  });
                  removeUnscheduledEvent(item.id);
                }}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-border/40 hover:bg-muted/40 transition-colors"
                    style={{ height: `${pixelsPerHour}px` }}
                  />
                ))}

                {isSameDay(day, new Date()) && (
                  <div
                    className="absolute w-full border-t-2 border-primary z-30 pointer-events-none"
                  style={{
                      top: `${(new Date().getHours() * 60 + new Date().getMinutes()) * pixelsPerMinute}px`,
                    }}
                  >
                    <div className="w-2 h-2 bg-primary rounded-full absolute -left-1 -top-[5px]"></div>
                  </div>
                )}

                {dayEvents.map((event) => {
                  const style = getEventStyle(event, dayStart, dayEnd);
                  if (!style) return null;

                  const isDefault = isDefaultCategory(event.category);
                  const accent = getCategoryAccent(event.category);
                  const customStyle = event.color
                    ? { ...style, backgroundColor: event.color, borderLeftColor: event.color }
                    : !isDefault
                    ? { ...style, backgroundColor: accent, borderLeftColor: accent }
                    : style;
                  const titleColor = event.titleColor ?? (event.color || !isDefault ? '#fff' : undefined);
                  const eventLayout = layout.get(event.id) || { column: 0, columns: 1 };
                  const columnWidth = 100 / Math.max(1, eventLayout.columns);
                  const gap = 6;
                  const left = `calc(${columnWidth * eventLayout.column}% + ${gap / 2}px)`;
                  const width = `calc(${columnWidth}% - ${gap}px)`;

                  return (
                    <div
                      key={event.id}
                      style={{ ...customStyle, left, width }}
                      className={`group absolute rounded-none box-border px-2 py-0.5 text-[11px] border-l-4 overflow-hidden cursor-pointer hover:brightness-110 z-10 transition-all shadow-md ${
                        event.color || !isDefault ? '' : getCategoryColorClass(event.category)
                      } opacity-90 hover:opacity-100 hover:z-20`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventSelect(event.id);
                      }}
                      title="Cliquez pour voir les détails"
                    >
                      <div className="font-semibold truncate" style={titleColor ? { color: titleColor } : undefined}>
                        {event.title}
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
