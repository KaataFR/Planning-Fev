import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CalendarEvent, ViewType, DEFAULT_CATEGORIES, UnscheduledEvent } from '../types';
import { addDays, isSameDay, startOfDay, startOfToday } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const getEndOfDayMinute = (date: Date) => {
  const end = new Date(date);
  end.setHours(23, 59, 0, 0);
  return end;
};

const splitEventByDay = (event: CalendarEvent) => {
  const startDay = startOfDay(event.start);
  const endDay = startOfDay(event.end);
  if (isSameDay(startDay, endDay)) {
    return [event];
  }

  const splitId = event.splitId ?? event.id;
  const segments: CalendarEvent[] = [];
  let cursor = startDay;

  while (cursor.getTime() <= endDay.getTime()) {
    const isFirstDay = isSameDay(cursor, startDay);
    const isLastDay = isSameDay(cursor, endDay);
    const segmentStart = isFirstDay ? event.start : startOfDay(cursor);
    const segmentEnd = isLastDay ? event.end : getEndOfDayMinute(cursor);
    if (segmentEnd > segmentStart) {
      const reuseId = isSameDay(cursor, startOfDay(event.start));
      segments.push({
        ...event,
        id: reuseId ? event.id : uuidv4(),
        start: segmentStart,
        end: segmentEnd,
        splitId,
      });
    }
    cursor = addDays(cursor, 1);
  }

  return segments;
};

const normalizeEvents = (items: CalendarEvent[]) =>
  items.flatMap((event) => splitEventByDay(event));

const normalizeCategories = (items: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  items.forEach((item) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  });
  return result;
};

interface CalendarState {
  events: CalendarEvent[];
  view: ViewType;
  currentDate: Date;
  theme: 'light' | 'dark';
  timeScale: number;
  customCategories: string[];
  unscheduledEvents: UnscheduledEvent[];
  setTheme: (theme: 'light' | 'dark') => void;
  setView: (view: ViewType) => void;
  setDate: (date: Date) => void;
  setTimeScale: (scale: number) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (event: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
  importEvents: (events: CalendarEvent[]) => void;
  addCategory: (name: string) => void;
  removeCategory: (name: string) => void;
  renameCategory: (from: string, to: string) => void;
  addUnscheduledEvent: (event: UnscheduledEvent) => void;
  removeUnscheduledEvent: (id: string) => void;
  updateUnscheduledEvent: (event: UnscheduledEvent) => void;
  setCustomCategories: (items: string[]) => void;
  setUnscheduledEvents: (items: UnscheduledEvent[]) => void;
  importData: (payload: {
    events: CalendarEvent[];
    customCategories?: string[];
    unscheduledEvents?: UnscheduledEvent[];
  }) => void;
}

const dateReviver = (key: string, value: unknown) => {
  if (key === 'start' || key === 'end' || key === 'currentDate') {
    return new Date(value as string);
  }
  return value;
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      events: [],
      view: 'week',
      currentDate: startOfToday(),
      theme: 'light', 
      timeScale: 80,
      customCategories: [],
      unscheduledEvents: [],
      setTheme: (theme) => set({ theme }),
      setView: (view) => set({ view }),
      setDate: (date) => set({ currentDate: date }),
      setTimeScale: (scale) => set({ timeScale: scale }),
      addEvent: (event) =>
        set((state) => ({
          events: [...state.events, ...splitEventByDay(event)],
        })),
      updateEvent: (updatedEvent) =>
        set((state) => {
          const baseEvents = state.events.filter((e) => e.id !== updatedEvent.id);
          return {
            events: [...baseEvents, ...splitEventByDay(updatedEvent)],
          };
        }),
      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        })),
      importEvents: (newEvents) => set({ events: normalizeEvents(newEvents) }),
      addCategory: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const exists = state.customCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase());
          if (exists) return state;
          return { customCategories: [...state.customCategories, trimmed] };
        }),
      removeCategory: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const lower = trimmed.toLowerCase();
          const nextCategories = state.customCategories.filter(
            (cat) => cat.toLowerCase() !== lower
          );
          if (nextCategories.length === state.customCategories.length) return state;
          return {
            customCategories: nextCategories,
            events: state.events.map((event) =>
              event.category.toLowerCase() === lower ? { ...event, category: 'other' } : event
            ),
          };
        }),
      renameCategory: (from, to) =>
        set((state) => {
          const oldName = from.trim();
          const newName = to.trim();
          if (!oldName || !newName) return state;
          const oldLower = oldName.toLowerCase();
          const newLower = newName.toLowerCase();
          if (oldLower === newLower) return state;

          const isDefaultTarget = DEFAULT_CATEGORIES.some(
            (cat) => cat.toLowerCase() === newLower
          );
          const filtered = state.customCategories.filter(
            (cat) => cat.toLowerCase() !== oldLower
          );
          const exists = filtered.some((cat) => cat.toLowerCase() === newLower);
          const nextCategories = isDefaultTarget || exists ? filtered : [...filtered, newName];

          return {
            customCategories: nextCategories,
            events: state.events.map((event) =>
              event.category.toLowerCase() === oldLower ? { ...event, category: newName } : event
            ),
          };
        }),
      addUnscheduledEvent: (event) =>
        set((state) => ({ unscheduledEvents: [...state.unscheduledEvents, event] })),
      removeUnscheduledEvent: (id) =>
        set((state) => ({
          unscheduledEvents: state.unscheduledEvents.filter((item) => item.id !== id),
        })),
      updateUnscheduledEvent: (updated) =>
        set((state) => ({
          unscheduledEvents: state.unscheduledEvents.map((item) =>
            item.id === updated.id ? updated : item
          ),
        })),
      setCustomCategories: (items) =>
        set(() => ({
          customCategories: normalizeCategories(items),
        })),
      setUnscheduledEvents: (items) =>
        set(() => ({
          unscheduledEvents: items,
        })),
      importData: (payload) =>
        set(() => ({
          events: normalizeEvents(payload.events),
          customCategories: normalizeCategories(payload.customCategories ?? []),
          unscheduledEvents: payload.unscheduledEvents ?? [],
        })),
    }),
    {
      name: 'calendar-storage',
      storage: createJSONStorage(() => localStorage, { reviver: dateReviver }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.events = normalizeEvents(state.events);
      },
    }
  )
);
