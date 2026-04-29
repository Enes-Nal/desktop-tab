// Virtual File System types

export type NodeKind = 'folder' | 'bookmark' | 'file';

// Special root folder ids (non-deletable, non-renameable)
export const ROOT_DESKTOP = 'root-desktop';
export const ROOT_DOCUMENTS = 'root-documents';
export const ROOT_PICTURES = 'root-pictures';

export const ROOT_IDS = [ROOT_DESKTOP, ROOT_DOCUMENTS, ROOT_PICTURES] as const;

export interface FsNode {
  id: string;
  parentId: string | null;       // null = top-level (one of the root folders); root folders themselves have parentId === null
  kind: NodeKind;
  name: string;
  // Position inside its parent (for desktop and folder windows)
  x: number;
  y: number;
  createdAt: number;
  modifiedAt: number;

  // Bookmark
  url?: string;
  favicon?: string;
  customIcon?: string;

  // File
  mimeType?: string;             // 'text/plain', 'image/png', 'image/jpeg', etc.
  textContent?: string;          // inline storage for text files
  blobKey?: string;              // idb key for binary blobs (images)
  size?: number;
}

export type Theme = 'light' | 'dark';

export interface DesktopSettings {
  theme: Theme;
  wallpaper: string;
  wallpapers: string[];
  wallpaperShuffleEnabled: boolean;
  wallpaperShuffleMinutes: number;
  wallpaperLastShuffleAt: number;
  snapToGrid: boolean;
}

export const GRID = 96;
export const ICON_W = 88;
export const ICON_H = 96;

export const isRoot = (id: string) => (ROOT_IDS as readonly string[]).includes(id);
