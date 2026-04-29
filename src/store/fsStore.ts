import { create } from 'zustand';
import {
  FsNode, DesktopSettings, GRID,
  ROOT_DESKTOP, ROOT_DOCUMENTS, ROOT_PICTURES, ROOT_IDS, isRoot,
} from '@/types/fs';
import wallpaperDefault from '@/assets/wallpaper-default.jpg';
import { loadNodes, saveNodes, loadSettings, saveSettings, putBlob, deleteBlob } from '@/lib/fsdb';
import { getFaviconUrl, normalizeUrl } from '@/lib/favicon';

interface FsState {
  nodes: FsNode[];
  selectedIds: string[];
  settings: DesktopSettings;
  hydrated: boolean;
  openFolderId: string | null; // legacy - kept for compatibility but unused

  // Selection
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string, additive?: boolean) => void;
  clearSelection: () => void;

  // Settings
  setSettings: (patch: Partial<DesktopSettings>) => void;

  // Folder window (legacy)
  openFolder: (id: string | null) => void;

  // Generic node ops
  addBookmark: (b: { name: string; url: string; favicon?: string; customIcon?: string; parentId?: string | null; x?: number; y?: number }) => string;
  addFolder: (opts?: { name?: string; parentId?: string | null; x?: number; y?: number }) => string;
  addTextFile: (opts: { name: string; content?: string; parentId?: string | null; x?: number; y?: number }) => string;
  addImageFile: (opts: { name: string; blob: Blob; mimeType: string; parentId?: string | null; x?: number; y?: number }) => Promise<string>;

  removeItems: (ids: string[]) => void;
  renameItem: (id: string, name: string) => void;
  moveItems: (deltas: { id: string; x: number; y: number }[]) => void;
  setItemParent: (id: string, parentId: string | null, pos?: { x: number; y: number }) => void;
  setCustomIcon: (id: string, dataUrl: string | null) => void;
  updateTextFile: (id: string, content: string) => void;
  updateBookmark: (id: string, patch: { name?: string; url?: string; favicon?: string; customIcon?: string; notes?: string; tags?: string[] }) => void;
  markBookmarkOpened: (id: string) => void;
  restoreItems: (ids: string[]) => void;
  emptyRecycleBin: () => void;
  importBookmarksHtml: (html: string, parentMode: 'desktop' | 'folder') => { ok: boolean; count: number; error?: string };
  pinItem: (id: string) => void;
  unpinItem: (id: string) => void;
  reorderPinned: (fromId: string, toId: string) => void;
  sortFolder: (parentId: string, by: 'name' | 'type' | 'created') => void;
  alignFolderToGrid: (parentId: string) => void;
  saveLayoutPreset: (name: string, parentId?: string) => void;
  restoreLayoutPreset: (name: string) => void;
  saveWorkspace: (name: string) => void;
  switchWorkspace: (id: string) => void;

  // Export / import
  exportItems: () => string;
  importItems: (json: string, mode: 'merge' | 'replace') => { ok: boolean; count: number; error?: string };

  // Hydration
  _hydrate: () => Promise<void>;
}

const findEmptySpot = (nodes: FsNode[], parentId: string | null): { x: number; y: number } => {
  const siblings = nodes.filter(n => n.parentId === parentId);
  const occupied = new Set(siblings.map(b => `${Math.round(b.x / GRID)},${Math.round(b.y / GRID)}`));
  const cols = Math.max(2, Math.floor((window.innerWidth - 24) / GRID));
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < 12; row++) {
      const key = `${col},${row}`;
      if (!occupied.has(key)) return { x: col * GRID + 12, y: row * GRID + 12 };
    }
  }
  return { x: 12, y: 12 };
};

