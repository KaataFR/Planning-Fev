import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CalendarEvent, ViewType } from '../types';
import { startOfToday } from 'date-fns';

interface CalendarState {
  events: CalendarEvent[];
  view: ViewType;
  currentDate: Date;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  setView: (view: ViewType) => void;
  setDate: (date: Date) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (event: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
  importEvents: (events: CalendarEvent[]) => void;
}

const storage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    return JSON.parse(str, (key, value) => {
      if (key === 'start' || key === 'end' || key === 'currentDate') {
        return new Date(value);
      }
      return value;
    });
  },
  setItem: (name: string, value: any) => {
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name: string) => localStorage.removeItem(name),
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      events: [],
      view: 'week',
      currentDate: startOfToday(),
      theme: 'light', 
      setTheme: (theme) => set({ theme }),
      setView: (view) => set({ view }),
      setDate: (date) => set({ currentDate: date }),
      addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
      updateEvent: (updatedEvent) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.id === updatedEvent.id ? updatedEvent : e
          ),
        })),
      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        })),
      importEvents: (newEvents) => set({ events: newEvents }),
    }),
    {
      name: 'calendar-storage',
      storage: createJSONStorage(() => storage),
    }
  )
);
