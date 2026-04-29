import { FsNode, ROOT_DOCUMENTS, ROOT_PICTURES, ROOT_DESKTOP } from '@/types/fs';
import { useWMStore } from '@/store/wmStore';
import { useFsStore } from '@/store/fsStore';
import { GOOGLE_APPS, GoogleService } from '@/lib/googleApps';
import { toast } from 'sonner';

const TASKBAR_H = 48;

const responsiveWindowSize = (width: number, height: number) => {
  const maxW = Math.max(320, window.innerWidth - 16);
  const maxH = Math.max(320, window.innerHeight - TASKBAR_H - 16);
  return {
    w: Math.min(width, maxW),
    h: Math.min(height, maxH),
  };
};

function openExternalUrl(url: string) {
  window.location.assign(url);
}

// Open a node with the appropriate app
export function activateNode(node: FsNode) {
  if (node.deletedAt) return;
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
    useFsStore.getState().markBookmarkOpened(node.id);
    openExternalUrl(node.url);
    return;
  }
  if (node.kind === 'file') {
    if (node.mimeType === 'text/plain') {
      wm.open({
        app: 'text-viewer',
        title: `${node.name || 'Text'} - Notepad`,
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
  const node = useFsStore.getState().nodes.find(n => n.id === folderId && !n.deletedAt);
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

export function openSettingsApp() {
  useWMStore.getState().open({
    app: 'settings',
    title: 'Settings',
    ...responsiveWindowSize(760, 620),
    singleton: true,
  });
}

export function openGoogleApp(service: GoogleService, opts: { url?: string; accountId?: string; accountIndex?: number } = {}) {
  const app = GOOGLE_APPS[service];
  const url = opts.url || app.url;
  useWMStore.getState().open({
    app: 'google-app',
    title: app.name,
    props: { service, url, accountId: opts.accountId, accountIndex: opts.accountIndex },
    w: service === 'gmail' ? 760 : 840,
    h: service === 'gmail' ? 520 : 560,
    singleton: service !== 'gmail',
  });
  toast.success(`Opening ${app.name}`);
  if (service === 'gmail') toast.message('Gmail may block embedded viewing', {
    description: 'Use Open externally from the Gmail window if the page does not load.',
  });
}

export function openGmailAccount(accountId: string) {
  const account = useFsStore.getState().settings.googleAccounts.find(item => item.id === accountId);
  if (!account) return;
  openGoogleApp('gmail', { url: account.gmailUrl, accountId });
}

export const KNOWN_FOLDERS = [ROOT_DESKTOP, ROOT_DOCUMENTS, ROOT_PICTURES];
