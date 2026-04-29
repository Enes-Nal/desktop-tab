export interface Bookmark {
  id: string;
  title: string;
  url: string;
  x: number;
  y: number;
  favicon?: string;
  createdAt: number;
}

export type Theme = 'light' | 'dark';

export interface DesktopSettings {
  theme: Theme;
  wallpaper: string; // url or data: uri
  snapToGrid: boolean;
}

export const GRID = 96; // icon cell size
export const ICON_W = 88;
export const ICON_H = 96;
