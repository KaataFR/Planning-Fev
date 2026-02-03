export type Category = 'work' | 'sleep' | 'meal' | 'sport' | 'leisure' | 'other';

export type ViewType = 'day' | 'week' | 'month';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  category: Category;
  description?: string;
  allDay?: boolean;
  color?: string; // custom color override (hex)
}

export const CATEGORY_COLORS: Record<Category, string> = {
  work: 'bg-blue-600 text-white',
  sleep: 'bg-indigo-500 text-white',
  meal: 'bg-amber-500 text-black',
  sport: 'bg-emerald-500 text-white',
  leisure: 'bg-pink-500 text-white',
  other: 'bg-slate-500 text-white',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  work: 'Travail',
  sleep: 'Sommeil',
  meal: 'Repas',
  sport: 'Sport',
  leisure: 'Loisir',
  other: 'Autre',
};
