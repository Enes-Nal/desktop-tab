import { useEffect, useRef, useState, ReactNode, CSSProperties } from 'react';
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
type SnapZone = 'left' | 'right' | 'top' | 'bottom';

const snapZoneFromPoint = (x: number, y: number): SnapZone | null => {
  const margin = 18;
  if (y <= margin) return 'top';
  if (x <= margin) return 'left';
  if (x >= window.innerWidth - margin) return 'right';
  if (y >= window.innerHeight - TASKBAR_H - margin) return 'bottom';
  return null;
};

const snapPreviewStyle = (zone: SnapZone): CSSProperties => {
  const h = window.innerHeight - TASKBAR_H;
  const halfW = Math.round(window.innerWidth / 2);
  if (zone === 'left') return { left: 8, top: 8, width: halfW - 12, height: h - 16 };
  if (zone === 'right') return { left: halfW + 4, top: 8, width: halfW - 12, height: h - 16 };
  if (zone === 'bottom') return { left: 8, top: Math.round(h / 2) + 4, width: window.innerWidth - 16, height: Math.ceil(h / 2) - 12 };
  return { left: 8, top: 8, width: window.innerWidth - 16, height: h - 16 };
};

export function Win({ win, icon, toolbar, children, minWidth = 360, minHeight = 220 }: Props) {
  const { focus, close, minimize, minimizeOthers, toggleMaximize, snapWindow, setGeom, activeId } = useWMStore();
  const isActive = activeId === win.id;

  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number; shake: Array<{ x: number; t: number }>; lastDir: number; turns: number } | null>(null);
  const resizeRef = useRef<{ ow: number; oh: number; sx: number; sy: number; ox: number; oy: number; dir: string } | null>(null);
  const [snapPreview, setSnapPreview] = useState<SnapZone | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const d = dragRef.current;
        const x = Math.max(-win.w + 80, Math.min(window.innerWidth - 80, d.ox + e.clientX - d.sx));
        const y = Math.max(0, Math.min(window.innerHeight - 40 - TASKBAR_H, d.oy + e.clientY - d.sy));
        const zone = snapZoneFromPoint(e.clientX, e.clientY);
        setSnapPreview(zone);
        const now = performance.now();
        d.shake = [...d.shake.filter(point => now - point.t < 420), { x: e.clientX, t: now }];
        const dx = d.shake.length > 1 ? e.clientX - d.shake[d.shake.length - 2].x : 0;
        const dir = Math.sign(dx);
        if (dir !== 0 && d.lastDir !== 0 && dir !== d.lastDir && Math.abs(dx) > 8) d.turns += 1;
        if (dir !== 0) d.lastDir = dir;
        const spread = Math.max(...d.shake.map(point => point.x)) - Math.min(...d.shake.map(point => point.x));
        if (d.turns >= 4 && spread > 90) {
          minimizeOthers(win.id);
          d.turns = 0;
          d.shake = [];
        }
        setGeom(win.id, { x, y, maximized: false });
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
    const onUp = () => {
      if (dragRef.current && snapPreview) snapWindow(win.id, snapPreview);
      dragRef.current = null;
      resizeRef.current = null;
      setSnapPreview(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [win.id, win.w, setGeom, minWidth, minHeight, minimizeOthers, snapPreview, snapWindow]);

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
    <>
      {snapPreview && (
        <div
          className="snap-preview pointer-events-none fixed z-[999]"
          style={snapPreviewStyle(snapPreview)}
        />
      )}
      <div
        data-window-root
        className={cn(
          'os-window fixed flex flex-col rounded-md overflow-hidden border bg-card/95 backdrop-blur-xl animate-scale-in',
          isActive ? 'is-active border-primary/50 shadow-2xl' : 'border-border shadow-lg',
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
          'os-titlebar h-9 border-b border-border flex items-center justify-between select-none shrink-0',
          isActive ? 'bg-card' : 'bg-muted/60',
          !win.maximized && 'cursor-grab active:cursor-grabbing',
        )}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          const origin = win.maximized && win.prevGeom
            ? { x: Math.max(0, e.clientX - win.prevGeom.w / 2), y: 0, w: win.prevGeom.w, h: win.prevGeom.h }
            : { x: win.x, y: win.y, w: win.w, h: win.h };
          if (win.maximized) setGeom(win.id, { ...origin, maximized: false, prevGeom: undefined });
          dragRef.current = { ox: origin.x, oy: origin.y, sx: e.clientX, sy: e.clientY, shake: [{ x: e.clientX, t: performance.now() }], lastDir: 0, turns: 0 };
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
    </>
  );
}
