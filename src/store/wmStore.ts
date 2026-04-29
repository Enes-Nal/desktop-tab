import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppKind = 'file-explorer' | 'text-viewer' | 'image-viewer' | 'notepad';

export interface WindowState {
  id: string;
  app: AppKind;
  title: string;
  icon?: string;             // optional icon hint (lucide name not used here, components decide)
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  // App-specific props
  props: Record<string, unknown>;
  // Pre-maximize geometry
  prevGeom?: { x: number; y: number; w: number; h: number };
}

interface WMState {
  windows: WindowState[];
  topZ: number;
  activeId: string | null;

  open: (opts: { app: AppKind; title: string; props?: Record<string, unknown>; w?: number; h?: number; x?: number; y?: number; singleton?: boolean }) => string;
  close: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  setGeom: (id: string, g: Partial<Pick<WindowState, 'x' | 'y' | 'w' | 'h'>>) => void;
  setProps: (id: string, props: Record<string, unknown>) => void;
  setTitle: (id: string, title: string) => void;
  // For taskbar icon click: focus or restore minimized
  toggleFromTaskbar: (id: string) => void;
}

const TASKBAR_H = 48;

const cascade = (count: number, w: number, h: number) => {
  const baseX = 80, baseY = 40, step = 32;
  const x = Math.max(0, Math.min(window.innerWidth - w, baseX + step * (count % 8)));
  const y = Math.max(0, Math.min(window.innerHeight - h - TASKBAR_H, baseY + step * (count % 8)));
  return { x, y };
};

export const useWMStore = create<WMState>()(
  persist(
    (setState, get) => ({
      windows: [],
      topZ: 10,
      activeId: null,

      open: ({ app, title, props = {}, w = 720, h = 480, x, y, singleton }) => {
        if (singleton) {
          const existing = get().windows.find(w => w.app === app);
          if (existing) {
            get().focus(existing.id);
            if (existing.minimized) setState({
              windows: get().windows.map(win => win.id === existing.id ? { ...win, minimized: false } : win),
            });
            return existing.id;
          }
        }
        const id = crypto.randomUUID();
        const pos = (x !== undefined && y !== undefined) ? { x, y } : cascade(get().windows.length, w, h);
        const z = get().topZ + 1;
        const win: WindowState = {
          id, app, title, x: pos.x, y: pos.y, w, h, z,
          minimized: false, maximized: false, props,
        };
        setState({ windows: [...get().windows, win], topZ: z, activeId: id });
        return id;
      },

      close: (id) => {
        setState({
          windows: get().windows.filter(w => w.id !== id),
          activeId: get().activeId === id ? null : get().activeId,
        });
      },

      focus: (id) => {
        const z = get().topZ + 1;
        setState({
          windows: get().windows.map(w => w.id === id ? { ...w, z, minimized: false } : w),
          topZ: z,
          activeId: id,
        });
      },

      minimize: (id) => {
        setState({
          windows: get().windows.map(w => w.id === id ? { ...w, minimized: true } : w),
          activeId: get().activeId === id ? null : get().activeId,
        });
      },

      toggleMaximize: (id) => {
        const win = get().windows.find(w => w.id === id);
        if (!win) return;
        if (win.maximized) {
          const prev = win.prevGeom ?? { x: 80, y: 40, w: win.w, h: win.h };
          setState({
            windows: get().windows.map(w => w.id === id ? { ...w, maximized: false, ...prev, prevGeom: undefined } : w),
          });
        } else {
          const prevGeom = { x: win.x, y: win.y, w: win.w, h: win.h };
          setState({
            windows: get().windows.map(w => w.id === id ? {
              ...w, maximized: true, prevGeom,
              x: 0, y: 0, w: window.innerWidth, h: window.innerHeight - TASKBAR_H,
            } : w),
          });
        }
        get().focus(id);
      },

      setGeom: (id, g) => {
        setState({
          windows: get().windows.map(w => w.id === id ? { ...w, ...g } : w),
        });
      },

      setProps: (id, props) => {
        setState({
          windows: get().windows.map(w => w.id === id ? { ...w, props: { ...w.props, ...props } } : w),
        });
      },

      setTitle: (id, title) => {
        setState({
          windows: get().windows.map(w => w.id === id ? { ...w, title } : w),
        });
      },

      toggleFromTaskbar: (id) => {
        const win = get().windows.find(w => w.id === id);
        if (!win) return;
        if (win.minimized) get().focus(id);
        else if (get().activeId === id) get().minimize(id);
        else get().focus(id);
      },
    }),
    {
      name: 'win10-window-manager',
      partialize: (s) => ({
        windows: s.windows,
        topZ: s.topZ,
        activeId: s.activeId,
      }),
    },
  ),
);
