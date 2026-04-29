// IndexedDB persistence helpers (built on idb-keyval)
import { get, set, del, createStore } from 'idb-keyval';
import { FsNode } from '@/types/fs';

const metaStore = createStore('win10-fs', 'meta');
const blobStore = createStore('win10-fs', 'blobs');

const NODES_KEY = 'nodes';
const SETTINGS_KEY = 'settings';

export async function loadNodes(): Promise<FsNode[] | null> {
  const v = await get<FsNode[]>(NODES_KEY, metaStore);
  return v ?? null;
}

export async function saveNodes(nodes: FsNode[]): Promise<void> {
  await set(NODES_KEY, nodes, metaStore);
}

export async function loadSettings<T>(): Promise<T | null> {
  const v = await get<T>(SETTINGS_KEY, metaStore);
  return v ?? null;
}

export async function saveSettings<T>(settings: T): Promise<void> {
  await set(SETTINGS_KEY, settings, metaStore);
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  await set(key, blob, blobStore);
}

export async function getBlob(key: string): Promise<Blob | null> {
  const v = await get<Blob>(key, blobStore);
  return v ?? null;
}

export async function deleteBlob(key: string): Promise<void> {
  await del(key, blobStore);
}

// Resolve a blob to an object URL (caller must revoke)
export async function getBlobUrl(key: string): Promise<string | null> {
  const blob = await getBlob(key);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
