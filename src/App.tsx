import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useCalendarStore } from './store/useCalendarStore';
import { Header } from './components/Header';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { DayView } from './components/DayView';
import { EventModal } from './components/EventModal';
import { SettingsModal } from './components/SettingsModal';
import { useThemeEffect } from './hooks/useThemeEffect';
import { format, isAfter, isSameDay, isToday, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Category, DEFAULT_CATEGORIES, getCategoryAccent, getCategoryLabel } from './types';
import { Clock, Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

function formatCountdown(ms: number) {
  if (ms <= 0) return 'Maintenant';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function formatDuration(start: Date, end: Date) {
  const totalMinutes = Math.max(0, differenceInMinutes(end, start));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function App() {
  useThemeEffect();
  const {
    view,
    setView,
    setDate,
    events,
    addEvent,
    unscheduledEvents,
    addUnscheduledEvent,
    updateUnscheduledEvent,
    removeUnscheduledEvent,
    customCategories,
  } = useCalendarStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [menuState, setMenuState] = useState<{ eventId: string; x: number; y: number } | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [menuTransform, setMenuTransform] = useState('translate(0, 0)');
  const [detailsEventId, setDetailsEventId] = useState<string | null>(null);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaCategory, setIdeaCategory] = useState<Category>('other');
  const [ideaDuration, setIdeaDuration] = useState(60);
  const [ideaColor, setIdeaColor] = useState('');
  const [ideaTitleColor, setIdeaTitleColor] = useState('');
  const [ideaPanelOpen, setIdeaPanelOpen] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [pendingIdeaDeleteId, setPendingIdeaDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleAddEvent = () => {
    setSelectedDate(new Date());
    setSelectedEventId(null);
    setIsModalOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setDate(date);
    setView('day');
  };

  const handleTimeSlotClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEventId(null);
    setIsModalOpen(true);
  };

  const handleQuickCreate = (date: Date) => {
    const withTime = new Date(date);
    if (Number.isNaN(withTime.getTime())) return;
    if (withTime.getHours() === 0 && withTime.getMinutes() === 0) {
      withTime.setHours(9, 0, 0, 0);
    }
    setSelectedDate(withTime);
    setSelectedEventId(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedDate(null);
    setIsModalOpen(true);
  };

  const handleEventMenu = (eventId: string, x: number, y: number) => {
    setMenuState({ eventId, x, y });
  };

  const handleCopyEvent = (eventId: string) => {
    const source = events.find((e) => e.id === eventId);
    if (!source) return;
    addEvent({
      ...source,
      id: uuidv4(),
      splitId: undefined,
    });
  };

  const categoryOptions = useMemo(() => {
    const defaultList = [...DEFAULT_CATEGORIES];
    const customs = customCategories.filter(
      (cat) => !defaultList.some((base) => base.toLowerCase() === cat.toLowerCase())
    );
    return [...defaultList, ...customs];
  }, [customCategories]);

  const handleAddIdea = () => {
    const title = ideaTitle.trim();
    if (!title) return;
    const duration = Math.max(15, Number(ideaDuration) || 60);
    if (editingIdeaId) {
      updateUnscheduledEvent({
        id: editingIdeaId,
        title,
        category: ideaCategory,
        durationMinutes: duration,
        color: ideaColor || undefined,
        titleColor: ideaTitleColor || undefined,
      });
    } else {
      addUnscheduledEvent({
        id: uuidv4(),
        title,
        category: ideaCategory,
        durationMinutes: duration,
        color: ideaColor || undefined,
        titleColor: ideaTitleColor || undefined,
      });
    }
    setIdeaTitle('');
    setEditingIdeaId(null);
  };

  const handleEditIdea = (id: string) => {
    const item = unscheduledEvents.find((evt) => evt.id === id);
    if (!item) return;
    setIdeaPanelOpen(true);
    setEditingIdeaId(item.id);
    setPendingIdeaDeleteId(null);
    setIdeaTitle(item.title);
    setIdeaCategory(item.category);
    setIdeaDuration(item.durationMinutes);
    setIdeaColor(item.color ?? '');
    setIdeaTitleColor(item.titleColor ?? '');
  };

  const handleRequestDeleteIdea = (id: string) => {
    setPendingIdeaDeleteId(id);
  };

  const handleConfirmDeleteIdea = (id: string) => {
    removeUnscheduledEvent(id);
    setPendingIdeaDeleteId(null);
  };

  const nextEvent = useMemo(() => {
    const futureEvents = events.filter((e) => isAfter(e.start, now));
    futureEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
    return futureEvents[0];
  }, [events, now]);

  const currentEvent = useMemo(() => {
    return events.find((e) => e.start <= now && e.end >= now) || null;
  }, [events, now]);

  const countdown = nextEvent ? formatCountdown(nextEvent.start.getTime() - now.getTime()) : 'Aucun';
  const currentRemaining = currentEvent ? formatCountdown(currentEvent.end.getTime() - now.getTime()) : null;
  const currentAccent = currentEvent ? currentEvent.color ?? getCategoryAccent(currentEvent.category) : null;
  const detailsEvent = useMemo(
    () => events.find((e) => e.id === detailsEventId) || null,
    [events, detailsEventId]
  );
  const detailsAccent = detailsEvent ? detailsEvent.color ?? getCategoryAccent(detailsEvent.category) : null;

  useLayoutEffect(() => {
    if (!menuState) {
      setMenuPosition(null);
      setMenuTransform('translate(0, 0)');
      return;
    }
    const padding = 6;
    const fallback = { x: menuState.x, y: menuState.y };
    const el = menuRef.current;
    if (!el) {
      setMenuPosition(fallback);
      setMenuTransform('translate(0, 0)');
      return;
    }
    const rect = el.getBoundingClientRect();
    let transformX = '0%';
    let transformY = '0%';
    if (menuState.x + rect.width > window.innerWidth - padding) {
      transformX = '-100%';
    }
    if (menuState.y + rect.height > window.innerHeight - padding) {
      transformY = '-100%';
    }
    setMenuPosition({ x: menuState.x, y: menuState.y });
    setMenuTransform(`translate(${transformX}, ${transformY})`);
  }, [menuState]);

  return (
    <div className="w-full flex justify-center gap-6 px-4">
      <aside className="hidden xl:flex flex-col gap-4 w-64 pt-8">
        <div
          className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur p-4 shadow-lg border-l-4"
          style={currentAccent ? { borderLeftColor: currentAccent } : undefined}
        >
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Événement en cours</div>
          {currentEvent ? (
            <div className="mt-2">
              <div className="text-lg font-semibold truncate">{currentEvent.title}</div>
              <div className="text-sm text-muted-foreground">
                {format(currentEvent.start, 'HH:mm')} - {format(currentEvent.end, 'HH:mm')}
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        ((now.getTime() - currentEvent.start.getTime()) /
                          (currentEvent.end.getTime() - currentEvent.start.getTime())) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Temps restant </span>
                <span className="font-semibold text-primary">{currentRemaining}</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Aucun événement</div>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Événements à placer</div>
            <button
              type="button"
              onClick={() => {
                if (ideaPanelOpen) {
                  setEditingIdeaId(null);
                  setPendingIdeaDeleteId(null);
                }
                setIdeaPanelOpen(!ideaPanelOpen);
              }}
              className={`h-7 w-7 rounded-full border border-border/60 bg-muted/60 hover:bg-muted inline-flex items-center justify-center transition-transform ${
                ideaPanelOpen ? 'rotate-45' : ''
              }`}
              aria-expanded={ideaPanelOpen}
              title={ideaPanelOpen ? 'Réduire' : 'Ajouter une idée'}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {unscheduledEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Glisse ici tes idées, puis dépose-les sur le planning.
              </div>
            ) : (
              unscheduledEvents.map((item) => {
                const itemTitleColor = item.titleColor ?? (item.color ? '#fff' : undefined);
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'application/x-kplanning-unscheduled',
                        JSON.stringify({ id: item.id })
                      );
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className="group relative border border-border/60 px-3 py-2 cursor-grab active:cursor-grabbing rounded-lg"
                    style={item.color ? { backgroundColor: item.color, borderColor: item.color } : undefined}
                    title="Glisser pour planifier"
                  >
                    <div
                      className="text-sm font-semibold truncate pr-12"
                      style={itemTitleColor ? { color: itemTitleColor } : undefined}
                    >
                      {item.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {getCategoryLabel(item.category)} • {item.durationMinutes} min
                    </div>

                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {pendingIdeaDeleteId === item.id ? (
                        <>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmDeleteIdea(item.id);
                            }}
                            className="h-7 w-7 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 inline-flex items-center justify-center"
                            title="Confirmer"
                            draggable={false}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingIdeaDeleteId(null);
                            }}
                            className="h-7 w-7 rounded-full bg-muted/70 hover:bg-muted inline-flex items-center justify-center"
                            title="Annuler"
                            draggable={false}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditIdea(item.id);
                            }}
                            className="h-7 w-7 rounded-full bg-muted/70 hover:bg-muted inline-flex items-center justify-center"
                            title="Modifier"
                            draggable={false}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestDeleteIdea(item.id);
                            }}
                            className="h-7 w-7 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 inline-flex items-center justify-center"
                            title="Supprimer"
                            draggable={false}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {ideaPanelOpen && (
            <>
              <div className="mt-4 space-y-2">
                <input
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddIdea();
                    }
                  }}
                  placeholder="Nouvelle idée"
                  className="w-full bg-muted/30 border border-border rounded px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={ideaCategory}
                    onChange={(e) => setIdeaCategory(e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={15}
                      step={5}
                      value={ideaDuration}
                      onChange={(e) => setIdeaDuration(Number(e.target.value))}
                      className="w-full bg-muted/30 border border-border rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">min</span>
                  </div>
                </div>
              </div>

              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={ideaColor || '#3b82f6'}
                    onChange={(e) => setIdeaColor(e.target.value)}
                    className="h-8 w-10 rounded border border-border bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={ideaColor}
                    onChange={(e) => setIdeaColor(e.target.value)}
                    placeholder="#1f6feb"
                    className="flex-1 bg-muted/30 border border-border rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={ideaTitleColor || '#111827'}
                    onChange={(e) => setIdeaTitleColor(e.target.value)}
                    className="h-8 w-10 rounded border border-border bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={ideaTitleColor}
                    onChange={(e) => setIdeaTitleColor(e.target.value)}
                    placeholder="#111827"
                    className="flex-1 bg-muted/30 border border-border rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                </div>
              </div>

              <button
                onClick={handleAddIdea}
                className="mt-3 w-full text-xs px-3 py-2 rounded-full bg-primary/80 text-primary-foreground hover:bg-primary transition-colors"
              >
                {editingIdeaId ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur p-4 shadow-lg">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Prochain événement</div>
          {nextEvent ? (
            <div className="mt-2">
              <div className="text-lg font-semibold truncate">{nextEvent.title}</div>
              <div className="text-sm text-muted-foreground">
                {format(nextEvent.start, 'EEEE d MMMM', { locale: fr })} • {format(nextEvent.start, 'HH:mm')}
              </div>
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Départ dans </span>
                <span className="font-semibold text-primary">{countdown}</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Aucun événement</div>
          )}
        </div>
      </aside>

      <div className="flex-1">
        <div className="flex flex-col min-h-screen w-full max-w-[1200px] xl:max-w-[1400px] mx-auto bg-background/80 text-foreground border border-border/60 shadow-2xl rounded-2xl md:rounded-3xl backdrop-blur-xl">
          {nextEvent && isToday(nextEvent.start) && (
            <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-6 py-2.5 flex items-center gap-3 border-b border-border/60 text-sm backdrop-blur">
              <span className="font-bold text-primary flex items-center gap-1">
                <Clock className="w-4 h-4" /> Prochain événement :
              </span>
              <span className="font-semibold">{format(nextEvent.start, 'HH:mm')}</span>
              <span>{nextEvent.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold bg-black text-white/90">
                {getCategoryLabel(nextEvent.category)}
              </span>
            </div>
          )}

          <Header onAddEvent={handleAddEvent} onOpenSettings={() => setIsSettingsOpen(true)} />

          <main className="relative">
            {view === 'month' && (
              <MonthView
                onEventMenu={handleEventMenu}
                onEventSelect={setDetailsEventId}
                onDayClick={handleDayClick}
                onDayRightClick={handleQuickCreate}
              />
            )}
            {view === 'week' && (
              <WeekView
                onEventSelect={setDetailsEventId}
                onDayClick={handleDayClick}
              />
            )}
            {view === 'day' && (
              <DayView
                onEventMenu={handleEventMenu}
                onEventSelect={setDetailsEventId}
                onTimeSlotClick={handleTimeSlotClick}
                onTimeSlotRightClick={handleQuickCreate}
              />
            )}
          </main>

          <EventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            selectedDate={selectedDate}
            selectedEventId={selectedEventId}
          />

          <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
      </div>

      <aside className="hidden xl:flex flex-col gap-4 w-64 pt-8">
        <div
          className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur p-4 shadow-lg border-l-4"
          style={detailsAccent ? { borderLeftColor: detailsAccent } : undefined}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Détails</div>
            {detailsEvent && (
              <button
                className="text-[11px] px-2 py-1 rounded-full bg-muted/70 hover:bg-muted"
                onClick={() => setDetailsEventId(null)}
              >
                Fermer
              </button>
            )}
          </div>
          {detailsEvent ? (
            <div className="mt-3">
              <div
                className="text-lg font-semibold truncate"
                style={detailsAccent ? { color: detailsAccent } : undefined}
              >
                {detailsEvent.title}
              </div>
              <div className="mt-2 text-sm text-muted-foreground flex flex-col gap-1">
                <div>
                  <span className="font-semibold text-foreground/80">Date </span>
                  {isSameDay(detailsEvent.start, detailsEvent.end)
                    ? format(detailsEvent.start, 'dd/MM/yyyy')
                    : `Du ${format(detailsEvent.start, 'dd/MM/yyyy')} au ${format(detailsEvent.end, 'dd/MM/yyyy')}`}
                </div>
                <div>
                  <span className="font-semibold text-foreground/80">Horaire </span>
                  {format(detailsEvent.start, 'HH:mm')} - {format(detailsEvent.end, 'HH:mm')}
                </div>
                <div>
                  <span className="font-semibold text-foreground/80">Durée </span>
                  {formatDuration(detailsEvent.start, detailsEvent.end)}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold bg-black text-white/90">
                  {getCategoryLabel(detailsEvent.category)}
                </span>
              </div>
              <div className="mt-3 text-sm text-foreground/90">
                {detailsEvent.description ? detailsEvent.description : 'Aucune description'}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">Clique gauche sur un événement pour voir les détails.</div>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 backdrop-blur p-4 shadow-lg">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Résumé</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Vue {view === 'week' ? 'semaine' : view === 'day' ? 'jour' : 'mois'}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">Événements: {events.length}</div>
        </div>
      </aside>

      {menuState && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setMenuState(null)}
        >
          <div
            ref={menuRef}
            className="fixed bg-background/95 border border-border/70 rounded-xl shadow-xl p-2 text-sm"
            style={{
              left: (menuPosition ?? menuState).x,
              top: (menuPosition ?? menuState).y,
              width: 220,
              transform: menuTransform,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/60"
              onClick={() => {
                handleCopyEvent(menuState.eventId);
                setMenuState(null);
              }}
            >
              Copier l'événement
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/60"
              onClick={() => {
                handleEventClick(menuState.eventId);
                setMenuState(null);
              }}
            >
              Modifier l'événement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