const seedNodes = (): FsNode[] => {
  const now = Date.now();
  const roots: FsNode[] = [
    { id: ROOT_DESKTOP, parentId: null, kind: 'folder', name: 'Desktop', x: 0, y: 0, createdAt: now, modifiedAt: now },
    { id: ROOT_DOCUMENTS, parentId: null, kind: 'folder', name: 'Documents', x: 0, y: 0, createdAt: now, modifiedAt: now },
    { id: ROOT_PICTURES, parentId: null, kind: 'folder', name: 'Pictures', x: 0, y: 0, createdAt: now, modifiedAt: now },
  ];
  const seedBookmarks: FsNode[] = [
    { id: crypto.randomUUID(), parentId: ROOT_DESKTOP, kind: 'bookmark', name: 'Google', url: 'https://google.com', favicon: 'https://www.google.com/s2/favicons?domain=google.com&sz=64', x: 12, y: 12, createdAt: now, modifiedAt: now },
    { id: crypto.randomUUID(), parentId: ROOT_DESKTOP, kind: 'bookmark', name: 'YouTube', url: 'https://youtube.com', favicon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64', x: 12, y: 108, createdAt: now, modifiedAt: now },
    { id: crypto.randomUUID(), parentId: ROOT_DESKTOP, kind: 'bookmark', name: 'GitHub', url: 'https://github.com', favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64', x: 12, y: 204, createdAt: now, modifiedAt: now },
  ];
  const welcomeTxt: FsNode = {
    id: crypto.randomUUID(), parentId: ROOT_DOCUMENTS, kind: 'file', name: 'Welcome.txt',
    mimeType: 'text/plain',
    textContent: 'Welcome to your Win10-style new tab!\n\nThis file lives in Documents. Open it from File Explorer.\n',
    x: 12, y: 12, createdAt: now, modifiedAt: now,
  };
  return [...roots, ...seedBookmarks, welcomeTxt];
};

// Migrate from legacy localStorage store
const migrateFromLocalStorage = (): FsNode[] | null => {
  try {
    const raw = localStorage.getItem('win10-desktop-store');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const items = parsed?.state?.items as Array<{
      id: string; kind: 'bookmark' | 'folder'; title: string; x: number; y: number;
      parentId: string | null; createdAt: number; url?: string; favicon?: string; customIcon?: string;
    }> | undefined;
    if (!items?.length) return null;
    const now = Date.now();
    const roots: FsNode[] = [
      { id: ROOT_DESKTOP, parentId: null, kind: 'folder', name: 'Desktop', x: 0, y: 0, createdAt: now, modifiedAt: now },
      { id: ROOT_DOCUMENTS, parentId: null, kind: 'folder', name: 'Documents', x: 0, y: 0, createdAt: now, modifiedAt: now },
      { id: ROOT_PICTURES, parentId: null, kind: 'folder', name: 'Pictures', x: 0, y: 0, createdAt: now, modifiedAt: now },
    ];
    const migrated: FsNode[] = items.map(it => ({
      id: it.id,
      // Top-level items go inside Desktop root; nested items keep their parent
      parentId: it.parentId === null ? ROOT_DESKTOP : it.parentId,
      kind: it.kind,
      name: it.title,
      x: it.x, y: it.y,
      createdAt: it.createdAt || now,
      modifiedAt: it.createdAt || now,
      url: it.url, favicon: it.favicon, customIcon: it.customIcon,
    }));
    return [...roots, ...migrated];
  } catch {
    return null;
  }
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const persistNodes = (nodes: FsNode[]) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveNodes(nodes).catch(console.error); }, 200);
};

const touch = (n: FsNode): FsNode => ({ ...n, modifiedAt: Date.now() });

const collectWithDescendants = (all: FsNode[], ids: string[]) => {
  const out = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const it of all) {
      if (it.parentId && out.has(it.parentId) && !out.has(it.id)) {
        out.add(it.id);
        changed = true;
      }
    }
  }
  return out;
};

const visibleNodes = (nodes: FsNode[]) => nodes.filter(n => !n.deletedAt);

const layoutItems = (items: FsNode[]) => items.map((node, index) => ({
  id: node.id,
  x: 12 + Math.floor(index / 8) * GRID,
  y: 12 + (index % 8) * GRID,
}));

