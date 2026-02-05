import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, Upload, X, Trash2 } from 'lucide-react';
import { useCalendarStore } from '../store/useCalendarStore';
import { CalendarEvent } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { events, importEvents } = useCalendarStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'calendar_events.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          const validEvents = json.map((evt: any) => ({
            ...evt,
            start: new Date(evt.start),
            end: new Date(evt.end),
          })) as CalendarEvent[];

          if (
            confirm(
              `Voulez-vous importer ${validEvents.length} événements ? Cela remplacera les événements actuels.`
            )
          ) {
            importEvents(validEvents);
            onClose();
          }
        } else {
          alert('Format JSON invalide');
        }
      } catch (err) {
        console.error(err);
        alert('Erreur lors de la lecture du fichier');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    if (confirm('Êtes-vous sûr de vouloir tout effacer ? Cette action est irréversible.')) {
      importEvents([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background/90 rounded-2xl shadow-2xl w-full max-w-sm border border-border/70 overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-border/60 bg-gradient-to-r from-primary/10 to-transparent">
          <h2 className="text-lg font-semibold">Paramètres & Données</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Sauvegarde</h3>
            <button
              onClick={handleExport}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted transition-colors border border-border"
            >
              <Download className="w-5 h-5" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Exporter les données</span>
                <span className="text-xs text-muted-foreground">Télécharger au format JSON</span>
              </div>
            </button>

            <button
              onClick={handleImportClick}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted transition-colors border border-border"
            >
              <Upload className="w-5 h-5" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Importer des données</span>
                <span className="text-xs text-muted-foreground">Restaurer une sauvegarde JSON</span>
              </div>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
            <h3 className="text-sm font-medium text-muted-foreground">Zone de danger</h3>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-destructive/10 text-destructive transition-colors border border-destructive/20"
            >
              <Trash2 className="w-5 h-5" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Tout effacer</span>
                <span className="text-xs opacity-80">Supprimer tous les événements</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
