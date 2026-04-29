import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  createdAt: number;
}

interface NotesState {
  notes: Note[];
  openIds: string[];        // tabs currently open
  activeId: string | null;  // active tab
  windowOpen: boolean;
  windowPos: { x: number; y: number };
  windowSize: { w: number; h: number };

  openWindow: () => void;
  closeWindow: () => void;
  setWindowPos: (p: { x: number; y: number }) => void;
  setWindowSize: (s: { w: number; h: number }) => void;

  createNote: (title?: string) => string;
  updateNote: (id: string, patch: Partial<Pick<Note, 'title' | 'content'>>) => void;
  deleteNote: (id: string) => void;
  openNote: (id: string) => void;
  closeNote: (id: string) => void;
  setActive: (id: string) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [
        {
          id: 'welcome',
          title: 'Welcome',
          content: 'Welcome to Notepad!\n\nThis is a persistent notepad — your notes are saved automatically.\n\nClick "+ New" to create another note. Use the tabs to switch between open notes.',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      openIds: ['welcome'],
      activeId: 'welcome',
      windowOpen: false,
      windowPos: { x: 160, y: 80 },
      windowSize: { w: 720, h: 480 },

      openWindow: () => set({ windowOpen: true }),
      closeWindow: () => set({ windowOpen: false }),
      setWindowPos: (p) => set({ windowPos: p }),
      setWindowSize: (s) => set({ windowSize: s }),

      createNote: (title) => {
        const id = crypto.randomUUID();
        const note: Note = {
          id,
          title: title || 'Untitled',
          content: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({
          notes: [note, ...get().notes],
          openIds: [...get().openIds.filter(x => x !== id), id],
          activeId: id,
          windowOpen: true,
        });
        return id;
      },
      updateNote: (id, patch) => set({
        notes: get().notes.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n),
      }),
      deleteNote: (id) => {
        const remaining = get().notes.filter(n => n.id !== id);
        const openIds = get().openIds.filter(x => x !== id);
        set({
          notes: remaining,
          openIds,
          activeId: get().activeId === id ? (openIds[openIds.length - 1] || null) : get().activeId,
        });
      },
      openNote: (id) => {
        const openIds = get().openIds.includes(id) ? get().openIds : [...get().openIds, id];
        set({ openIds, activeId: id, windowOpen: true });
      },
      closeNote: (id) => {
        const openIds = get().openIds.filter(x => x !== id);
        const activeId = get().activeId === id ? (openIds[openIds.length - 1] || null) : get().activeId;
        set({ openIds, activeId });
      },
      setActive: (id) => set({ activeId: id }),
    }),
    {
      name: 'win10-notes-store',
      partialize: (s) => ({
        notes: s.notes, openIds: s.openIds, activeId: s.activeId,
        windowOpen: s.windowOpen, windowPos: s.windowPos, windowSize: s.windowSize,
      }),
    }
  )
);
