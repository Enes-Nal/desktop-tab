import { FsNode } from '@/types/fs';

export function nodeTypeLabel(node: FsNode): string {
  if (node.kind === 'folder') return 'Folder';
  if (node.kind === 'bookmark') return 'Bookmark';
  if (node.mimeType === 'text/plain') return 'Text file';
  if (node.mimeType?.startsWith('image/')) return 'Image';
  return 'File';
}

export function nodeSize(node: FsNode): number | undefined {
  if (node.size !== undefined) return node.size;
  if (node.kind === 'file' && node.textContent !== undefined) return new Blob([node.textContent]).size;
  if (node.kind === 'bookmark') return node.url?.length;
  return undefined;
}

export function formatSize(bytes?: number): string {
  if (bytes === undefined) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function searchableText(node: FsNode): string {
  return [
    node.name,
    node.url,
    node.textContent,
    node.notes,
    ...(node.tags ?? []),
    nodeTypeLabel(node),
  ].filter(Boolean).join(' ').toLowerCase();
}
