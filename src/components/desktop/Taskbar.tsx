import { Clock } from './Clock';
import { Search, LayoutGrid, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNotesStore } from '@/store/notesStore';

interface Props {
  onStartClick: () => void;
  startOpen: boolean;
  onAddClick: () => void;
}

export function Taskbar({ onStartClick, startOpen, onAddClick }: Props) {
  const { windowOpen: notepadOpen, openWindow: openNotepad, closeWindow: closeNotepad } = useNotesStore();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-12 z-30 glass-taskbar flex items-center px-1 gap-1"
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={onStartClick}
        className={cn(
          'h-full w-12 flex items-center justify-center transition-colors',
          startOpen ? 'bg-primary/30' : 'hover:bg-foreground/10'
        )}
        title="Start"
        aria-label="Start menu"
      >
        <WindowsLogo className="w-5 h-5" />
      </button>

      <div className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-sm bg-background/40 border border-border/50 w-64 cursor-text"
        onClick={onStartClick}
      >
        <Search className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Type here to search</span>
      </div>

      <button
        onClick={() => (notepadOpen ? closeNotepad() : openNotepad())}
        className={cn(
          'h-9 px-2 flex items-center gap-1.5 rounded-sm text-xs transition-colors',
          notepadOpen ? 'bg-primary/30' : 'hover:bg-foreground/10'
        )}
        title="Notepad"
      >
        <FileText className="w-4 h-4" />
        <span className="hidden md:inline">Notepad</span>
      </button>

      <div className="flex-1" />

      <Button variant="ghost" size="sm" onClick={onAddClick} className="gap-1.5 text-xs h-9">
        <LayoutGrid className="w-4 h-4" /> New
      </Button>

      <Clock />
    </div>
  );
}

function WindowsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="2" y="2" width="9" height="9" />
      <rect x="13" y="2" width="9" height="9" />
      <rect x="2" y="13" width="9" height="9" />
      <rect x="13" y="13" width="9" height="9" />
    </svg>
  );
}
