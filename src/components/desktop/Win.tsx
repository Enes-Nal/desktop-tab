import { useEffect, useRef, ReactNode } from 'react';
import { useWMStore, WindowState } from '@/store/wmStore';
import { Minus, Square, X, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  win: WindowState;
  icon?: ReactNode;
  toolbar?: ReactNode;     // optional content rendered to the right of title text
  children: ReactNode;
  minWidth?: number;
  minHeight?: number;
}

const TASKBAR_H = 48;

export function Win({ win, icon, toolbar, children, minWidth = 360, minHeight = 220 }: Props) {
  const { focus, close, minimize, toggleMaximize, setGeom, activeId } = useWMStore();
  const isActive = activeId === win.id;

  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const resizeRef = useRef<{ ow: number; oh: number; sx: number; sy: number; ox: number; oy: number; dir: string } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const d = dragRef.current;
        const x = Math.max(-win.w + 80, Math.min(window.innerWidth - 80, d.ox + e.clientX - d.sx));
        const y = Math.max(0, Math.min(window.innerHeight - 40 - TASKBAR_H, d.oy + e.clientY - d.sy));
        setGeom(win.id, { x, y });
      }
      if (resizeRef.current) {
        const r = resizeRef.current;
        const dx = e.clientX - r.sx, dy = e.clientY - r.sy;
        const next: Partial<typeof win> = {};
        if (r.dir.includes('e')) next.w = Math.max(minWidth, r.ow + dx);
        if (r.dir.includes('s')) next.h = Math.max(minHeight, r.oh + dy);
        if (r.dir.includes('w')) {
          const newW = Math.max(minWidth, r.ow - dx);
          next.w = newW;
          next.x = r.ox + (r.ow - newW);
        }
        if (r.dir.includes('n')) {
          const newH = Math.max(minHeight, r.oh - dy);
          next.h = newH;
          next.y = Math.max(0, r.oy + (r.oh - newH));
        }
        setGeom(win.id, next);
      }
    };
    const onUp = () => { dragRef.current = null; resizeRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [win.id, win.w, setGeom, minWidth, minHeight]);

  if (win.minimized) return null;

  const startResize = (dir: string) => (e: React.MouseEvent) => {
    if (win.maximized) return;
    e.stopPropagation();
    if (e.button !== 0) return;
    resizeRef.current = {
      ow: win.w, oh: win.h, ox: win.x, oy: win.y,
      sx: e.clientX, sy: e.clientY, dir,
    };
  };

  return (
    <div
      data-window-root
      className={cn(
        'fixed flex flex-col rounded-md overflow-hidden border bg-card/95 backdrop-blur-xl animate-scale-in',
        isActive ? 'border-primary/50 shadow-2xl' : 'border-border shadow-lg',
      )}
      style={{
        left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z,
      }}
      onMouseDown={() => focus(win.id)}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {/* Title bar */}
      <div
        className={cn(
          'h-9 border-b border-border flex items-center justify-between select-none shrink-0',
          isActive ? 'bg-card' : 'bg-muted/60',
          !win.maximized && 'cursor-grab active:cursor-grabbing',
        )}
        onMouseDown={(e) => {
          if (e.button !== 0 || win.maximized) return;
          dragRef.current = { ox: win.x, oy: win.y, sx: e.clientX, sy: e.clientY };
        }}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <div className="flex items-center gap-2 px-2 text-sm min-w-0 flex-1">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate font-medium">{win.title}</span>
          {toolbar && <span className="ml-2 flex items-center gap-1 truncate">{toolbar}</span>}
        </div>
        <div className="flex items-center shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); minimize(win.id); }}
            className="w-11 h-9 flex items-center justify-center hover:bg-foreground/10"
            title="Minimize"
            aria-label="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleMaximize(win.id); }}
            className="w-11 h-9 flex items-center justify-center hover:bg-foreground/10"
            title={win.maximized ? 'Restore' : 'Maximize'}
            aria-label={win.maximized ? 'Restore' : 'Maximize'}
          >
            {win.maximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); close(win.id); }}
            className="w-11 h-9 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>

      {/* Resize handles */}
      {!win.maximized && (
        <>
          <div className="absolute top-0 left-2 right-2 h-1 cursor-ns-resize" onMouseDown={startResize('n')} />
          <div className="absolute bottom-0 left-2 right-2 h-1 cursor-ns-resize" onMouseDown={startResize('s')} />
          <div className="absolute top-2 bottom-2 left-0 w-1 cursor-ew-resize" onMouseDown={startResize('w')} />
          <div className="absolute top-2 bottom-2 right-0 w-1 cursor-ew-resize" onMouseDown={startResize('e')} />
          <div className="absolute top-0 left-0 w-2 h-2 cursor-nwse-resize" onMouseDown={startResize('nw')} />
          <div className="absolute top-0 right-0 w-2 h-2 cursor-nesw-resize" onMouseDown={startResize('ne')} />
          <div className="absolute bottom-0 left-0 w-2 h-2 cursor-nesw-resize" onMouseDown={startResize('sw')} />
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
            onMouseDown={startResize('se')}
            style={{ background: 'linear-gradient(135deg, transparent 50%, hsl(var(--muted-foreground) / 0.4) 50%)' }}
          />
        </>
      )}
    </div>
  );
}