const defaultSettings = (): DesktopSettings => ({
  theme: 'dark',
  windowTheme: 'glassy-vista',
  fontFamily: 'system',
  wallpaper: wallpaperDefault,
  wallpapers: [wallpaperDefault],
  wallpaperShuffleEnabled: false,
  wallpaperShuffleMinutes: 15,
  wallpaperLastShuffleAt: Date.now(),
  snapToGrid: false,
  autoArrange: false,
  pinnedIds: [],
  layoutPresets: {},
  workspaces: [],
  activeWorkspaceId: 'default',
  googleAccounts: [],
});

const normalizeGoogleAccounts = (accounts: DesktopSettings['googleAccounts'] | undefined) => {
  if (!Array.isArray(accounts)) return [];
  return accounts
    .map((account, index) => ({
      id: account.id || `gmail-account-${index}`,
      label: (account.label || account.email || `Gmail ${index + 1}`).trim(),
      email: account.email?.trim() || undefined,
      gmailUrl: account.gmailUrl || `https://mail.google.com/mail/u/${index}/`,
    }))
    .filter(account => account.label.length > 0);
};

const normalizeSettings = (settings: Partial<DesktopSettings> | null | undefined): DesktopSettings => {
  const defaults = defaultSettings();
  const wallpaper = settings?.wallpaper || defaults.wallpaper;
  const wallpapers = Array.from(new Set([...(settings?.wallpapers ?? []), wallpaper].filter(Boolean)));
  return {
    ...defaults,
    ...settings,
    wallpaper,
    windowTheme: settings?.windowTheme || defaults.windowTheme,
    fontFamily: settings?.fontFamily || defaults.fontFamily,
    wallpapers: wallpapers.length ? wallpapers : [wallpaper],
    wallpaperShuffleMinutes: Math.max(1, settings?.wallpaperShuffleMinutes ?? defaults.wallpaperShuffleMinutes),
    wallpaperLastShuffleAt: settings?.wallpaperLastShuffleAt ?? defaults.wallpaperLastShuffleAt,
    autoArrange: settings?.autoArrange ?? defaults.autoArrange,
    pinnedIds: settings?.pinnedIds ?? defaults.pinnedIds,
    layoutPresets: settings?.layoutPresets ?? defaults.layoutPresets,
    workspaces: settings?.workspaces ?? defaults.workspaces,
    activeWorkspaceId: settings?.activeWorkspaceId ?? defaults.activeWorkspaceId,
    googleAccounts: normalizeGoogleAccounts(settings?.googleAccounts),
  };
};

