import { useEffect, useMemo, useRef, useState } from 'react';
import { Win } from './Win';
import { WindowState, useWMStore } from '@/store/wmStore';
import { useFsStore } from '@/store/fsStore';
import { FsNode, ROOT_DESKTOP, ROOT_DOCUMENTS, ROOT_PICTURES, ROOT_IDS, isRoot } from '@/types/fs';
import { NodeIcon } from './NodeIcon';
import { ContextMenu, MenuItem } from './ContextMenu';
import {
  ArrowLeft, ArrowRight, ArrowUp, FolderPlus, LayoutGrid, List as ListIcon,
  Trash2, Pencil, Plus, ExternalLink, Monitor, FileText, Image as ImageIcon, FolderInput,
  Search, Info, Pin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { activateNode } from '@/lib/appLauncher';
import { formatSize, nodeSize, nodeTypeLabel, searchableText } from '@/lib/fsMeta';

interface Props {
  win: WindowState;
}

type View = 'grid' | 'list';

interface NavState {
  history: string[];   // stack of folderIds visited
  index: number;       // current pointer
}

const SIDEBAR_ITEMS = [
  { id: ROOT_DESKTOP, label: 'Desktop', icon: <Monitor className="w-4 h-4" /> },
  { id: ROOT_DOCUMENTS, label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  { id: ROOT_PICTURES, label: 'Pictures', icon: <ImageIcon className="w-4 h-4" /> },
];

export function FileExplorer({ win }: Props) {
  const initial = (win.props.folderId as string) || ROOT_DESKTOP;
  const { nodes, addFolder, addTextFile, removeItems, renameItem, setItemParent, pinItem } = useFsStore();
  const { setProps, setTitle } = useWMStore();

  const [view, setView] = useState<View>((win.props.view as View) || 'grid');
  const [nav, setNav] = useState<NavState>({ history: [initial], index: 0 });
  const currentId = nav.history[nav.index];

  const [selected, setSelected] = useState<string[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);
  const [dragHover, setDragHover] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchAll, setSearchAll] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);

  // Persist view + folder back to window props so it survives re-render
  useEffect(() => {
    setProps(win.id, { folderId: currentId, view });
  }, [currentId, view, win.id, setProps]);

  const liveNodes = nodes.filter(n => !n.deletedAt);
  const current = liveNodes.find(n => n.id === currentId);
  useEffect(() => {
    setTitle(win.id, current?.name || 'File Explorer');
  }, [current?.name, win.id, setTitle]);

  const children = useMemo(
    () => liveNodes
      .filter(n => (searchAll ? !isRoot(n.id) : n.parentId === currentId))
      .filter(n => !query.trim() || searchableText(n).includes(query.trim().toLowerCase()))
      .sort((a, b) => {
      // folders first, then by name
      if (a.kind === 'folder' && b.kind !== 'folder') return -1;
      if (b.kind === 'folder' && a.kind !== 'folder') return 1;
      return a.name.localeCompare(b.name);
    }),
    [liveNodes, currentId, query, searchAll],
  );

  const navigate = (folderId: string) => {
    setSelected([]);
    setRenamingId(null);
    setNav(s => {
      const cut = s.history.slice(0, s.index + 1);
      return { history: [...cut, folderId], index: cut.length };
    });
  };

  const back = () => nav.index > 0 && setNav(s => ({ ...s, index: s.index - 1 }));
  const forward = () => nav.index < nav.history.length - 1 && setNav(s => ({ ...s, index: s.index + 1 }));
  const goUp = () => {
    if (!current || isRoot(current.id)) return;
    if (current.parentId) navigate(current.parentId);
  };

  // Breadcrumbs
  const crumbs = useMemo(() => {
    const out: FsNode[] = [];
    let cur: FsNode | undefined = current;
    while (cur) {
      out.unshift(cur);
      cur = cur.parentId ? liveNodes.find(n => n.id === cur!.parentId) : undefined;
    }
    return out;
  }, [current, liveNodes]);

  // Item click / dblclick
  const onItemClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const additive = e.ctrlKey || e.metaKey || e.shiftKey;
    setSelected(s => {
      if (additive) return s.includes(id) ? s.filter(x => x !== id) : [...s, id];
      return [id];
    });
  };
  const onItemDouble = (n: FsNode) => {
    if (n.kind === 'folder') navigate(n.id);
    else activateNode(n);
  };

  const onItemContext = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!selected.includes(id)) setSelected([id]);
    setMenu({ x: e.clientX, y: e.clientY, nodeId: id });
  };
  const onBgContext = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, nodeId: null });
  };

  // Drag and drop using native HTML5 DnD (works between explorer windows + desktop)
  const onDragStart = (e: React.DragEvent, id: string) => {
    const ids = selected.includes(id) ? selected : [id];
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-fs-ids', JSON.stringify(ids));
  };
  const onDragEnd = () => { setDraggingId(null); setDragHover(null); };

  const handleDropOnNode = (targetId: string, raw: string) => {
    try {
      const ids: string[] = JSON.parse(raw);
      const target = nodes.find(n => n.id === targetId);
      if (!target) return;
      if (target.kind !== 'folder') return; // only folders accept drops
      // prevent dropping a folder into itself or descendants (store guards too)
      ids.forEach(id => { if (id !== targetId) setItemParent(id, targetId); });
      setSelected([]);
    } catch { /* ignore */ }
  };

  const handleDropOnBackground = (raw: string) => {
    try {
      const ids: string[] = JSON.parse(raw);
      ids.forEach(id => { if (id !== currentId) setItemParent(id, currentId); });
      setSelected([]);
    } catch { /* ignore */ }
  };

  const onNodeDragOver = (e: React.DragEvent, nodeId: string) => {
    if (!e.dataTransfer.types.includes('application/x-fs-ids')) return;
    const node = nodes.find(n => n.id === nodeId);
    if (node?.kind !== 'folder') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragHover(nodeId);
  };
  const onNodeDragLeave = (nodeId: string) => {
    setDragHover(h => (h === nodeId ? null : h));
  };
  const onNodeDrop = (e: React.DragEvent, nodeId: string) => {
    if (!e.dataTransfer.types.includes('application/x-fs-ids')) return;
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-fs-ids');
    handleDropOnNode(nodeId, raw);
    setDragHover(null);
  };
  const onBgDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-fs-ids')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onBgDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-fs-ids')) return;
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-fs-ids');
    handleDropOnBackground(raw);
  };

  // Keyboard shortcuts (only when this window is focused)
  const isActive = useWMStore(s => s.activeId) === win.id;
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' && selected.length) {
        const removable = selected.filter(id => !isRoot(id));
        if (removable.length) removeItems(removable);
        setSelected([]);
      } else if (e.key === 'F2' && selected.length === 1 && !isRoot(selected[0])) {
        setRenamingId(selected[0]);
      } else if (e.key === 'Enter' && selected.length === 1) {
        const n = nodes.find(x => x.id === selected[0]);
        if (n) onItemDouble(n);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        goUp();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        (document.querySelector(`[data-explorer-search="${win.id}"]`) as HTMLInputElement | null)?.focus();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        forward();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, selected, nodes, removeItems, current?.id]);

  // Build context menu
  const buildMenu = (): MenuItem[] => {
    if (!menu) return [];
    if (menu.nodeId) {
      const node = nodes.find(n => n.id === menu.nodeId);
      if (!node) return [];
      const items: MenuItem[] = [
        {
          label: node.kind === 'folder' ? 'Open' : 'Open',
          icon: <ExternalLink className="w-4 h-4" />,
          onClick: () => onItemDouble(node),
        },
      ];
      if (node.parentId !== ROOT_DESKTOP && node.kind !== 'folder' || node.kind === 'folder' && node.parentId !== ROOT_DESKTOP) {
        items.push({
          label: 'Send to Desktop',
          icon: <FolderInput className="w-4 h-4" />,
          onClick: () => setItemParent(node.id, ROOT_DESKTOP),
        });
      }
      items.push({ label: '', separator: true, onClick: () => {} });
      items.push({
        label: 'Pin to taskbar',
        icon: <Pin className="w-4 h-4" />,
        disabled: isRoot(node.id),
        onClick: () => pinItem(node.id),
      });
      items.push({
        label: 'Rename',
        icon: <Pencil className="w-4 h-4" />,
        disabled: isRoot(node.id),
        onClick: () => setRenamingId(node.id),
      });
      items.push({
        label: selected.length > 1 && selected.includes(node.id) ? `Delete ${selected.length}` : 'Delete',
        icon: <Trash2 className="w-4 h-4" />,
        destructive: true,
        disabled: isRoot(node.id),
        onClick: () => {
          const ids = (selected.length > 1 && selected.includes(node.id) ? selected : [node.id]).filter(id => !isRoot(id));
          removeItems(ids);
          setSelected([]);
        },
      });
      return items;
    }
    // Background menu
    return [
      {
        label: 'New folder',
        icon: <FolderPlus className="w-4 h-4" />,
        onClick: () => {
          const id = addFolder({ parentId: currentId });
          setSelected([id]);
          setRenamingId(id);
        },
      },
      {
        label: 'New text file',
        icon: <FileText className="w-4 h-4" />,
        onClick: () => {
          const id = addTextFile({ name: 'New file.txt', parentId: currentId, content: '' });
          setSelected([id]);
          setRenamingId(id);
        },
      },
    ];
  };

  return (
    <Win win={win} icon={<FolderIcon />}>
      {/* Toolbar */}
      <div className="h-10 border-b border-border bg-muted/40 flex items-center px-2 gap-1 shrink-0">
        <ToolbarBtn onClick={back} disabled={nav.index === 0} title="Back"><ArrowLeft className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn onClick={forward} disabled={nav.index >= nav.history.length - 1} title="Forward"><ArrowRight className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn onClick={goUp} disabled={!current || isRoot(current.id) || !current.parentId} title="Up"><ArrowUp className="w-4 h-4" /></ToolbarBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarBtn onClick={() => {
          const id = addFolder({ parentId: currentId });
          setSelected([id]); setRenamingId(id);
        }} title="New folder"><FolderPlus className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => {
          const id = addTextFile({ name: 'New file.txt', parentId: currentId, content: '' });
          setSelected([id]); setRenamingId(id);
        }} title="New text file"><Plus className="w-4 h-4" /></ToolbarBtn>
        <div className="flex-1" />
        <ToolbarBtn onClick={() => setView('grid')} active={view === 'grid'} title="Icon view"><LayoutGrid className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => setView('list')} active={view === 'list'} title="List view"><ListIcon className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => setDetailsOpen(!detailsOpen)} active={detailsOpen} title="Details pane"><Info className="w-4 h-4" /></ToolbarBtn>
      </div>

      {/* Breadcrumbs */}
      <div className="h-8 border-b border-border bg-background/50 flex items-center px-3 text-xs gap-1 overflow-x-auto shrink-0">
        {crumbs.map((c, i) => (
          <div key={c.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground">›</span>}
            <button
              onClick={() => navigate(c.id)}
              className={cn(
                'px-1.5 py-0.5 rounded-sm hover:bg-foreground/10',
                i === crumbs.length - 1 && 'font-medium',
              )}
            >
              {c.name || 'Untitled'}
            </button>
          </div>
        ))}
      </div>

      <div className="h-9 border-b border-border bg-muted/20 flex items-center px-2 gap-2 shrink-0">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          data-explorer-search={win.id}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="h-7 flex-1 min-w-0 px-2 text-xs bg-background/70 border border-border rounded-sm outline-none focus:ring-1 focus:ring-primary"
        />
        <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <input type="checkbox" checked={searchAll} onChange={(e) => setSearchAll(e.target.checked)} />
          All folders
        </label>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <div className="w-44 border-r border-border bg-muted/30 overflow-y-auto shrink-0 p-1">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Quick access</div>
          {SIDEBAR_ITEMS.map(s => (
            <button
              key={s.id}
              onClick={() => navigate(s.id)}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('application/x-fs-ids')) {
                  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
                }
              }}
              onDrop={(e) => {
                if (!e.dataTransfer.types.includes('application/x-fs-ids')) return;
                e.preventDefault();
                handleDropOnNode(s.id, e.dataTransfer.getData('application/x-fs-ids'));
              }}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-foreground/10 text-left',
                currentId === s.id && 'bg-primary/15 text-foreground',
              )}
            >
              {s.icon}
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Files area */}
        <div
          className="flex-1 overflow-auto"
          onMouseDown={() => setSelected([])}
          onContextMenu={onBgContext}
          onDragOver={onBgDragOver}
          onDrop={onBgDrop}
        >
          {children.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              This folder is empty
            </div>
          ) : view === 'grid' ? (
            <div className="p-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
              {children.map(n => (
                <GridItem
                  key={n.id} node={n}
                  selected={selected.includes(n.id)}
                  renaming={renamingId === n.id}
                  isDropHover={dragHover === n.id}
                  isDragging={draggingId === n.id}
                  onClick={onItemClick}
                  onDoubleClick={onItemDouble}
                  onContext={onItemContext}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDragOverNode={onNodeDragOver}
                  onDragLeaveNode={onNodeDragLeave}
                  onDropNode={onNodeDrop}
                  onRenameDone={(name) => { renameItem(n.id, name); setRenamingId(null); }}
                  onRenameCancel={() => setRenamingId(null)}
                />
              ))}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground sticky top-0 bg-background/80 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-1.5 font-normal">Name</th>
                  <th className="text-left px-2 py-1.5 font-normal w-32">Type</th>
                  <th className="text-left px-2 py-1.5 font-normal w-44">Modified</th>
                  <th className="text-right px-3 py-1.5 font-normal w-20">Size</th>
                </tr>
              </thead>
              <tbody>
                {children.map(n => (
                  <ListRow
                    key={n.id} node={n}
                    selected={selected.includes(n.id)}
                    renaming={renamingId === n.id}
                    isDropHover={dragHover === n.id}
                    onClick={onItemClick}
                    onDoubleClick={onItemDouble}
                    onContext={onItemContext}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onDragOverNode={onNodeDragOver}
                    onDragLeaveNode={onNodeDragLeave}
                    onDropNode={onNodeDrop}
                    onRenameDone={(name) => { renameItem(n.id, name); setRenamingId(null); }}
                    onRenameCancel={() => setRenamingId(null)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
        {detailsOpen && (
          <DetailsPane node={selected.length === 1 ? liveNodes.find(n => n.id === selected[0]) : null} count={selected.length} />
        )}
      </div>

      {/* Status bar */}
      <div className="h-6 border-t border-border bg-muted/30 flex items-center px-3 text-[11px] text-muted-foreground shrink-0">
        {children.length} item{children.length === 1 ? '' : 's'}
        {selected.length > 0 && ` · ${selected.length} selected`}
      </div>

      {menu && (
        <ContextMenu
          x={menu.x} y={menu.y}
          items={buildMenu()}
          onClose={() => setMenu(null)}
        />
      )}
    </Win>
  );
}

function ToolbarBtn({ children, onClick, disabled, title, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded-sm hover:bg-foreground/10 disabled:opacity-30 disabled:pointer-events-none',
        active && 'bg-foreground/15',
      )}
    >
      {children}
    </button>
  );
}

interface ItemViewProps {
  node: FsNode;
  selected: boolean;
  renaming: boolean;
  isDropHover: boolean;
  isDragging?: boolean;
  onClick: (e: React.MouseEvent, id: string) => void;
  onDoubleClick: (n: FsNode) => void;
  onContext: (e: React.MouseEvent, id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOverNode: (e: React.DragEvent, id: string) => void;
  onDragLeaveNode: (id: string) => void;
  onDropNode: (e: React.DragEvent, id: string) => void;
  onRenameDone: (name: string) => void;
  onRenameCancel: () => void;
}

function GridItem(p: ItemViewProps) {
  return (
    <div
      data-fs-id={p.node.id}
      draggable={!p.renaming}
      onDragStart={(e) => p.onDragStart(e, p.node.id)}
      onDragEnd={p.onDragEnd}
      onDragOver={(e) => p.onDragOverNode(e, p.node.id)}
      onDragLeave={() => p.onDragLeaveNode(p.node.id)}
      onDrop={(e) => p.onDropNode(e, p.node.id)}
      onClick={(e) => p.onClick(e, p.node.id)}
      onDoubleClick={() => p.onDoubleClick(p.node)}
      onContextMenu={(e) => p.onContext(e, p.node.id)}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-sm cursor-default select-none',
        'hover:bg-foreground/5',
        p.selected && 'bg-primary/20 ring-1 ring-primary/50',
        p.isDropHover && 'bg-primary/30 ring-2 ring-primary',
        p.isDragging && 'opacity-50',
      )}
    >
      <NodeIcon node={p.node} size={44} />
      {p.renaming ? (
        <RenameInput initial={p.node.name} onDone={p.onRenameDone} onCancel={p.onRenameCancel} className="text-[11px] text-center" />
      ) : (
        <span className="text-[11px] text-center leading-tight line-clamp-2 break-words w-full">
          {p.node.name || <span className="opacity-50">(no name)</span>}
        </span>
      )}
    </div>
  );
}

