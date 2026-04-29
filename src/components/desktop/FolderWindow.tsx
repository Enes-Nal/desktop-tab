import { useEffect, useRef, useState } from 'react';
import { useDesktopStore } from '@/store/desktopStore';
import { DesktopIcon } from './DesktopIcon';
import { DesktopItem, ICON_W, ICON_H } from '@/types/desktop';
import { Folder, X } from 'lucide-react';

interface Props {
  folderId: string;
  onClose: () => void;
  onItemContextMenu: (e: React.MouseEvent, id: string) => void;
  onItemActivate: (item: DesktopItem) => void;
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
}

export function FolderWindow({
  folderId, onClose, onItemContextMenu, onItemActivate, renamingId, setRenamingId,
}: Props) {
  const { items, selectedIds, setSelected, toggleSelected, clearSelection, renameItem, moveItems, setItemParent } = useDesktopStore();
  const folder = items.find(i => i.id === folderId);
  const children = items.filter(i => i.parentId === folderId);

  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 320, y: window.innerHeight / 2 - 240 });
  const [size] = useState({ w: 640, h: 420 });
  const dragWindow = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);

  // Internal icon drag inside folder
  const dragIcons = useRef<{ ids: string[]; sx: number; sy: number; origin: Map<string, { x: number; y: number }>; moved: boolean } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragWindow.current) {
        const d = dragWindow.current;
        setPos({ x: d.ox + (e.clientX - d.sx), y: Math.max(0, d.oy + (e.clientY - d.sy)) });
      }
      if (dragIcons.current) {
        const d = dragIcons.current;
        const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
        if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
        if (d.moved) {
          const updates = d.ids.map(id => {
            const o = d.origin.get(id)!;
            return { id, x: Math.max(0, o.x + dx), y: Math.max(0, o.y + dy) };
          });
          moveItems(updates);
        }
      }
    };
    const onUp = (e: MouseEvent) => {
      if (dragIcons.current?.moved) {
        // Check if dropped outside folder window → move to desktop
        const rect = contentRef.current?.getBoundingClientRect();
        if (rect && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) {
          dragIcons.current.ids.forEach(id => {
            setItemParent(id, null, { x: e.clientX - 40, y: e.clientY - 40 });
          });
        }
      }
      dragWindow.current = null;
      dragIcons.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [moveItems, setItemParent]);

  if (!folder) return null;

  const onIconMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const additive = e.ctrlKey || e.metaKey || e.shiftKey;
    let ids = selectedIds;
    if (!ids.includes(id)) {
      ids = additive ? [...ids, id] : [id];
      setSelected(ids);
    } else if (additive) {
      toggleSelected(id, true);
      return;
    }
    const origin = new Map<string, { x: number; y: number }>();
    items.forEach(b => { if (ids.includes(b.id)) origin.set(b.id, { x: b.x, y: b.y }); });
    dragIcons.current = { ids, sx: e.clientX, sy: e.clientY, origin, moved: false };
  };

  return (
    <div
      className="fixed z-40 rounded-md shadow-2xl border border-border bg-card/95 backdrop-blur-xl flex flex-col overflow-hidden animate-scale-in"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {/* Title bar */}
      <div
        className="h-9 bg-card border-b border-border flex items-center justify-between px-2 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          dragWindow.current = { ox: pos.x, oy: pos.y, sx: e.clientX, sy: e.clientY };
        }}
        onDoubleClick={() => setRenamingId(folder.id)}
      >
        <div className="flex items-center gap-2 px-1 text-sm">
          <Folder className="w-4 h-4" style={{ color: 'hsl(45 90% 55%)' }} />
          {renamingId === folder.id ? (
            <input
              autoFocus
              defaultValue={folder.title}
              onMouseDown={(e) => e.stopPropagation()}
              onBlur={(e) => { renameItem(folder.id, e.target.value.trim() || folder.title); setRenamingId(null); }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setRenamingId(null);
              }}
              className="px-1 text-sm bg-background border border-primary rounded-sm outline-none"
            />
          ) : (
            <span className="font-medium">{folder.title}</span>
          )}
          <span className="text-xs text-muted-foreground ml-1">({children.length})</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-7 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground rounded-sm"
          aria-label="Close folder"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="relative flex-1 overflow-auto"
        onMouseDown={(e) => {
          if (e.button === 0) clearSelection();
        }}
      >
        {children.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Empty folder — drag bookmarks here
          </div>
        ) : (
          children.map(item => (
            <DesktopIcon
              key={item.id}
              item={item}
              selected={selectedIds.includes(item.id)}
              isRenaming={renamingId === item.id}
              onMouseDown={onIconMouseDown}
              onContextMenu={onItemContextMenu}
              onActivate={onItemActivate}
              onRenameSubmit={(id, t) => { renameItem(id, t); setRenamingId(null); }}
              onRenameCancel={() => setRenamingId(null)}
            />
          ))
        )}
      </div>
    </div>
  );
}
