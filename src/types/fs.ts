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
  deletedAt?: number;
  originalParentId?: string | null;
  originalX?: number;
  originalY?: number;

  // Bookmark
  url?: string;
  favicon?: string;
  customIcon?: string;
  notes?: string;
  tags?: string[];
  openCount?: number;
  lastOpenedAt?: number;

  // File
  mimeType?: string;             // 'text/plain', 'image/png', 'image/jpeg', etc.
  textContent?: string;          // inline storage for text files
  blobKey?: string;              // idb key for binary blobs (images)
  size?: number;
}

export type Theme = 'light' | 'dark';
export type WindowTheme = 'classic-95' | 'glassy-vista' | 'neon-cyberdeck' | 'cozy-paper' | 'minimal-mono';

export interface DesktopSettings {
  theme: Theme;
  windowTheme: WindowTheme;
  fontFamily: string;
  wallpaper: string;
  wallpapers: string[];
  wallpaperShuffleEnabled: boolean;
  wallpaperShuffleMinutes: number;
  wallpaperLastShuffleAt: number;
  snapToGrid: boolean;
  autoArrange: boolean;
  pinnedIds: string[];
  layoutPresets: Record<string, Record<string, { x: number; y: number }>>;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  googleAccounts: GoogleAccountShortcut[];
}

export interface Workspace {
  id: string;
  name: string;
  nodeIds: string[];
  wallpaper?: string;
  pinnedIds?: string[];
}

export interface GoogleAccountShortcut {
  id: string;
  label: string;
  email?: string;
  gmailUrl: string;
}

export const GRID = 96;
export const ICON_W = 88;
export const ICON_H = 96;

export const isRoot = (id: string) => (ROOT_IDS as readonly string[]).includes(id);
