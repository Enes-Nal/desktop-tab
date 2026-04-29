import { FsNode, ROOT_DOCUMENTS, ROOT_PICTURES, ROOT_DESKTOP } from '@/types/fs';
import { useWMStore } from '@/store/wmStore';
import { useFsStore } from '@/store/fsStore';

function openExternalUrl(url: string) {
  const opened = window.open(url, '_blank');
  if (opened) {
    opened.opener = null;
    return;
  }

  window.location.assign(url);
}

// Open a node with the appropriate app
export function activateNode(node: FsNode) {
  const wm = useWMStore.getState();
  if (node.kind === 'folder') {
    wm.open({
      app: 'file-explorer',
      title: node.name || 'Folder',
      props: { folderId: node.id },
      w: 820, h: 540,
    });
    return;
  }
  if (node.kind === 'bookmark' && node.url) {
    openExternalUrl(node.url);
    return;
  }
  if (node.kind === 'file') {
    if (node.mimeType === 'text/plain') {
      wm.open({
        app: 'text-viewer',
        title: node.name || 'Text',
        props: { fileId: node.id },
        w: 640, h: 480,
      });
      return;
    }
    if (node.mimeType?.startsWith('image/')) {
      wm.open({
        app: 'image-viewer',
        title: node.name || 'Image',
        props: { fileId: node.id },
        w: 720, h: 540,
      });
      return;
    }
  }
}

export function openFileExplorerAt(folderId: string) {
  const node = useFsStore.getState().nodes.find(n => n.id === folderId);
  useWMStore.getState().open({
    app: 'file-explorer',
    title: node?.name || 'File Explorer',
    props: { folderId },
    w: 820, h: 540,
  });
}

export function openFileExplorerHome() {
  openFileExplorerAt(ROOT_DESKTOP);
}

export const KNOWN_FOLDERS = [ROOT_DESKTOP, ROOT_DOCUMENTS, ROOT_PICTURES];
