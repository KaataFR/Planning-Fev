export type Category = string;

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
  titleColor?: string; // custom title color (hex)
  tags?: string[];
  splitId?: string;
}

export interface UnscheduledEvent {
  id: string;
  title: string;
  category: Category;
  durationMinutes: number;
  description?: string;
  color?: string;
  titleColor?: string;
}

export const DEFAULT_CATEGORIES = ['work', 'sleep', 'meal', 'sport', 'leisure', 'other'] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  work: 'bg-blue-600 text-white',
  sleep: 'bg-indigo-500 text-white',
  meal: 'bg-amber-500 text-black',
  sport: 'bg-emerald-500 text-white',
  leisure: 'bg-pink-500 text-white',
  other: 'bg-slate-500 text-white',
};

export const CATEGORY_LABELS: Record<string, string> = {
  work: 'Travail',
  sleep: 'Sommeil',
  meal: 'Repas',
  sport: 'Sport',
  leisure: 'Loisir',
  other: 'Autre',
};

export const CATEGORY_ACCENTS: Record<string, string> = {
  work: '#2563eb',
  sleep: '#6366f1',
  meal: '#f59e0b',
  sport: '#10b981',
  leisure: '#ec4899',
  other: '#64748b',
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getCategoryLabel = (category: string) => CATEGORY_LABELS[category] ?? category;

export const getCategoryColorClass = (category: string) =>
  CATEGORY_COLORS[category] ?? 'bg-slate-600 text-white';

export const isDefaultCategory = (category: string) => Boolean(CATEGORY_COLORS[category]);

export const getCategoryAccent = (category: string) => {
  if (CATEGORY_ACCENTS[category]) return CATEGORY_ACCENTS[category];
  const hash = hashString(category);
  const hue = hash % 360;
  return `hsl(${hue} 70% 45%)`;
};
