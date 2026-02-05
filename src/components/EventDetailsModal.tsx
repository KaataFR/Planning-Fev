import { useMemo } from 'react';
import { useCalendarStore } from '../store/useCalendarStore';
import { format } from 'date-fns';
import { getCategoryLabel } from '../types';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
}

export function EventDetailsModal({ isOpen, onClose, eventId }: EventDetailsModalProps) {
  const { events } = useCalendarStore();

  const event = useMemo(() => events.find((e) => e.id === eventId) || null, [events, eventId]);

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background/95 rounded-2xl shadow-2xl w-full max-w-md border border-border/70 overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-border/60 bg-gradient-to-r from-primary/10 to-transparent">
          <h2 className="text-lg font-semibold">Détails de l'événement</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            X
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div className="text-xl font-semibold">{event.title}</div>
          <div className="text-sm text-muted-foreground">
            {format(event.start, 'dd/MM/yyyy HH:mm')} - {format(event.end, 'dd/MM/yyyy HH:mm')}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {getCategoryLabel(event.category)}
          </div>
          <div className="mt-2 text-sm">
            {event.description ? event.description : 'Aucune description'}
          </div>
        </div>

        <div className="p-5 pt-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-muted/80 hover:bg-muted text-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
