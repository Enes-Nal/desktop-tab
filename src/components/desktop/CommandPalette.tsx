import { useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFsStore } from '@/store/fsStore';
import { useWMStore } from '@/store/wmStore';
import { activateNode, openFileExplorerAt, openGoogleApp, openSettingsApp } from '@/lib/appLauncher';
import { searchableText } from '@/lib/fsMeta';
import { getFaviconUrl, normalizeUrl } from '@/lib/favicon';
import { FilePlus, FolderPlus, Link, Search, Trash2, Upload, Wallpaper, Download, RotateCcw, Edit3, FolderOpen, Mail, CalendarDays, Cloud, Youtube, Settings } from 'lucide-react';
import { NodeIcon } from './NodeIcon';
import { GOOGLE_APP_ORDER, GOOGLE_APPS } from '@/lib/googleApps';

interface Props {
  open: boolean;
  onClose: () => void;
  onAddBookmark: () => void;
  onImport: () => void;
  onWallpaper: () => void;
}

export function CommandPalette({ open, onClose, onAddBookmark, onImport, onWallpaper }: Props) {
  const [q, setQ] = useState('');
  const nodes = useFsStore(s => s.nodes);
  const settings = useFsStore(s => s.settings);
  const { addFolder, addTextFile, removeItems, restoreItems, emptyRecycleBin, addBookmark, exportItems } = useFsStore();
  const windows = useWMStore(s => s.windows);
  const focus = useWMStore(s => s.focus);

  const liveNodes = nodes.filter(n => !n.deletedAt);
  const deletedNodes = nodes.filter(n => n.deletedAt);
  const term = q.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!term) return liveNodes.slice(0, 8);
    return liveNodes.filter(n => searchableText(n).includes(term)).slice(0, 12);
  }, [liveNodes, term]);

  const windowMatches = useMemo(() => {
    if (!term) return windows.slice(0, 4);
    return windows.filter(w => w.title.toLowerCase().includes(term)).slice(0, 6);
  }, [windows, term]);

  const run = (fn: () => void) => {
    fn();
    onClose();
    setQ('');
  };

  const exportData = () => {
    const blob = new Blob([exportItems()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'desktop-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const quickAdd = () => {
    const url = normalizeUrl(q);
    addBookmark({ name: new URL(url).hostname.replace(/^www\./, ''), url, favicon: getFaviconUrl(url) });
  };

  const commandItems = [
    { label: 'New bookmark', icon: <Link className="w-4 h-4" />, action: onAddBookmark },
    { label: 'Import browser bookmarks', icon: <Upload className="w-4 h-4" />, action: onImport },
    { label: 'New folder', icon: <FolderPlus className="w-4 h-4" />, action: () => addFolder({ name: 'New Folder' }) },
    { label: 'New text file', icon: <FilePlus className="w-4 h-4" />, action: () => addTextFile({ name: 'New File.txt', parentId: 'root-desktop' }) },
    { label: 'Open Recycle Bin', icon: <Trash2 className="w-4 h-4" />, action: () => useWMStore.getState().open({ app: 'recycle-bin', title: 'Recycle Bin', w: 620, h: 440 }) },
    { label: 'Open Settings', icon: <Settings className="w-4 h-4" />, action: openSettingsApp },
    { label: 'Change wallpaper', icon: <Wallpaper className="w-4 h-4" />, action: openSettingsApp },
    { label: 'Export data', icon: <Download className="w-4 h-4" />, action: exportData },
    ...GOOGLE_APP_ORDER.map(service => ({
      label: `Open ${GOOGLE_APPS[service].name}`,
      icon: googleAppIcon(service),
      action: () => openGoogleApp(service),
    })),
  ].filter(item => !term || item.label.toLowerCase().includes(term));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 gap-0 overflow-hidden sm:max-w-2xl">
        <div className="h-12 px-3 border-b border-border flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            placeholder="Search commands, bookmarks, files, folders, settings, windows"
            className="border-0 shadow-none focus-visible:ring-0 bg-transparent"
          />
        </div>
        <div className="max-h-[64vh] overflow-auto p-2">
          {term && /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i.test(q.trim()) && (
            <PaletteRow icon={<Link className="w-4 h-4" />} title={`Add bookmark: ${q.trim()}`} subtitle="Normalize URL and fetch favicon" onClick={() => run(quickAdd)} />
          )}

          {commandItems.map(item => (
            <PaletteRow key={item.label} icon={item.icon} title={item.label} subtitle="Command" onClick={() => run(item.action)} />
          ))}

          {windowMatches.map(w => (
            <PaletteRow key={w.id} icon={<FolderOpen className="w-4 h-4" />} title={w.title} subtitle="Open window" onClick={() => run(() => focus(w.id))} />
          ))}

          {matches.map(n => (
            <PaletteRow key={n.id} icon={<NodeIcon node={n} size={18} />} title={n.name || 'Untitled'} subtitle={n.url || n.textContent?.slice(0, 80) || 'Open'} onClick={() => run(() => activateNode(n))} />
          ))}

          {deletedNodes.length > 0 && (
            <>
              {deletedNodes.filter(n => !term || searchableText(n).includes(term)).slice(0, 4).map(n => (
                <PaletteRow key={n.id} icon={<RotateCcw className="w-4 h-4" />} title={`Restore ${n.name}`} subtitle="Recycle Bin" onClick={() => run(() => restoreItems([n.id]))} />
              ))}
              <PaletteRow icon={<Trash2 className="w-4 h-4" />} title="Empty Recycle Bin" subtitle={`${deletedNodes.length} deleted item${deletedNodes.length === 1 ? '' : 's'}`} onClick={() => run(emptyRecycleBin)} />
            </>
          )}

          {settings.workspaces.map(ws => (
            <PaletteRow key={ws.id} icon={<Edit3 className="w-4 h-4" />} title={`Switch workspace: ${ws.name}`} subtitle="Workspace" onClick={() => run(() => useFsStore.getState().switchWorkspace(ws.id))} />
          ))}

          {matches.length === 0 && commandItems.length === 0 && windowMatches.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No results</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaletteRow({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-left hover:bg-foreground/10">
      <span className="w-5 h-5 flex items-center justify-center shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm truncate">{title}</span>
        {subtitle && <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>}
      </span>
    </button>
  );
}

function googleAppIcon(service: (typeof GOOGLE_APP_ORDER)[number]) {
  const style = { color: GOOGLE_APPS[service].accent };
  if (service === 'gmail') return <Mail className="w-4 h-4" style={style} />;
  if (service === 'calendar') return <CalendarDays className="w-4 h-4" style={style} />;
  if (service === 'drive') return <Cloud className="w-4 h-4" style={style} />;
  if (service === 'youtube') return <Youtube className="w-4 h-4" style={style} />;
  return <Edit3 className="w-4 h-4" style={style} />;
}
