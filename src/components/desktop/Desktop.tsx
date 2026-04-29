import { useEffect, useRef, useState, useCallback } from 'react';
import { useFsStore } from '@/store/fsStore';
import { useWMStore } from '@/store/wmStore';
import { DesktopIcon } from './DesktopIcon';
import { ContextMenu, MenuItem } from './ContextMenu';
import { AddBookmarkDialog } from './AddBookmarkDialog';
import { Taskbar } from './Taskbar';
import { StartMenu } from './StartMenu';
import { NotepadWindow } from './NotepadWindow';
import { IconUrlDialog } from './IconUrlDialog';
import { WindowHost } from './WindowHost';
import { FsNode, GRID, ICON_W, ICON_H, ROOT_DESKTOP, isRoot } from '@/types/fs';
import { activateNode, openFileExplorerAt } from '@/lib/appLauncher';
import {
  ExternalLink, Pencil, Trash2, Plus, RefreshCw, FolderPlus,
  Image as ImageIcon, FolderInput, Link2, FileText as FileTextIcon, FolderOpen,
} from 'lucide-react';

type Menu =
  | { type: 'icon'; x: number; y: number; iconId: string }
  | { type: 'desktop'; x: number; y: number }
  | null;

const TASKBAR_H = 48;

export function Desktop() {
  const nodes = useFsStore(s => s.nodes);
  const selectedIds = useFsStore(s => s.selectedIds);
  const settings = useFsStore(s => s.settings);
  const hydrated = useFsStore(s => s.hydrated);
  const {
    addBookmark, addFolder, addTextFile,
    removeItems, renameItem, moveItems, setItemParent, setCustomIcon,
    setSelected, toggleSelected, clearSelection, setSettings,
  } = useFsStore();

  const desktopNodes = nodes.filter(n => n.parentId === ROOT_DESKTOP);

  const [menu, setMenu] = useState<Menu>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [iconUploadId, setIconUploadId] = useState<string | null>(null);
  const [iconUrlDialogId, setIconUrlDialogId] = useState<string | null>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);

  const drag = useRef<{
    ids: string[];
    startX: number; startY: number;
    origin: Map<string, { x: number; y: number }>;
    moved: boolean;
  } | null>(null);
  const selBoxRef = useRef<{ startX: number; startY: number; curX: number; curY: number } | null>(null);
  const [selBox, setSelBox] = useState<typeof selBoxRef.current>(null);

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
    nodes.forEach(b => { if (ids.includes(b.id)) origin.set(b.id, { x: b.x, y: b.y }); });
    drag.current = { ids, startX: e.clientX, startY: e.clientY, origin, moved: false };
  };

  const onIconContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.includes(id)) setSelected([id]);
    setMenu({ type: 'icon', x: e.clientX, y: e.clientY, iconId: id });
  };

  const onDesktopMouseDown = (e: React.MouseEvent) => {
    setMenu(null);
    setStartOpen(false);
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-icon-id]')) return;
    if ((e.target as HTMLElement).closest('[data-window-root]')) return;
    if (!(e.ctrlKey || e.metaKey || e.shiftKey)) clearSelection();
    const box = { startX: e.clientX, startY: e.clientY, curX: e.clientX, curY: e.clientY };
    selBoxRef.current = box;
    setSelBox(box);
  };

  const onDesktopContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-icon-id]')) return;
    if ((e.target as HTMLElement).closest('[data-window-root]')) return;
    e.preventDefault();
    setMenu({ type: 'desktop', x: e.clientX, y: e.clientY });
  };

  const findDropTarget = (clientX: number, clientY: number, excludeIds: string[]): string | null => {
    const els = document.elementsFromPoint(clientX, clientY);
    for (const el of els) {
      const iconEl = el.closest('[data-icon-id]') as HTMLElement | null;
      if (!iconEl) continue;
      const id = iconEl.getAttribute('data-icon-id');
      if (!id || excludeIds.includes(id)) continue;
      return id;
    }
    return null;
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (drag.current) {
        const d = drag.current;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
        if (d.moved) {
          const updates = d.ids.map(id => {
            const o = d.origin.get(id)!;
            const c = clampPos(o.x + dx, o.y + dy);
            return { id, x: c.x, y: c.y };
          });
          moveItems(updates);

          const tid = findDropTarget(e.clientX, e.clientY, d.ids);
          const tNode = tid ? nodes.find(n => n.id === tid) : null;
          if (d.ids.length === 1) {
            setDropTargetId(tNode ? tid : null);
          } else {
            setDropTargetId(tNode?.kind === 'folder' ? tid : null);
          }
        }
        return;
      }
      if (selBoxRef.current) {
        const next = { ...selBoxRef.current, curX: e.clientX, curY: e.clientY };
        selBoxRef.current = next;
        setSelBox(next);
        const minX = Math.min(next.startX, next.curX);
        const maxX = Math.max(next.startX, next.curX);
        const minY = Math.min(next.startY, next.curY);
        const maxY = Math.max(next.startY, next.curY);
        const ids = desktopNodes
          .filter(b => b.x < maxX && b.x + ICON_W > minX && b.y < maxY && b.y + ICON_H > minY)
          .map(b => b.id);
        setSelected(ids);
      }
    };
    const onUp = () => {
      if (drag.current) {
        const d = drag.current;
        if (d.moved) {
          if (dropTargetId) {
            const target = nodes.find(n => n.id === dropTargetId);
            if (target?.kind === 'folder') {
              d.ids.forEach(id => setItemParent(id, target.id));
            } else if (target?.kind === 'bookmark' && d.ids.length === 1) {
              const draggedId = d.ids[0];
              const dragged = nodes.find(n => n.id === draggedId);
              if (dragged && dragged.kind === 'bookmark') {
                const fid = addFolder({ x: target.x, y: target.y, parentId: target.parentId });
                setItemParent(target.id, fid);
                setItemParent(draggedId, fid);
              }
            }
          } else if (settings.snapToGrid) {
            const updates = d.ids.map(id => {
              const b = useFsStore.getState().nodes.find(x => x.id === id)!;
              const s = snap(b.x, b.y);
              const c = clampPos(s.x, s.y);
              return { id, x: c.x, y: c.y };
            });
            moveItems(updates);
          }
        }
        drag.current = null;
        setDropTargetId(null);
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
  }, [nodes, desktopNodes, dropTargetId, moveItems, setSelected, snap, settings.snapToGrid, setItemParent, addFolder]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (editable) return;
      if (e.key === 'Delete' && selectedIds.length) removeItems(selectedIds);
      else if (e.key === 'F2' && selectedIds.length === 1 && !isRoot(selectedIds[0])) setRenamingId(selectedIds[0]);
      else if (e.key === 'Enter' && selectedIds.length) {
        nodes.filter(b => selectedIds.includes(b.id)).forEach(activateNode);
      } else if (e.key === 'Escape') {
        clearSelection();
        setStartOpen(false);
        setMenu(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, nodes]);

  useEffect(() => {
    if (iconUploadId) iconFileRef.current?.click();
  }, [iconUploadId]);

  const handleIconFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = iconUploadId;
    e.target.value = '';
    setIconUploadId(null);
    if (!file || !id) return;
    const reader = new FileReader();
    reader.onload = () => setCustomIcon(id, reader.result as string);
    reader.readAsDataURL(file);
  };

  const buildIconMenu = (id: string): MenuItem[] => {
    const b = nodes.find(x => x.id === id);
    if (!b) return [];
    const multi = selectedIds.length > 1 && selectedIds.includes(id);
    const isFolder = b.kind === 'folder';
    const isBookmark = b.kind === 'bookmark';

    const out: MenuItem[] = [
      {
        label: multi ? `Open ${selectedIds.length} items` : 'Open',
        icon: <ExternalLink className="w-4 h-4" />,
        onClick: () => {
          if (multi) nodes.filter(x => selectedIds.includes(x.id)).forEach(activateNode);
          else activateNode(b);
        },
      },
    ];

    if (isBookmark) {
      out.push({
        label: 'Upload icon…',
        icon: <ImageIcon className="w-4 h-4" />,
        disabled: multi,
        onClick: () => setIconUploadId(id),
      });
      out.push({
        label: 'Set icon from URL…',
        icon: <Link2 className="w-4 h-4" />,
        disabled: multi,
        onClick: () => setIconUrlDialogId(id),
      });
      if (b.customIcon) {
        out.push({
          label: 'Reset icon',
          icon: <RefreshCw className="w-4 h-4" />,
          disabled: multi,
          onClick: () => setCustomIcon(id, null),
        });
      }
    }

    if (b.parentId !== ROOT_DESKTOP && !isRoot(id)) {
      out.push({
        label: 'Move to desktop',
        icon: <FolderInput className="w-4 h-4" />,
        onClick: () => selectedIds.forEach(sid => setItemParent(sid, ROOT_DESKTOP)),
      });
    }

    if (!isRoot(id)) {
      out.push({ label: '', separator: true, onClick: () => {} });
      out.push({
        label: 'Rename',
        icon: <Pencil className="w-4 h-4" />,
        disabled: multi,
        onClick: () => setRenamingId(id),
      });
      out.push({
        label: multi ? `Delete ${selectedIds.length}` : 'Delete',
        icon: <Trash2 className="w-4 h-4" />,
        destructive: true,
        onClick: () => removeItems(multi ? selectedIds : [id]),
      });
    }
    return out;
  };

  const buildDesktopMenu = (): MenuItem[] => {
    const mx = menu?.x ?? 100, my = menu?.y ?? 100;
    return [
      {
        label: 'New bookmark',
        icon: <Plus className="w-4 h-4" />,
        onClick: () => setDialogOpen(true),
      },
      {
        label: 'New folder',
        icon: <FolderPlus className="w-4 h-4" />,
        onClick: () => {
          const c = clampPos(mx - 40, my - 40);
          const id = addFolder({ x: c.x, y: c.y, parentId: ROOT_DESKTOP });
          setSelected([id]);
          setRenamingId(id);
        },
      },
      {
        label: 'New text file',
        icon: <FileTextIcon className="w-4 h-4" />,
        onClick: () => {
          const c = clampPos(mx - 40, my - 40);
          const id = addTextFile({ name: 'New File.txt', parentId: ROOT_DESKTOP, x: c.x, y: c.y });
          setSelected([id]);
          setRenamingId(id);
        },
      },
      { label: '', separator: true, onClick: () => {} },
      {
        label: 'Open File Explorer',
        icon: <FolderOpen className="w-4 h-4" />,
        onClick: () => openFileExplorerAt(ROOT_DESKTOP),
      },
      {
        label: settings.snapToGrid ? 'Disable snap to grid' : 'Enable snap to grid',
        icon: <RefreshCw className="w-4 h-4" />,
        onClick: () => setSettings({ snapToGrid: !settings.snapToGrid }),
      },
    ];
  };

  if (!hydrated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  const iconUrlNode = iconUrlDialogId ? nodes.find(n => n.id === iconUrlDialogId) : null;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundImage: `url(${settings.wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onMouseDown={onDesktopMouseDown}
      onContextMenu={onDesktopContextMenu}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 pointer-events-none" />

      <div className="absolute inset-0" style={{ paddingBottom: TASKBAR_H }}>
        {desktopNodes.map(node => (
          <DesktopIcon
            key={node.id}
            node={node}
            selected={selectedIds.includes(node.id)}
            isRenaming={renamingId === node.id}
            isDropTarget={dropTargetId === node.id}
            onMouseDown={onIconMouseDown}
            onContextMenu={onIconContextMenu}
            onActivate={activateNode}
            onRenameSubmit={(id, t) => { renameItem(id, t); setRenamingId(null); }}
            onRenameCancel={() => setRenamingId(null)}
          />
        ))}
      </div>

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

      <WindowHost />

      {startOpen && (
        <StartMenu
          onClose={() => setStartOpen(false)}
          onAddBookmark={() => { setStartOpen(false); setDialogOpen(true); }}
        />
      )}

      <Taskbar
        startOpen={startOpen}
        onStartClick={() => setStartOpen(o => !o)}
        onAddClick={() => setDialogOpen(true)}
      />

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={menu.type === 'icon' ? buildIconMenu(menu.iconId) : buildDesktopMenu()}
        />
      )}

      <AddBookmarkDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={(d) => addBookmark({
          name: d.name, url: d.url, favicon: d.favicon,
          customIcon: d.customIcon, parentId: ROOT_DESKTOP,
        })}
      />

      <IconUrlDialog
        open={iconUrlDialogId !== null}
        initialUrl={iconUrlNode?.customIcon && !iconUrlNode.customIcon.startsWith('data:') ? iconUrlNode.customIcon : ''}
        itemTitle={iconUrlNode?.name}
        onClose={() => setIconUrlDialogId(null)}
        onSave={(url) => { if (iconUrlDialogId) setCustomIcon(iconUrlDialogId, url); }}
      />

      <NotepadWindow />

      <input
        ref={iconFileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleIconFile}
      />
    </div>
  );
}