function ListRow(p: Omit<ItemViewProps, 'isDragging'>) {
  const typeLabel = nodeTypeLabel(p.node);
  return (
    <tr
      draggable={!p.renaming}
      onDragStart={(e) => p.onDragStart(e, p.node.id)}
      onDragEnd={p.onDragEnd}
      onDragOver={(e) => p.onDragOverNode(e, p.node.id)}
      onDragLeave={() => p.onDragLeaveNode(p.node.id)}
      onDrop={(e) => p.onDropNode(e, p.node.id)}
      onClick={(e) => p.onClick(e, p.node.id)}
      onDoubleClick={() => p.onDoubleClick(p.node)}
      onContextMenu={(e) => p.onContext(e, p.node.id)}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        'cursor-default border-b border-border/40 hover:bg-foreground/5',
        p.selected && 'bg-primary/15',
        p.isDropHover && 'bg-primary/30',
      )}
    >
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          <NodeIcon node={p.node} size={16} />
          {p.renaming ? (
            <RenameInput initial={p.node.name} onDone={p.onRenameDone} onCancel={p.onRenameCancel} className="text-xs" />
          ) : (
            <span className="truncate">{p.node.name || <span className="opacity-50">(no name)</span>}</span>
          )}
        </div>
      </td>
      <td className="px-2 py-1.5 text-muted-foreground">{typeLabel}</td>
      <td className="px-2 py-1.5 text-muted-foreground">{new Date(p.node.modifiedAt).toLocaleString()}</td>
      <td className="px-3 py-1.5 text-right text-muted-foreground">{formatSize(nodeSize(p.node))}</td>
    </tr>
  );
}

