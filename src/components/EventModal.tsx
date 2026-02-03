import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Trash2, Save, Clock, AlignLeft, Tag, Repeat, Palette } from 'lucide-react';
import { useCalendarStore } from '../store/useCalendarStore';
import { CalendarEvent, Category, CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date | null;
  selectedEventId?: string | null;
}

type RepeatOption = 'none' | 'daily' | 'weekly';

interface EventFormData {
  title: string;
  category: Category;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  description: string;
  repeat: RepeatOption;
  repeatCount: number;
  color: string;
}

export function EventModal({ isOpen, onClose, selectedDate, selectedEventId }: EventModalProps) {
  const { addEvent, updateEvent, deleteEvent, events } = useCalendarStore();

  const { register, handleSubmit, setValue, watch, getValues } = useForm<EventFormData>({
    defaultValues: {
      category: 'work',
      repeat: 'none',
      repeatCount: 30,
      color: '',
    },
  });

  const selectedCategory = watch('category');
  const repeatValue = watch('repeat');
  const colorValue = watch('color');

  useEffect(() => {
    if (repeatValue === 'daily') setValue('repeatCount', 30);
    if (repeatValue === 'weekly') setValue('repeatCount', 12);
  }, [repeatValue, setValue]);

  useEffect(() => {
    if (isOpen) {
      if (selectedEventId) {
        const event = events.find((e) => e.id === selectedEventId);
        if (event) {
          setValue('title', event.title);
          setValue('category', event.category);
          setValue('description', event.description || '');
          setValue('startDate', format(event.start, 'yyyy-MM-dd'));
          setValue('startTime', format(event.start, 'HH:mm'));
          setValue('endDate', format(event.end, 'yyyy-MM-dd'));
          setValue('endTime', format(event.end, 'HH:mm'));
          setValue('repeat', 'none');
          setValue('repeatCount', 12);
          setValue('color', event.color || '');
        }
      } else if (selectedDate) {
        const start = selectedDate;
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        setValue('title', '');
        setValue('category', 'work');
        setValue('description', '');
        setValue('startDate', format(start, 'yyyy-MM-dd'));
        setValue('startTime', format(start, 'HH:mm'));
        setValue('endDate', format(end, 'yyyy-MM-dd'));
        setValue('endTime', format(end, 'HH:mm'));
        setValue('repeat', 'none');
        setValue('repeatCount', 30);
        setValue('color', '');
      } else {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        const end = new Date(now.getTime() + 60 * 60 * 1000);

        setValue('title', '');
        setValue('category', 'work');
        setValue('description', '');
        setValue('startDate', format(now, 'yyyy-MM-dd'));
        setValue('startTime', format(now, 'HH:mm'));
        setValue('endDate', format(end, 'yyyy-MM-dd'));
        setValue('endTime', format(end, 'HH:mm'));
        setValue('repeat', 'none');
        setValue('repeatCount', 30);
        setValue('color', '');
      }
    }
  }, [isOpen, selectedEventId, selectedDate, events, setValue]);

  const applyPreset = (preset: 'sleep' | 'meal' | 'sport') => {
    const values = getValues();
    let start = new Date(`${values.startDate}T${values.startTime}`);
    if (Number.isNaN(start.getTime())) {
      start = new Date();
    }

    let title = values.title;
    let category: Category = values.category;
    let durationMinutes = 60;

    if (preset === 'sleep') {
      title = 'Sommeil';
      category = 'sleep';
      durationMinutes = 8 * 60;
    } else if (preset === 'meal') {
      title = 'Repas';
      category = 'meal';
      durationMinutes = 60;
    } else if (preset === 'sport') {
      title = 'Sport';
      category = 'sport';
      durationMinutes = 90;
    }

    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    setValue('title', title);
    setValue('category', category);
    setValue('endDate', format(end, 'yyyy-MM-dd'));
    setValue('endTime', format(end, 'HH:mm'));
  };

  const onSubmit = (data: EventFormData) => {
    const start = new Date(`${data.startDate}T${data.startTime}`);
    const end = new Date(`${data.endDate}T${data.endTime}`);

    if (end <= start) {
      alert('La date de fin doit être après la date de début');
      return;
    }

    const baseEvent: CalendarEvent = {
      id: selectedEventId || uuidv4(),
      title: data.title,
      category: data.category,
      start,
      end,
      description: data.description,
      color: data.color || undefined,
    };

    if (selectedEventId) {
      updateEvent(baseEvent);
      if (data.repeat !== 'none') {
        const intervalDays = data.repeat === 'daily' ? 1 : 7;
        const total = Math.max(1, Number(data.repeatCount) || 1);
        for (let i = 1; i <= total; i += 1) {
          const offsetMs = i * intervalDays * 24 * 60 * 60 * 1000;
          const startCopy = new Date(start.getTime() + offsetMs);
          const endCopy = new Date(end.getTime() + offsetMs);

          addEvent({
            ...baseEvent,
            id: uuidv4(),
            start: startCopy,
            end: endCopy,
          });
        }
      }
      onClose();
      return;
    }

    if (data.repeat === 'none') {
      addEvent(baseEvent);
      onClose();
      return;
    }

    const intervalDays = data.repeat === 'daily' ? 1 : 7;
    const total = Math.max(1, Number(data.repeatCount) || 1);

    for (let i = 0; i < total; i += 1) {
      const offsetMs = i * intervalDays * 24 * 60 * 60 * 1000;
      const startCopy = new Date(start.getTime() + offsetMs);
      const endCopy = new Date(end.getTime() + offsetMs);

      addEvent({
        ...baseEvent,
        id: uuidv4(),
        start: startCopy,
        end: endCopy,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (selectedEventId && confirm('Voulez-vous vraiment supprimer cet événement ?')) {
      deleteEvent(selectedEventId);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background/90 rounded-2xl shadow-2xl w-full max-w-md border border-border/70 overflow-hidden flex flex-col max-h-[90vh] -translate-y-6 md:-translate-y-10">
        <div className="flex justify-between items-center p-5 border-b border-border/60 bg-gradient-to-r from-primary/10 to-transparent">
          <h2 className="text-lg font-semibold">
            {selectedEventId ? "Modifier l'événement" : 'Nouvel événement'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 overflow-y-auto flex-1 flex flex-col gap-5">
          <div>
            <label className="sr-only">Titre</label>
            <input
              {...register('title', { required: true })}
              placeholder="Ajouter un titre"
              className="w-full text-xl font-semibold bg-transparent border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 px-0 py-2 placeholder:text-muted-foreground/50"
              autoFocus
            />
          </div>

          {!selectedEventId && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('sleep')}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/80 hover:bg-muted transition-colors"
              >
                Sommeil 8h
              </button>
              <button
                type="button"
                onClick={() => applyPreset('meal')}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/80 hover:bg-muted transition-colors"
              >
                Repas 1h
              </button>
              <button
                type="button"
                onClick={() => applyPreset('sport')}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/80 hover:bg-muted transition-colors"
              >
                Sport 1h30
              </button>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Tag className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                <label
                  key={cat}
                  className={`cursor-pointer px-3 py-1 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? CATEGORY_COLORS[cat] + ' ring-2 ring-offset-2 ring-offset-background'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <input type="radio" value={cat} {...register('category')} className="sr-only" />
                  {CATEGORY_LABELS[cat]}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Palette className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 flex items-center gap-3">
              <input
                type="color"
                value={colorValue || '#3b82f6'}
                onChange={(e) => setValue('color', e.target.value)}
                className="h-9 w-12 rounded border border-border bg-transparent p-0"
              />
              <input
                type="text"
                {...register('color')}
                placeholder="#1f6feb"
                className="flex-1 bg-muted/30 border border-border rounded px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => setValue('color', '')}
                className="text-xs px-3 py-1 rounded-full bg-muted/80 hover:bg-muted transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Repeat className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">
                {selectedEventId ? 'Ajouter des occurrences' : 'Récurrence'}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-2 mt-1">
                <select
                  {...register('repeat')}
                  className="w-full bg-muted/30 border border-border rounded px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <option value="none">Aucune</option>
                  <option value="daily">Tous les jours</option>
                  <option value="weekly">Chaque semaine</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={365}
                  {...register('repeatCount', { valueAsNumber: true })}
                  className="w-full bg-muted/30 border border-border rounded px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  placeholder="Nb"
                />
              </div>
              {repeatValue !== 'none' && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Nombre d'occurrences à créer automatiquement.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                <div className="flex flex-col min-w-0">
                  <label className="text-xs text-muted-foreground mb-1">Début</label>
                  <div className="grid grid-cols-[1fr_90px] gap-2">
                    <input
                      type="date"
                      {...register('startDate', { required: true })}
                      className="w-full min-w-0 bg-muted/30 border border-border rounded px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                    <input
                      type="time"
                      {...register('startTime', { required: true })}
                      className="w-full min-w-[90px] bg-muted/30 border border-border rounded px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <label className="text-xs text-muted-foreground mb-1">Fin</label>
                  <div className="grid grid-cols-[1fr_90px] gap-2">
                    <input
                      type="date"
                      {...register('endDate', { required: true })}
                      className="w-full min-w-0 bg-muted/30 border border-border rounded px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                    <input
                      type="time"
                      {...register('endTime', { required: true })}
                      className="w-full min-w-[90px] bg-muted/30 border border-border rounded px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <AlignLeft className="w-5 h-5 text-muted-foreground mt-2" />
            <textarea
              {...register('description')}
              placeholder="Ajouter une description"
              rows={3}
              className="flex-1 bg-muted/30 border border-border rounded-md p-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-border/60">
            {selectedEventId ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 text-destructive hover:bg-destructive/10 px-3 py-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Supprimer</span>
              </button>
            ) : (
              <div></div>
            )}

            <button
              type="submit"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:opacity-90 transition-opacity shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
