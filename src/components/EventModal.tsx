import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';

import { useForm } from 'react-hook-form';

import { X, Trash2, Save, Clock, AlignLeft, Tag, Repeat, Palette, Plus } from 'lucide-react';

import { useCalendarStore } from '../store/useCalendarStore';

import { CalendarEvent, Category, DEFAULT_CATEGORIES, getCategoryLabel } from '../types';

import { v4 as uuidv4 } from 'uuid';

import { differenceInMinutes, format } from 'date-fns';



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

  titleColor: string;

}



export function EventModal({ isOpen, onClose, selectedDate, selectedEventId }: EventModalProps) {
  const {
    addEvent,
    updateEvent,
    deleteEvent,
    events,
    customCategories,
    addCategory,
    removeCategory,
    renameCategory,
    addUnscheduledEvent,
  } = useCalendarStore();
  const [categoryInput, setCategoryInput] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [pendingDeleteTag, setPendingDeleteTag] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [tagMenu, setTagMenu] = useState<{ tag: string; x: number; y: number } | null>(null);
  const [tagMenuPosition, setTagMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [tagMenuTransform, setTagMenuTransform] = useState('translate(0, 0)');
  const categoryInputRef = useRef<HTMLInputElement | null>(null);
  const tagMenuRef = useRef<HTMLDivElement | null>(null);


  const { register, handleSubmit, setValue, watch, getValues } = useForm<EventFormData>({

    defaultValues: {

      category: 'work',

      repeat: 'none',

      repeatCount: 30,

      color: '',

      titleColor: '',

    },

  });



  const selectedCategory = watch('category');

  const repeatValue = watch('repeat');

  const colorValue = watch('color');

  const titleColorValue = watch('titleColor');

  const editingEvent = useMemo(
    () => (selectedEventId ? events.find((e) => e.id === selectedEventId) ?? null : null),
    [events, selectedEventId]
  );

  const customCategoryList = useMemo(() => {

    const defaults = DEFAULT_CATEGORIES.map((cat) => cat.toLowerCase());

    return customCategories.filter((cat) => !defaults.includes(cat.toLowerCase()));

  }, [customCategories]);



  useEffect(() => {

    if (repeatValue === 'daily') setValue('repeatCount', 30);

    if (repeatValue === 'weekly') setValue('repeatCount', 12);

  }, [repeatValue, setValue]);



  useEffect(() => {

    if (isOpen) {
      setShowCategoryInput(false);
      setCategoryInput('');
      setPendingDeleteTag(null);
      setEditingTag(null);
      setTagMenu(null);
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

          setValue('titleColor', event.titleColor || '');

          const isDefaultCategory = DEFAULT_CATEGORIES.some(
            (cat) => cat.toLowerCase() === event.category.toLowerCase()
          );
          if (event.category && !isDefaultCategory) {
            addCategory(event.category);
          }

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

        setValue('titleColor', '');

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

        setValue('titleColor', '');

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

      titleColor: data.titleColor || undefined,

      splitId: editingEvent?.splitId,

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
            splitId: undefined,

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
        splitId: undefined,

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



  const handleMoveToUnscheduled = () => {
    if (!editingEvent) return;
    const values = getValues();
    const start = new Date(`${values.startDate}T${values.startTime}`);
    const end = new Date(`${values.endDate}T${values.endTime}`);

    let durationMinutes = 0;
    if (editingEvent.splitId) {
      const group = events.filter((evt) => evt.splitId === editingEvent.splitId);
      if (group.length > 0) {
        const groupStart = group.reduce(
          (minDate, evt) => (evt.start < minDate ? evt.start : minDate),
          group[0].start
        );
        const groupEnd = group.reduce(
          (maxDate, evt) => (evt.end > maxDate ? evt.end : maxDate),
          group[0].end
        );
        durationMinutes = differenceInMinutes(groupEnd, groupStart);
      }
    }

    if (durationMinutes <= 0) {
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
        durationMinutes = differenceInMinutes(end, start);
      } else {
        durationMinutes = differenceInMinutes(editingEvent.end, editingEvent.start);
      }
    }

    const title = values.title?.trim() || editingEvent.title || 'Sans titre';
    const category = values.category || editingEvent.category;
    const description = values.description?.trim() || editingEvent.description || undefined;
    const color = values.color?.trim() || editingEvent.color || undefined;
    const titleColor = values.titleColor?.trim() || editingEvent.titleColor || undefined;

    addUnscheduledEvent({
      id: uuidv4(),
      title,
      category,
      durationMinutes: Math.max(15, durationMinutes),
      description,
      color,
      titleColor,
    });

    if (editingEvent.splitId) {
      events
        .filter((evt) => evt.splitId === editingEvent.splitId)
        .forEach((evt) => deleteEvent(evt.id));
    } else {
      deleteEvent(editingEvent.id);
    }

    onClose();
  };

  const handleShowCategoryInput = () => {
    setShowCategoryInput(true);
    setEditingTag(null);
    requestAnimationFrame(() => categoryInputRef.current?.focus());
  };

  const handleSaveCategory = () => {
    const next = categoryInput.trim();
    if (!next) return;
    if (editingTag) {
      renameCategory(editingTag, next);
      setValue('category', next);
      setEditingTag(null);
    } else {
      addCategory(next);
      setValue('category', next);
    }
    setCategoryInput('');
    setShowCategoryInput(false);
  };

  const handleRequestDelete = (cat: string) => {
    setPendingDeleteTag(cat);
  };

  const handleConfirmDelete = (cat: string) => {
    removeCategory(cat);
    if (selectedCategory.toLowerCase() === cat.toLowerCase()) {
      setValue('category', 'other');
    }
    setPendingDeleteTag(null);
    setTagMenu(null);
  };

  const handleEditTag = (cat: string) => {
    setEditingTag(cat);
    setCategoryInput(cat);
    setShowCategoryInput(true);
    setTagMenu(null);
    requestAnimationFrame(() => categoryInputRef.current?.focus());
  };

  const handleTagContextMenu = (event: MouseEvent, cat: string) => {
    event.preventDefault();
    event.stopPropagation();
    setPendingDeleteTag(null);
    setTagMenu({ tag: cat, x: event.clientX, y: event.clientY });
  };

  useLayoutEffect(() => {
    if (!tagMenu) {
      setTagMenuPosition(null);
      setTagMenuTransform('translate(0, 0)');
      return;
    }
    const padding = 6;
    const fallback = { x: tagMenu.x, y: tagMenu.y };
    const el = tagMenuRef.current;
    if (!el) {
      setTagMenuPosition(fallback);
      setTagMenuTransform('translate(0, 0)');
      return;
    }
    const rect = el.getBoundingClientRect();
    let transformX = '0%';
    let transformY = '0%';
    if (tagMenu.x + rect.width > window.innerWidth - padding) {
      transformX = '-100%';
    }
    if (tagMenu.y + rect.height > window.innerHeight - padding) {
      transformY = '-100%';
    }
    setTagMenuPosition({ x: tagMenu.x, y: tagMenu.y });
    setTagMenuTransform(`translate(${transformX}, ${transformY})`);
  }, [tagMenu]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

      <div className="bg-background/90 rounded-2xl shadow-2xl w-full max-w-2xl border border-border/70 overflow-hidden flex flex-col max-h-[88vh]">

        <div className="flex justify-between items-center p-3 border-b border-border/60 bg-gradient-to-r from-primary/10 to-transparent">

          <h2 className="text-base font-semibold">

            {selectedEventId ? "Modifier l'événement" : 'Nouvel événement'}

          </h2>

          <button

            onClick={onClose}

            className="p-1 hover:bg-muted rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"

          >

            <X className="w-5 h-5" />

          </button>

        </div>



        <form

          onSubmit={handleSubmit(onSubmit)}

          className="p-3 flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"

        >

          <div className="md:col-span-2">

            <label className="sr-only">Titre</label>

            <input

              {...register('title', { required: true })}

              placeholder="Ajouter un titre"

              className="w-full text-base font-semibold bg-transparent border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 px-0 py-2 placeholder:text-muted-foreground/50"

              autoFocus

            />

          </div>



          {!selectedEventId && (

            <div className="flex flex-wrap gap-2 md:col-span-2">

              <button

                type="button"

                onClick={() => applyPreset('sleep')}

                className="px-3 py-1 rounded-full text-[11px] font-semibold bg-muted/80 hover:bg-muted transition-colors"

              >

                Sommeil 8h

              </button>

              <button

                type="button"

                onClick={() => applyPreset('meal')}

                className="px-3 py-1 rounded-full text-[11px] font-semibold bg-muted/80 hover:bg-muted transition-colors"

              >

                Repas 1h

              </button>

              <button

                type="button"

                onClick={() => applyPreset('sport')}

                className="px-3 py-1 rounded-full text-[11px] font-semibold bg-muted/80 hover:bg-muted transition-colors"

              >

                Sport 1h30

              </button>

            </div>

          )}



          <div className="flex items-start gap-3 md:col-span-2">

            <Tag className="w-5 h-5 text-muted-foreground" />

            <div className="flex-1 flex flex-wrap gap-2">

              {DEFAULT_CATEGORIES.map((cat) => (

                <label

                  key={cat}

                  className={`cursor-pointer px-3 py-1 rounded-full text-sm font-medium transition-all whitespace-nowrap ${

                    selectedCategory === cat

                      ? 'bg-black text-white ring-2 ring-white/40 ring-offset-2 ring-offset-background'

                      : 'bg-black text-white/80 hover:text-white hover:bg-black'

                  }`}

                >

                  <input type="radio" value={cat} {...register('category')} className="sr-only" />

                  {getCategoryLabel(cat)}

                </label>

              ))}

              <button

                type="button"

                onClick={handleShowCategoryInput}

                className="px-2.5 py-1 rounded-full text-sm font-semibold bg-muted/80 hover:bg-muted transition-colors inline-flex items-center gap-1 shrink-0"

                title="Ajouter un tag"

              >

                <Plus className="w-3.5 h-3.5" />

              </button>

              {customCategoryList.length > 0 && <span className="basis-full h-0" />}
              {customCategoryList.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <label
                    key={cat}
                    onContextMenu={(event) => handleTagContextMenu(event, cat)}
                    className={`cursor-pointer px-3 py-1 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-black text-white ring-2 ring-white/40 ring-offset-2 ring-offset-background'
                        : 'bg-black text-white/80 hover:text-white hover:bg-black'
                    }`}
                    title="Clic droit pour modifier ou supprimer"
                  >
                    <input type="radio" value={cat} {...register('category')} className="sr-only" />
                    {getCategoryLabel(cat)}
                  </label>
                );
              })}

            </div>

          </div>



          {showCategoryInput && (
            <div className="flex items-start gap-3 md:col-span-2">
              <Tag className="w-5 h-5 text-muted-foreground mt-2" />
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">
                  {editingTag ? 'Modifier le tag' : 'Ajouter un tag'}
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    ref={categoryInputRef}
                    type="text"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveCategory();
                      }
                      if (e.key === 'Escape') {
                        setShowCategoryInput(false);
                        setCategoryInput('');
                        setEditingTag(null);
                      }
                    }}
                    placeholder={editingTag ? 'Nouveau nom' : 'Nouveau tag'}
                    className="flex-1 bg-muted/30 border border-border rounded px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCategory}
                    className="text-xs px-3 py-1 rounded-full bg-muted/80 hover:bg-muted transition-colors"
                  >
                    {editingTag ? 'Enregistrer' : 'Ajouter'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryInput(false);
                      setCategoryInput('');
                      setEditingTag(null);
                    }}
                    className="text-xs px-3 py-1 rounded-full bg-muted/60 hover:bg-muted transition-colors"
                  >
                    Fermer
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {editingTag
                    ? 'Renommez ce tag pour mettre à jour les événements associés.'
                    : 'Le tag ajouté devient une catégorie sélectionnable.'}
                </p>
              </div>
            </div>
          )}



          <div className="flex items-start gap-3">

            <Palette className="w-5 h-5 text-muted-foreground" />

            <div className="flex-1">

              <div className="text-xs text-muted-foreground mb-2">Couleur arrière-plan</div>

              <div className="flex items-center gap-3">

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

              </div>

            </div>

          </div>



          <div className="flex items-start gap-3">

            <Palette className="w-5 h-5 text-muted-foreground" />

            <div className="flex-1">

              <div className="text-xs text-muted-foreground mb-2">Couleur du titre</div>

              <div className="flex items-center gap-3">

                <input

                  type="color"

                  value={titleColorValue || '#111827'}

                  onChange={(e) => setValue('titleColor', e.target.value)}

                  className="h-9 w-12 rounded border border-border bg-transparent p-0"

                />

                <input

                  type="text"

                  {...register('titleColor')}

                  placeholder="#111827"

                  className="flex-1 bg-muted/30 border border-border rounded px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"

                />

              </div>

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

              <div className="flex-1 flex flex-col gap-3 min-w-0">

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



          <div className="flex items-start gap-3 md:col-span-2">

            <AlignLeft className="w-5 h-5 text-muted-foreground mt-2" />

            <textarea

              {...register('description')}

              placeholder="Ajouter une description"

              rows={2}

              className="flex-1 bg-muted/30 border border-border rounded-md p-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"

            />

          </div>



          <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/60 md:col-span-2">

            {selectedEventId ? (

              <div className="flex items-center gap-2">

                <button

                  type="button"

                  onClick={handleDelete}

                  className="flex items-center gap-2 text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"

                >

                  <Trash2 className="w-4 h-4" />

                  <span className="text-sm font-medium">Supprimer</span>

                </button>

                <button

                  type="button"

                  onClick={handleMoveToUnscheduled}

                  className="flex items-center gap-2 text-foreground/80 hover:text-foreground hover:bg-muted/60 px-3 py-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"

                  title="Déplacer vers les événements à placer"

                >

                  <Clock className="w-4 h-4" />

                  <span className="text-sm font-medium">À placer</span>

                </button>

              </div>

            ) : (

              <div></div>

            )}



            <button

              type="submit"

              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-1.5 rounded-full font-medium hover:opacity-90 transition-opacity shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"

            >

              <Save className="w-4 h-4" />

              <span>Enregistrer</span>

            </button>

          </div>

        </form>

      </div>

      {tagMenu && (
        <div
          className="fixed inset-0 z-[60]"
          onClick={() => {
            setTagMenu(null);
            setPendingDeleteTag(null);
          }}
        >
          <div
            ref={tagMenuRef}
            className="fixed bg-background/95 border border-border/70 rounded-xl shadow-xl p-2 text-sm"
            style={{
              left: (tagMenuPosition ?? tagMenu).x,
              top: (tagMenuPosition ?? tagMenu).y,
              width: 200,
              transform: tagMenuTransform,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/60"
              onClick={() => handleEditTag(tagMenu.tag)}
            >
              Modifier le tag
            </button>
            {pendingDeleteTag?.toLowerCase() === tagMenu.tag.toLowerCase() ? (
              <div className="mt-1 space-y-1">
                <button
                  className="w-full text-left px-3 py-2 rounded-md bg-destructive/20 text-destructive hover:bg-destructive/30"
                  onClick={() => handleConfirmDelete(tagMenu.tag)}
                >
                  Confirmer la suppression
                </button>
                <button
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/60"
                  onClick={() => setPendingDeleteTag(null)}
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/60 text-destructive"
                onClick={() => handleRequestDelete(tagMenu.tag)}
              >
                Supprimer le tag
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);

}







































