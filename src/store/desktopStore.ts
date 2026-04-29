import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Bookmark, DesktopSettings, GRID } from '@/types/desktop';
import wallpaperDefault from '@/assets/wallpaper-default.jpg';

interface DesktopState {
  bookmarks: Bookmark[];
  selectedIds: string[];
  settings: DesktopSettings;
  addBookmark: (b: Omit<Bookmark, 'id' | 'createdAt' | 'x' | 'y'> & { x?: number; y?: number }) => void;
  removeBookmarks: (ids: string[]) => void;
  renameBookmark: (id: string, title: string) => void;
  moveBookmarks: (deltas: { id: string; x: number; y: number }[]) => void;
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  setSettings: (patch: Partial<DesktopSettings>) => void;
}

const findEmptySpot = (bookmarks: Bookmark[]): { x: number; y: number } => {
  const occupied = new Set(bookmarks.map(b => `${Math.round(b.x / GRID)},${Math.round(b.y / GRID)}`));
  const cols = Math.max(2, Math.floor((window.innerWidth - 24) / GRID));
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < 10; row++) {
      const key = `${col},${row}`;
      if (!occupied.has(key)) return { x: col * GRID + 12, y: row * GRID + 12 };
    }
  }
  return { x: 12, y: 12 };
};

export const useDesktopStore = create<DesktopState>()(
  persist(
    (set, get) => ({
      bookmarks: [
        { id: 'seed-1', title: 'Google', url: 'https://google.com', favicon: 'https://www.google.com/s2/favicons?domain=google.com&sz=64', x: 12, y: 12, createdAt: Date.now() },
        { id: 'seed-2', title: 'YouTube', url: 'https://youtube.com', favicon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64', x: 12, y: 108, createdAt: Date.now() },
        { id: 'seed-3', title: 'GitHub', url: 'https://github.com', favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64', x: 12, y: 204, createdAt: Date.now() },
      ],
      selectedIds: [],
      settings: {
        theme: 'dark',
        wallpaper: wallpaperDefault,
        snapToGrid: false,
      },
      addBookmark: (b) => {
        const spot = b.x !== undefined && b.y !== undefined
          ? { x: b.x, y: b.y }
          : findEmptySpot(get().bookmarks);
        const bm: Bookmark = {
          id: crypto.randomUUID(),
          title: b.title,
          url: b.url,
          favicon: b.favicon,
          x: spot.x,
          y: spot.y,
          createdAt: Date.now(),
        };
        set({ bookmarks: [...get().bookmarks, bm] });
      },
      removeBookmarks: (ids) => set({
        bookmarks: get().bookmarks.filter(b => !ids.includes(b.id)),
        selectedIds: get().selectedIds.filter(id => !ids.includes(id)),
      }),
      renameBookmark: (id, title) => set({
        bookmarks: get().bookmarks.map(b => b.id === id ? { ...b, title } : b),
      }),
      moveBookmarks: (deltas) => {
        const map = new Map(deltas.map(d => [d.id, d]));
        set({
          bookmarks: get().bookmarks.map(b => {
            const d = map.get(b.id);
            return d ? { ...b, x: d.x, y: d.y } : b;
          }),
        });
      },
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
      setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
    }),
    {
      name: 'win10-desktop-store',
      partialize: (s) => ({ bookmarks: s.bookmarks, settings: s.settings }),
    }
  )
);
