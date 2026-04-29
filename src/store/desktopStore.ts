import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DesktopItem, DesktopSettings, GRID } from '@/types/desktop';
import wallpaperDefault from '@/assets/wallpaper-default.jpg';

interface DesktopState {
  items: DesktopItem[];
  selectedIds: string[];
  openFolderId: string | null; // currently opened folder window
  settings: DesktopSettings;

  addBookmark: (b: { title: string; url: string; favicon?: string; customIcon?: string; parentId?: string | null; x?: number; y?: number }) => void;
  addFolder: (opts?: { title?: string; parentId?: string | null; x?: number; y?: number }) => string;
  removeItems: (ids: string[]) => void;
  renameItem: (id: string, title: string) => void;
  moveItems: (deltas: { id: string; x: number; y: number }[]) => void;
  setItemParent: (id: string, parentId: string | null, pos?: { x: number; y: number }) => void;
  setCustomIcon: (id: string, dataUrl: string | null) => void;

  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string, additive?: boolean) => void;
  clearSelection: () => void;

  openFolder: (id: string | null) => void;
  setSettings: (patch: Partial<DesktopSettings>) => void;
}

const findEmptySpot = (items: DesktopItem[], parentId: string | null): { x: number; y: number } => {
  const siblings = items.filter(i => i.parentId === parentId);
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

const seed = (): DesktopItem[] => [
  { id: 'seed-1', kind: 'bookmark', title: 'Google', url: 'https://google.com', favicon: 'https://www.google.com/s2/favicons?domain=google.com&sz=64', x: 12, y: 12, parentId: null, createdAt: Date.now() },
  { id: 'seed-2', kind: 'bookmark', title: 'YouTube', url: 'https://youtube.com', favicon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64', x: 12, y: 108, parentId: null, createdAt: Date.now() },
  { id: 'seed-3', kind: 'bookmark', title: 'GitHub', url: 'https://github.com', favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64', x: 12, y: 204, parentId: null, createdAt: Date.now() },
];

export const useDesktopStore = create<DesktopState>()(
  persist(
    (set, get) => ({
      items: seed(),
      selectedIds: [],
      openFolderId: null,
      settings: {
        theme: 'dark',
        wallpaper: wallpaperDefault,
        snapToGrid: false,
      },

      addBookmark: (b) => {
        const parentId = b.parentId ?? null;
        const spot = b.x !== undefined && b.y !== undefined
          ? { x: b.x, y: b.y }
          : findEmptySpot(get().items, parentId);
        const item: DesktopItem = {
          id: crypto.randomUUID(),
          kind: 'bookmark',
          title: b.title,
          url: b.url,
          favicon: b.favicon,
          customIcon: b.customIcon,
          x: spot.x, y: spot.y,
          parentId,
          createdAt: Date.now(),
        };
        set({ items: [...get().items, item] });
      },

      addFolder: (opts = {}) => {
        const parentId = opts.parentId ?? null;
        const spot = opts.x !== undefined && opts.y !== undefined
          ? { x: opts.x, y: opts.y }
          : findEmptySpot(get().items, parentId);
        const id = crypto.randomUUID();
        const item: DesktopItem = {
          id,
          kind: 'folder',
          title: opts.title || 'New folder',
          x: spot.x, y: spot.y,
          parentId,
          createdAt: Date.now(),
        };
        set({ items: [...get().items, item] });
        return id;
      },

      removeItems: (ids) => {
        // Cascade delete folder children
        const toRemove = new Set(ids);
        let changed = true;
        while (changed) {
          changed = false;
          for (const it of get().items) {
            if (it.parentId && toRemove.has(it.parentId) && !toRemove.has(it.id)) {
              toRemove.add(it.id); changed = true;
            }
          }
        }
        set({
          items: get().items.filter(b => !toRemove.has(b.id)),
          selectedIds: get().selectedIds.filter(id => !toRemove.has(id)),
        });
      },

      renameItem: (id, title) => set({
        items: get().items.map(b => b.id === id ? { ...b, title } : b),
      }),

      moveItems: (deltas) => {
        const map = new Map<string, { id: string; x: number; y: number }>(
          deltas.map(d => [d.id, d])
        );
        set({
          items: get().items.map(b => {
            const d = map.get(b.id);
            return d ? { ...b, x: d.x, y: d.y } : b;
          }),
        });
      },

      setItemParent: (id, parentId, pos) => {
        set({
          items: get().items.map(b => {
            if (b.id !== id) return b;
            const next = { ...b, parentId };
            if (pos) { next.x = pos.x; next.y = pos.y; }
            else if (parentId !== b.parentId) {
              const spot = findEmptySpot(get().items.filter(i => i.id !== id), parentId);
              next.x = spot.x; next.y = spot.y;
            }
            return next;
          }),
        });
      },

      setCustomIcon: (id, dataUrl) => set({
        items: get().items.map(b =>
          b.id === id ? { ...b, customIcon: dataUrl ?? undefined } : b
        ),
      }),

      setSelected: (ids) => set({ selectedIds: ids }),
      toggleSelected: (id, additive) => {
        const cur = get().selectedIds;
        if (additive) {
          set({ selectedIds: cur.includes(id) ? cur.filter(i => i !== id) : [...cur, id] });
        } else {
          set({ selectedIds: [id] });
        }
      },
      clearSelection: () => set({ selectedIds: [] }),

      openFolder: (id) => set({ openFolderId: id }),
      setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
    }),
    {
      name: 'win10-desktop-store',
      version: 2,
      partialize: (s) => ({ items: s.items, settings: s.settings }),
      migrate: (persisted: unknown, version) => {
        const p = persisted as { bookmarks?: DesktopItem[]; items?: DesktopItem[]; settings?: DesktopSettings };
        if (version < 2 && p?.bookmarks) {
          return {
            items: p.bookmarks.map(b => ({ ...b, kind: 'bookmark' as const, parentId: null })),
            settings: p.settings,
          };
        }
        return p as DesktopState;
      },
    }
  )
);
