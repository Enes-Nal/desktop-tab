import { useEffect, useRef, useState, useCallback } from 'react';
import { useDesktopStore } from '@/store/desktopStore';
import { DesktopIcon } from './DesktopIcon';
import { ContextMenu, MenuItem } from './ContextMenu';
import { AddBookmarkDialog } from './AddBookmarkDialog';
import { Taskbar } from './Taskbar';
import { StartMenu } from './StartMenu';
import { Bookmark, GRID, ICON_W, ICON_H } from '@/types/desktop';
import { ExternalLink, Pencil, Trash2, Plus, RefreshCw, Image as ImageIcon } from 'lucide-react';

type Menu =
  | { type: 'icon'; x: number; y: number; iconId: string }
  | { type: 'desktop'; x: number; y: number }
  | null;

type DragState = {
  ids: string[];
  startX: number;
  startY: number;
  origin: Map<string, { x: number; y: number }>;
  moved: boolean;
} | null;

type SelectionBox = {
  startX: number;
  startY: number;
  curX: number;
  curY: number;
} | null;

const TASKBAR_H = 48;

export function Desktop() {
  const {
    bookmarks, selectedIds, settings,
    addBookmark, removeBookmarks, renameBookmark, moveBookmarks,
    setSelected, toggleSelected, clearSelection,
  } = useDesktopStore();

  const [menu, setMenu] = useState<Menu>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);

  const drag = useRef<DragState>(null);
  const [selBox, setSelBox] = useState<SelectionBox>(null);
  const selBoxRef = useRef<SelectionBox>(null);
  const desktopRef = useRef<HTMLDivElement>(null);

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  const snap = useCallback((x: number, y: number) => {
    if (!settings.snapToGrid) return { x, y };
    return {
      x: Math.round((x - 12) / GRID) * GRID + 12,
      y: Math.round((y - 12) / GRID) * GRID + 12,
    };
  }, [settings.snapToGrid]);

  const clampPos = (x: number, y: number) => ({
    x: Math.max(0, Math.min(window.innerWidth - ICON_W, x)),
    y: Math.max(0, Math.min(window.innerHeight - TASKBAR_H - ICON_H, y)),
  });

  // Open URL
  const openBookmark = (b: Bookmark) => window.open(b.url, '_blank', 'noopener');

  // ---- Icon mouse down: start drag (with multi-select awareness)
  const onIconMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const additive = e.ctrlKey || e.metaKey || e.shiftKey;

    let ids = selectedIds;
    if (!ids.includes(id)) {
      if (additive) {
        ids = [...ids, id];
        setSelected(ids);
      } else {
        ids = [id];
        setSelected(ids);
      }
    } else if (additive) {
      // toggle off then no drag
      toggleSelected(id, true);
      return;
    }

    const origin = new Map<string, { x: number; y: number }>();
    bookmarks.forEach(b => { if (ids.includes(b.id)) origin.set(b.id, { x: b.x, y: b.y }); });
    drag.current = { ids, startX: e.clientX, startY: e.clientY, origin, moved: false };
  };

  // ---- Icon context menu
  const onIconContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.includes(id)) setSelected([id]);
    setMenu({ type: 'icon', x: e.clientX, y: e.clientY, iconId: id });
  };

  // ---- Desktop mouse down: clear selection, start selection box
  const onDesktopMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-icon-id]')) return;
    setMenu(null);
    setStartOpen(false);
    if (!(e.ctrlKey || e.metaKey || e.shiftKey)) clearSelection();
    const box = { startX: e.clientX, startY: e.clientY, curX: e.clientX, curY: e.clientY };
    selBoxRef.current = box;
    setSelBox(box);
  };

  const onDesktopContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-icon-id]')) return;
    e.preventDefault();
    setMenu({ type: 'desktop', x: e.clientX, y: e.clientY });
  };

  // ---- Global mouse move/up
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Drag icons
      if (drag.current) {
        const dx = e.clientX - drag.current.startX;
        const dy = e.clientY - drag.current.startY;
        if (!drag.current.moved && Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
        if (drag.current.moved) {
          const updates = drag.current.ids.map(id => {
            const o = drag.current!.origin.get(id)!;
            const c = clampPos(o.x + dx, o.y + dy);
            return { id, x: c.x, y: c.y };
          });
          // No snap during drag for smoothness; snap on drop
          moveBookmarks(updates);
        }
        return;
      }
      // Selection box
      if (selBoxRef.current) {
        const next = { ...selBoxRef.current, curX: e.clientX, curY: e.clientY };
        selBoxRef.current = next;
        setSelBox(next);
        const minX = Math.min(next.startX, next.curX);
        const maxX = Math.max(next.startX, next.curX);
        const minY = Math.min(next.startY, next.curY);
        const maxY = Math.max(next.startY, next.curY);
        const ids = bookmarks
          .filter(b => b.x < maxX && b.x + ICON_W > minX && b.y < maxY && b.y + ICON_H > minY)
          .map(b => b.id);
        setSelected(ids);
      }
    };
    const onUp = () => {
      if (drag.current) {
        if (drag.current.moved && settings.snapToGrid) {
          const updates = drag.current.ids.map(id => {
            const b = useDesktopStore.getState().bookmarks.find(x => x.id === id)!;
            const s = snap(b.x, b.y);
            const c = clampPos(s.x, s.y);
            return { id, x: c.x, y: c.y };
          });
          moveBookmarks(updates);
        }
        drag.current = null;
      }
      if (selBoxRef.current) {
        selBoxRef.current = null;
        setSelBox(null);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [bookmarks, moveBookmarks, setSelected, snap, settings.snapToGrid]);

  // ---- Keyboard: Delete, F2, Enter, Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' && selectedIds.length) {
        removeBookmarks(selectedIds);
      } else if (e.key === 'F2' && selectedIds.length === 1) {
        setRenamingId(selectedIds[0]);
      } else if (e.key === 'Enter' && selectedIds.length) {
        bookmarks.filter(b => selectedIds.includes(b.id)).forEach(openBookmark);
      } else if (e.key === 'Escape') {
        clearSelection();
        setStartOpen(false);
        setMenu(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, bookmarks, removeBookmarks, clearSelection]);

  // ---- Build context menu items
  const buildIconMenu = (id: string): MenuItem[] => {
    const b = bookmarks.find(x => x.id === id);
    if (!b) return [];
    const multi = selectedIds.length > 1 && selectedIds.includes(id);
    return [
      {
        label: multi ? `Open ${selectedIds.length} bookmarks` : 'Open',
        icon: <ExternalLink className="w-4 h-4" />,
        onClick: () => {
          if (multi) bookmarks.filter(x => selectedIds.includes(x.id)).forEach(openBookmark);
          else openBookmark(b);
        },
      },
      { label: '', separator: true, onClick: () => {} },
      {
        label: 'Rename',
        icon: <Pencil className="w-4 h-4" />,
        disabled: multi,
        onClick: () => setRenamingId(id),
      },
      {
        label: multi ? `Delete ${selectedIds.length}` : 'Delete',
        icon: <Trash2 className="w-4 h-4" />,
        destructive: true,
        onClick: () => removeBookmarks(multi ? selectedIds : [id]),
      },
    ];
  };

  const buildDesktopMenu = (): MenuItem[] => [
    {
      label: 'New bookmark',
      icon: <Plus className="w-4 h-4" />,
      onClick: () => setDialogOpen(true),
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: settings.snapToGrid ? 'Disable snap to grid' : 'Enable snap to grid',
      icon: <RefreshCw className="w-4 h-4" />,
      onClick: () => useDesktopStore.getState().setSettings({ snapToGrid: !settings.snapToGrid }),
    },
    {
      label: 'Open Start menu',
      icon: <ImageIcon className="w-4 h-4" />,
      onClick: () => setStartOpen(true),
    },
  ];

  return (
    <div
      ref={desktopRef}
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundImage: `url(${settings.wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onMouseDown={onDesktopMouseDown}
      onContextMenu={onDesktopContextMenu}
    >
      {/* Wallpaper subtle overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 pointer-events-none" />

      {/* Icons */}
      <div className="absolute inset-0" style={{ paddingBottom: TASKBAR_H }}>
        {bookmarks.map(b => (
          <DesktopIcon
            key={b.id}
            bookmark={b}
            selected={selectedIds.includes(b.id)}
            isRenaming={renamingId === b.id}
            onMouseDown={onIconMouseDown}
            onContextMenu={onIconContextMenu}
            onOpen={openBookmark}
            onRenameSubmit={(id, title) => { renameBookmark(id, title); setRenamingId(null); }}
            onRenameCancel={() => setRenamingId(null)}
          />
        ))}
      </div>

      {/* Selection box */}
      {selBox && (
        <div
          className="absolute selection-rect pointer-events-none rounded-sm"
          style={{
            left: Math.min(selBox.startX, selBox.curX),
            top: Math.min(selBox.startY, selBox.curY),
            width: Math.abs(selBox.curX - selBox.startX),
            height: Math.abs(selBox.curY - selBox.startY),
          }}
        />
      )}

      {/* Start menu */}
      {startOpen && (
        <StartMenu
          onClose={() => setStartOpen(false)}
          onAddBookmark={() => { setStartOpen(false); setDialogOpen(true); }}
        />
      )}

      {/* Taskbar */}
      <Taskbar
        startOpen={startOpen}
        onStartClick={() => setStartOpen(o => !o)}
        onAddClick={() => setDialogOpen(true)}
      />

      {/* Context menu */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={menu.type === 'icon' ? buildIconMenu(menu.iconId) : buildDesktopMenu()}
        />
      )}

      {/* Add dialog */}
      <AddBookmarkDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={(d) => addBookmark(d)}
      />
    </div>
  );
}
