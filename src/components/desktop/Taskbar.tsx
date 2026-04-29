import { Clock } from './Clock';
import { Search, LayoutGrid, FileText, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNotesStore } from '@/store/notesStore';
import { useWMStore } from '@/store/wmStore';
import { openFileExplorerHome } from '@/lib/appLauncher';
import { useFsStore } from '@/store/fsStore';
import { NodeIcon } from './NodeIcon';

interface Props {
  onStartClick: () => void;
  startOpen: boolean;
  onAddClick: () => void;
}

export function Taskbar({ onStartClick, startOpen, onAddClick }: Props) {
  const { windowOpen: notepadOpen, openWindow: openNotepad, closeWindow: closeNotepad } = useNotesStore();
  const windows = useWMStore(s => s.windows);
  const activeId = useWMStore(s => s.activeId);
  const toggleFromTaskbar = useWMStore(s => s.toggleFromTaskbar);
  const nodes = useFsStore(s => s.nodes);

  const iconForWindow = (app: string, propsObj: Record<string, unknown>) => {
    if (app === 'file-explorer') {
      const fid = propsObj.folderId as string;
      const node = nodes.find(n => n.id === fid);
      return node ? <NodeIcon node={node} size={16} /> : <FolderOpen className="w-4 h-4 text-yellow-500" />;
    }
    if (app === 'text-viewer' || app === 'image-viewer') {
      const fid = propsObj.fileId as string;
      const node = nodes.find(n => n.id === fid);
      return node ? <NodeIcon node={node} size={16} /> : <FileText className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-12 z-30 glass-taskbar flex items-center px-1 gap-1"
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={onStartClick}
        className={cn(
          'h-full w-12 flex items-center justify-center transition-colors shrink-0',
          startOpen ? 'bg-primary/30' : 'hover:bg-foreground/10'
        )}
        title="Start" aria-label="Start menu"
      >
        <WindowsLogo className="w-5 h-5" />
      </button>

      <div className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-sm bg-background/40 border border-border/50 w-48 cursor-text shrink-0"
        onClick={onStartClick}
      >
        <Search className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Search</span>
      </div>

      <button
        onClick={openFileExplorerHome}
        className="h-9 w-9 flex items-center justify-center rounded-sm hover:bg-foreground/10 shrink-0"
        title="File Explorer"
      >
        <FolderOpen className="w-5 h-5 text-yellow-500" />
      </button>

      <button
        onClick={() => (notepadOpen ? closeNotepad() : openNotepad())}
        className={cn(
          'h-9 px-2 flex items-center gap-1.5 rounded-sm text-xs transition-colors shrink-0',
          notepadOpen ? 'bg-primary/30' : 'hover:bg-foreground/10'
        )}
        title="Notepad"
      >
        <FileText className="w-4 h-4" />
        <span className="hidden md:inline">Notepad</span>
      </button>

      {/* Open windows */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
        {windows.map(w => (
          <button
            key={w.id}
            onClick={() => toggleFromTaskbar(w.id)}
            className={cn(
              'h-9 px-2 max-w-[180px] flex items-center gap-1.5 rounded-sm text-xs transition-colors shrink-0',
              activeId === w.id && !w.minimized
                ? 'bg-primary/30 border-b-2 border-primary'
                : 'hover:bg-foreground/10 border-b-2 border-transparent',
              w.minimized && 'opacity-70'
            )}
            title={w.title}
          >
            {iconForWindow(w.app, w.props)}
            <span className="truncate hidden md:inline">{w.title}</span>
          </button>
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={onAddClick} className="gap-1.5 text-xs h-9 shrink-0">
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