export const useFsStore = create<FsState>()((setState, get) => ({
  nodes: [],
  selectedIds: [],
  settings: defaultSettings(),
  hydrated: false,
  openFolderId: null,

  _hydrate: async () => {
    let nodes = await loadNodes();
    if (!nodes || nodes.length === 0) {
      nodes = migrateFromLocalStorage() ?? seedNodes();
      await saveNodes(nodes);
    } else {
      // Ensure root folders always exist
      const have = new Set(nodes.map(n => n.id));
      const now = Date.now();
      const missing: FsNode[] = [];
      if (!have.has(ROOT_DESKTOP)) missing.push({ id: ROOT_DESKTOP, parentId: null, kind: 'folder', name: 'Desktop', x: 0, y: 0, createdAt: now, modifiedAt: now });
      if (!have.has(ROOT_DOCUMENTS)) missing.push({ id: ROOT_DOCUMENTS, parentId: null, kind: 'folder', name: 'Documents', x: 0, y: 0, createdAt: now, modifiedAt: now });
      if (!have.has(ROOT_PICTURES)) missing.push({ id: ROOT_PICTURES, parentId: null, kind: 'folder', name: 'Pictures', x: 0, y: 0, createdAt: now, modifiedAt: now });
      if (missing.length) { nodes = [...missing, ...nodes]; await saveNodes(nodes); }
    }
    const settings = normalizeSettings(await loadSettings<Partial<DesktopSettings>>());
    setState({ nodes, settings, hydrated: true });
  },

  setSelected: (ids) => setState({ selectedIds: ids }),
  toggleSelected: (id, additive) => {
    const cur = get().selectedIds;
    if (additive) setState({ selectedIds: cur.includes(id) ? cur.filter(i => i !== id) : [...cur, id] });
    else setState({ selectedIds: [id] });
  },
  clearSelection: () => setState({ selectedIds: [] }),

  setSettings: (patch) => {
    const next = normalizeSettings({ ...get().settings, ...patch });
    setState({ settings: next });
    saveSettings(next).catch(console.error);
  },

  openFolder: (id) => setState({ openFolderId: id }),

  addBookmark: (b) => {
    const parentId = b.parentId ?? ROOT_DESKTOP;
    const spot = b.x !== undefined && b.y !== undefined
      ? { x: b.x, y: b.y }
      : findEmptySpot(get().nodes, parentId);
    const id = crypto.randomUUID();
    const node: FsNode = {
      id, parentId, kind: 'bookmark', name: b.name,
      url: b.url, favicon: b.favicon, customIcon: b.customIcon,
      x: spot.x, y: spot.y, createdAt: Date.now(), modifiedAt: Date.now(),
    };
    const nodes = [...get().nodes, node];
    setState({ nodes }); persistNodes(nodes);
    return id;
  },

  addFolder: (opts = {}) => {
    const parentId = opts.parentId ?? ROOT_DESKTOP;
    const spot = opts.x !== undefined && opts.y !== undefined
      ? { x: opts.x, y: opts.y }
      : findEmptySpot(get().nodes, parentId);
    const id = crypto.randomUUID();
    const node: FsNode = {
      id, parentId, kind: 'folder', name: opts.name ?? '',
      x: spot.x, y: spot.y, createdAt: Date.now(), modifiedAt: Date.now(),
    };
    const nodes = [...get().nodes, node];
    setState({ nodes }); persistNodes(nodes);
    return id;
  },

  addTextFile: (opts) => {
    const parentId = opts.parentId ?? ROOT_DOCUMENTS;
    const spot = opts.x !== undefined && opts.y !== undefined
      ? { x: opts.x, y: opts.y }
      : findEmptySpot(get().nodes, parentId);
    const id = crypto.randomUUID();
    const node: FsNode = {
      id, parentId, kind: 'file', name: opts.name,
      mimeType: 'text/plain', textContent: opts.content ?? '',
      x: spot.x, y: spot.y, createdAt: Date.now(), modifiedAt: Date.now(),
    };
    const nodes = [...get().nodes, node];
    setState({ nodes }); persistNodes(nodes);
    return id;
  },

  addImageFile: async (opts) => {
    const parentId = opts.parentId ?? ROOT_PICTURES;
    const spot = opts.x !== undefined && opts.y !== undefined
      ? { x: opts.x, y: opts.y }
      : findEmptySpot(get().nodes, parentId);
    const id = crypto.randomUUID();
    const blobKey = `blob-${id}`;
    await putBlob(blobKey, opts.blob);
    const node: FsNode = {
      id, parentId, kind: 'file', name: opts.name,
      mimeType: opts.mimeType, blobKey, size: opts.blob.size,
      x: spot.x, y: spot.y, createdAt: Date.now(), modifiedAt: Date.now(),
    };
    const nodes = [...get().nodes, node];
    setState({ nodes }); persistNodes(nodes);
    return id;
  },

  removeItems: (ids) => {
    // Block deleting root folders
    const filtered = ids.filter(id => !isRoot(id));
    if (filtered.length === 0) return;
    const all = get().nodes;
    const toRemove = collectWithDescendants(all, filtered);
    const now = Date.now();
    const nodes = all.map(n => toRemove.has(n.id) && !n.deletedAt
      ? {
          ...n,
          deletedAt: now,
          originalParentId: n.parentId,
          originalX: n.x,
          originalY: n.y,
          parentId: null,
          modifiedAt: now,
        }
      : n);
    setState({
      nodes,
      selectedIds: get().selectedIds.filter(id => !toRemove.has(id)),
    });
    persistNodes(nodes);
  },

  renameItem: (id, name) => {
    if (isRoot(id)) return;
    const nodes = get().nodes.map(n => n.id === id ? touch({ ...n, name }) : n);
    setState({ nodes }); persistNodes(nodes);
  },

  moveItems: (deltas) => {
    const map = new Map(deltas.map(d => [d.id, d]));
    const nodes = get().nodes.map(n => {
      const d = map.get(n.id);
      return d ? { ...n, x: d.x, y: d.y } : n;
    });
    setState({ nodes }); persistNodes(nodes);
  },

  setItemParent: (id, parentId, pos) => {
    if (isRoot(id)) return;
    // Forbid putting a folder inside itself or descendants
    if (parentId) {
      let cur: string | null = parentId;
      while (cur) {
        if (cur === id) return;
        const p: FsNode | undefined = get().nodes.find(n => n.id === cur);
        cur = p?.parentId ?? null;
      }
    }
    const target = parentId === null ? ROOT_DESKTOP : parentId;
    const nodes = get().nodes.map(n => {
      if (n.id !== id) return n;
      const next: FsNode = { ...n, parentId: target, modifiedAt: Date.now() };
      if (pos) { next.x = pos.x; next.y = pos.y; }
      else if (target !== n.parentId) {
        const spot = findEmptySpot(get().nodes.filter(x => x.id !== id), target);
        next.x = spot.x; next.y = spot.y;
      }
      return next;
    });
    setState({ nodes }); persistNodes(nodes);
  },

  setCustomIcon: (id, dataUrl) => {
    const nodes = get().nodes.map(n => n.id === id ? touch({ ...n, customIcon: dataUrl ?? undefined }) : n);
    setState({ nodes }); persistNodes(nodes);
  },

  updateTextFile: (id, content) => {
    const nodes = get().nodes.map(n => n.id === id ? touch({ ...n, textContent: content, size: new Blob([content]).size }) : n);
    setState({ nodes }); persistNodes(nodes);
  },

  updateBookmark: (id, patch) => {
    const nodes = get().nodes.map(n => n.id === id && n.kind === 'bookmark' ? touch({ ...n, ...patch }) : n);
    setState({ nodes }); persistNodes(nodes);
  },

  markBookmarkOpened: (id) => {
    const nodes = get().nodes.map(n => n.id === id && n.kind === 'bookmark'
      ? touch({ ...n, openCount: (n.openCount ?? 0) + 1, lastOpenedAt: Date.now() })
      : n);
    setState({ nodes }); persistNodes(nodes);
  },

  restoreItems: (ids) => {
    const all = get().nodes;
    const target = collectWithDescendants(all, ids);
    const liveIds = new Set(all.filter(n => !n.deletedAt).map(n => n.id));
    const nodes = all.map(n => {
      if (!target.has(n.id)) return n;
      const parentId = n.originalParentId && liveIds.has(n.originalParentId) ? n.originalParentId : ROOT_DESKTOP;
      return {
        ...n,
        deletedAt: undefined,
        parentId,
        x: n.originalX ?? n.x,
        y: n.originalY ?? n.y,
        originalParentId: undefined,
        originalX: undefined,
        originalY: undefined,
        modifiedAt: Date.now(),
      };
    });
    setState({ nodes, selectedIds: [] }); persistNodes(nodes);
  },

  emptyRecycleBin: () => {
    const all = get().nodes;
    for (const n of all) {
      if (n.deletedAt && n.blobKey) deleteBlob(n.blobKey).catch(() => {});
    }
    const nodes = all.filter(n => !n.deletedAt);
    setState({ nodes, selectedIds: [] }); persistNodes(nodes);
  },

  importBookmarksHtml: (html, parentMode) => {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const now = Date.now();
      const nodes = [...get().nodes];
      const rootParent = parentMode === 'folder'
        ? (() => {
            const id = crypto.randomUUID();
            nodes.push({ id, parentId: ROOT_DESKTOP, kind: 'folder', name: 'Imported Bookmarks', x: 12, y: 12, createdAt: now, modifiedAt: now });
            return id;
          })()
        : ROOT_DESKTOP;
      let count = 0;
      const walk = (container: Element, parentId: string) => {
        Array.from(container.children).forEach((child) => {
          if (child.tagName === 'DT') {
            const h3 = child.querySelector(':scope > H3');
            const a = child.querySelector(':scope > A') as HTMLAnchorElement | null;
            const dl = child.querySelector(':scope > DL');
            if (h3) {
              const id = crypto.randomUUID();
              nodes.push({
                id, parentId, kind: 'folder', name: h3.textContent?.trim() || 'Folder',
                x: 12, y: 12 + count * GRID, createdAt: now, modifiedAt: now,
              });
              if (dl) walk(dl, id);
            } else if (a?.href) {
              const url = normalizeUrl(a.getAttribute('href') || a.href);
              nodes.push({
                id: crypto.randomUUID(), parentId, kind: 'bookmark',
                name: a.textContent?.trim() || url, url,
                favicon: a.getAttribute('ICON') || getFaviconUrl(url),
                x: 12, y: 12 + count * GRID, createdAt: now, modifiedAt: now,
              });
              count += 1;
            } else if (dl) {
              walk(dl, parentId);
            }
          } else if (child.tagName === 'DL') {
            walk(child, parentId);
          }
        });
      };
      const dl = doc.querySelector('DL');
      if (!dl) return { ok: false, count: 0, error: 'No bookmarks found in HTML export' };
      walk(dl, rootParent);
      const arranged = nodes.map(n => n.parentId === rootParent && n.createdAt === now ? { ...n, ...findEmptySpot(nodes, rootParent) } : n);
      setState({ nodes: arranged, selectedIds: [] }); persistNodes(arranged);
      return { ok: true, count };
    } catch (e) {
      return { ok: false, count: 0, error: (e as Error).message };
    }
  },

  pinItem: (id) => {
    const settings = get().settings;
    if (settings.pinnedIds.includes(id)) return;
    get().setSettings({ pinnedIds: [...settings.pinnedIds, id] });
  },

  unpinItem: (id) => {
    const settings = get().settings;
    get().setSettings({ pinnedIds: settings.pinnedIds.filter(x => x !== id) });
  },

  reorderPinned: (fromId, toId) => {
    const pinned = [...get().settings.pinnedIds];
    const from = pinned.indexOf(fromId);
    const to = pinned.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    const [item] = pinned.splice(from, 1);
    pinned.splice(to, 0, item);
    get().setSettings({ pinnedIds: pinned });
  },

  sortFolder: (parentId, by) => {
    const items = visibleNodes(get().nodes)
      .filter(n => n.parentId === parentId)
      .sort((a, b) => {
        if (by === 'type') return a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name);
        if (by === 'created') return a.createdAt - b.createdAt;
        return a.name.localeCompare(b.name);
      });
    get().moveItems(layoutItems(items));
  },

  alignFolderToGrid: (parentId) => {
    const updates = visibleNodes(get().nodes)
      .filter(n => n.parentId === parentId)
      .map(n => ({ id: n.id, x: Math.round((n.x - 12) / GRID) * GRID + 12, y: Math.round((n.y - 12) / GRID) * GRID + 12 }));
    get().moveItems(updates);
  },

  saveLayoutPreset: (name, parentId = ROOT_DESKTOP) => {
    const layout = Object.fromEntries(visibleNodes(get().nodes).filter(n => n.parentId === parentId).map(n => [n.id, { x: n.x, y: n.y }]));
    get().setSettings({ layoutPresets: { ...get().settings.layoutPresets, [name]: layout } });
  },

  restoreLayoutPreset: (name) => {
    const preset = get().settings.layoutPresets[name];
    if (!preset) return;
    get().moveItems(Object.entries(preset).map(([id, pos]) => ({ id, x: pos.x, y: pos.y })));
  },

  saveWorkspace: (name) => {
    const settings = get().settings;
    const id = crypto.randomUUID();
    const workspace = {
      id, name,
      nodeIds: visibleNodes(get().nodes).filter(n => n.parentId === ROOT_DESKTOP).map(n => n.id),
      wallpaper: settings.wallpaper,
      pinnedIds: settings.pinnedIds,
    };
    get().setSettings({ workspaces: [...settings.workspaces, workspace], activeWorkspaceId: id });
  },

  switchWorkspace: (id) => {
    const workspace = get().settings.workspaces.find(w => w.id === id);
    if (!workspace) return;
    const patch: Partial<DesktopSettings> = { activeWorkspaceId: id };
    if (workspace.wallpaper) patch.wallpaper = workspace.wallpaper;
    if (workspace.pinnedIds) patch.pinnedIds = workspace.pinnedIds;
    get().setSettings(patch);
  },

  exportItems: () => {
    return JSON.stringify(
      { version: 3, exportedAt: new Date().toISOString(), nodes: get().nodes },
      null, 2,
    );
  },

  importItems: (json, mode) => {
    try {
      const parsed = JSON.parse(json);
      const incoming: FsNode[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.nodes)
          ? parsed.nodes
          : Array.isArray(parsed?.items)
            // legacy v2 items
            ? parsed.items.map((it: { id: string; kind: 'bookmark' | 'folder'; title: string; x: number; y: number; parentId: string | null; createdAt: number; url?: string; favicon?: string; customIcon?: string }) => ({
                id: it.id,
                parentId: it.parentId === null ? ROOT_DESKTOP : it.parentId,
                kind: it.kind, name: it.title,
                x: it.x, y: it.y,
                createdAt: it.createdAt || Date.now(),
                modifiedAt: it.createdAt || Date.now(),
                url: it.url, favicon: it.favicon, customIcon: it.customIcon,
              }))
            : [];
      if (!incoming.length) return { ok: false, count: 0, error: 'No items found in file' };

      const valid = incoming.filter(it =>
        it && typeof it.name === 'string' &&
        (it.kind === 'bookmark' || it.kind === 'folder' || it.kind === 'file') &&
        !ROOT_IDS.includes(it.id as typeof ROOT_IDS[number])
      );

      const idMap = new Map<string, string>();
      valid.forEach(it => idMap.set(it.id, crypto.randomUUID()));

      const remapped: FsNode[] = valid.map(it => ({
        ...it,
        id: idMap.get(it.id)!,
        parentId: it.parentId
          ? (ROOT_IDS as readonly string[]).includes(it.parentId)
            ? it.parentId
            : (idMap.get(it.parentId) ?? ROOT_DESKTOP)
          : ROOT_DESKTOP,
        createdAt: it.createdAt || Date.now(),
        modifiedAt: it.modifiedAt || Date.now(),
      }));

      let base: FsNode[];
      if (mode === 'replace') {
        // Keep root folders only
        base = get().nodes.filter(n => isRoot(n.id));
      } else {
        base = get().nodes;
      }
      const finalNodes = [...base];
      for (const it of remapped) {
        if (mode === 'merge' && it.parentId === ROOT_DESKTOP) {
          const spot = findEmptySpot(finalNodes, ROOT_DESKTOP);
          finalNodes.push({ ...it, x: spot.x, y: spot.y });
        } else {
          finalNodes.push(it);
        }
      }
      setState({ nodes: finalNodes, selectedIds: [] });
      persistNodes(finalNodes);
      return { ok: true, count: remapped.length };
    } catch (e) {
      return { ok: false, count: 0, error: (e as Error).message };
    }
  },
}));

// Trigger hydration on first import
if (typeof window !== 'undefined') {
  useFsStore.getState()._hydrate();
}