function RenameInput({ initial, onDone, onCancel, className }: { initial: string; onDone: (s: string) => void; onCancel: () => void; className?: string }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.select(); });
  }, []);
  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') onDone(value);
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => onDone(value)}
      className={cn('px-1 bg-background border border-primary rounded-sm outline-none w-full', className)}
    />
  );
}

function DetailsPane({ node, count }: { node: FsNode | null | undefined; count: number }) {
  return (
    <div className="w-56 border-l border-border bg-muted/20 p-3 text-xs overflow-auto shrink-0">
      <div className="font-medium mb-3">Details</div>
      {!node ? (
        <div className="text-muted-foreground">{count > 1 ? `${count} items selected` : 'Select an item'}</div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 min-w-0">
            <NodeIcon node={node} size={28} />
            <div className="font-medium truncate">{node.name || 'Untitled'}</div>
          </div>
          <Detail label="Type" value={nodeTypeLabel(node)} />
          {node.url && <Detail label="URL" value={node.url} />}
          <Detail label="Size" value={formatSize(nodeSize(node))} />
          <Detail label="Created" value={new Date(node.createdAt).toLocaleString()} />
          <Detail label="Modified" value={new Date(node.modifiedAt).toLocaleString()} />
          {node.tags?.length ? <Detail label="Tags" value={node.tags.join(', ')} /> : null}
          {node.notes ? <Detail label="Notes" value={node.notes} /> : null}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="break-words">{value}</div>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="hsl(45 90% 60%)" stroke="hsl(45 90% 45%)" strokeWidth="0.6">
      <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
