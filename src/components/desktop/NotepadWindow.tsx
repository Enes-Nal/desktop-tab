import { useEffect, useRef, useState } from 'react';
import { useNotesStore } from '@/store/notesStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, Plus, FileText, Trash2, Download } from 'lucide-react';

export function NotepadWindow() {
  const {
    notes, openIds, activeId,
    windowOpen, windowPos, windowSize,
    closeWindow, setWindowPos, setWindowSize,
    createNote, updateNote, deleteNote, openNote, closeNote, setActive,
  } = useNotesStore();

  const [showSidebar, setShowSidebar] = useState(true);
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const resizeRef = useRef<{ ow: number; oh: number; sx: number; sy: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const d = dragRef.current;
        setWindowPos({
          x: Math.max(-windowSize.w + 80, Math.min(window.innerWidth - 80, d.ox + e.clientX - d.sx)),
          y: Math.max(0, Math.min(window.innerHeight - 60, d.oy + e.clientY - d.sy)),
        });
      }
      if (resizeRef.current) {
        const r = resizeRef.current;
        setWindowSize({
          w: Math.max(420, r.ow + (e.clientX - r.sx)),
          h: Math.max(280, r.oh + (e.clientY - r.sy)),
        });
      }
    };
    const onUp = () => { dragRef.current = null; resizeRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [windowSize.w, setWindowPos, setWindowSize]);

  if (!windowOpen) return null;

  const openNotes = openIds.map(id => notes.find(n => n.id === id)).filter(Boolean) as typeof notes;
  const active = notes.find(n => n.id === activeId);

  const downloadActive = () => {
    if (!active) return;
    const blob = new Blob([active.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${active.title || 'note'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed z-40 rounded-md shadow-2xl border border-border bg-card/95 backdrop-blur-xl flex flex-col overflow-hidden animate-scale-in"
      style={{ left: windowPos.x, top: windowPos.y, width: windowSize.w, height: windowSize.h }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {/* Title bar */}
      <div
        className="h-9 bg-card border-b border-border flex items-center justify-between px-2 cursor-grab active:cursor-grabbing select-none shrink-0"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          dragRef.current = { ox: windowPos.x, oy: windowPos.y, sx: e.clientX, sy: e.clientY };
        }}
      >
        <div className="flex items-center gap-2 px-1 text-sm">
          <FileText className="w-4 h-4 text-primary" />
          <span className="font-medium">Notepad</span>
          {active && <span className="text-xs text-muted-foreground">— {active.title}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={downloadActive}
            disabled={!active}
            className="w-7 h-7 flex items-center justify-center hover:bg-foreground/10 rounded-sm disabled:opacity-40"
            title="Download as .txt"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={closeWindow}
            className="w-8 h-7 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground rounded-sm"
            aria-label="Close notepad"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="h-9 border-b border-border bg-muted/40 flex items-center px-1 gap-1 shrink-0 overflow-x-auto">
        <button
          onClick={() => setShowSidebar(s => !s)}
          className={cn(
            'h-7 px-2 text-xs rounded-sm hover:bg-foreground/10',
            showSidebar && 'bg-foreground/10'
          )}
          title="Toggle file list"
        >
          Files
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        {openNotes.map(n => (
          <div
            key={n.id}
            onClick={() => setActive(n.id)}
            className={cn(
              'group h-7 pl-2 pr-1 flex items-center gap-1 text-xs rounded-sm cursor-pointer max-w-[160px]',
              activeId === n.id ? 'bg-background shadow-sm' : 'hover:bg-foreground/10'
            )}
          >
            <span className="truncate">{n.title || 'Untitled'}</span>
            <button
              onClick={(e) => { e.stopPropagation(); closeNote(n.id); }}
              className="w-4 h-4 flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground rounded-sm"
              aria-label={`Close ${n.title}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => createNote()}
        >
          <Plus className="w-3 h-3" /> New
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {showSidebar && (
          <div className="w-48 border-r border-border bg-muted/30 overflow-y-auto shrink-0">
            <div className="p-2 text-[10px] uppercase tracking-wider text-muted-foreground">All notes ({notes.length})</div>
            {notes.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">No notes yet</div>
            ) : (
              notes.map(n => (
                <div
                  key={n.id}
                  onClick={() => openNote(n.id)}
                  className={cn(
                    'group px-2 py-1.5 flex items-center gap-2 cursor-pointer text-xs',
                    activeId === n.id ? 'bg-primary/15 text-foreground' : 'hover:bg-foreground/5',
                  )}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{n.title || 'Untitled'}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {new Date(n.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${n.title || 'Untitled'}"?`)) deleteNote(n.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground rounded-sm"
                    aria-label="Delete note"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {active ? (
            <>
              <input
                value={active.title}
                onChange={(e) => updateNote(active.id, { title: e.target.value })}
                placeholder="Untitled"
                className="px-4 py-2 text-base font-medium bg-transparent outline-none border-b border-border"
              />
              <textarea
                value={active.content}
                onChange={(e) => updateNote(active.id, { content: e.target.value })}
                placeholder="Start typing..."
                className="flex-1 p-4 bg-transparent outline-none resize-none text-sm font-mono leading-relaxed"
                spellCheck
              />
              <div className="px-4 py-1.5 text-[11px] text-muted-foreground border-t border-border flex justify-between">
                <span>{active.content.length} chars · {active.content.split(/\s+/).filter(Boolean).length} words</span>
                <span>Saved · {new Date(active.updatedAt).toLocaleTimeString()}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <FileText className="w-12 h-12 opacity-30" />
              <div className="text-sm">No note open</div>
              <Button size="sm" onClick={() => createNote()}><Plus className="w-3 h-3 mr-1" /> Create note</Button>
            </div>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          if (e.button !== 0) return;
          resizeRef.current = { ow: windowSize.w, oh: windowSize.h, sx: e.clientX, sy: e.clientY };
        }}
        style={{
          background: 'linear-gradient(135deg, transparent 50%, hsl(var(--muted-foreground) / 0.4) 50%)',
        }}
      />
    </div>
  );
}
