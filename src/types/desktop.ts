export type ItemKind = 'bookmark' | 'folder';

export interface DesktopItem {
  id: string;
  kind: ItemKind;
  title: string;
  x: number;
  y: number;
  parentId: string | null; // null = on desktop, otherwise id of folder
  createdAt: number;
  // bookmark-only
  url?: string;
  favicon?: string;       // resolved favicon url (auto)
  customIcon?: string;    // user-provided icon (data URI or URL) — overrides favicon
  // folder-only: nothing extra; children referenced via parentId
}

// Back-compat alias
export type Bookmark = DesktopItem;

export type Theme = 'light' | 'dark';

export interface DesktopSettings {
  theme: Theme;
  wallpaper: string;
  snapToGrid: boolean;
}

export const GRID = 96;
export const ICON_W = 88;
export const ICON_H = 96;
