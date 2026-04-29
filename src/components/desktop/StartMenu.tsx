import { useRef, useState } from 'react';
import { useDesktopStore } from '@/store/desktopStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Power, Image as ImageIcon, Search, Settings as SettingsIcon, Plus, Globe, Download, Upload, FileText } from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { toast } from 'sonner';
import wallpaperDefault from '@/assets/wallpaper-default.jpg';
import wallpaperDark from '@/assets/wallpaper-dark.jpg';
import wallpaperLight from '@/assets/wallpaper-light.jpg';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
  onAddBookmark: () => void;
}

const PRESETS = [
  { name: 'Hero', url: wallpaperDefault },
  { name: 'Cosmic', url: wallpaperDark },
  { name: 'Sunset', url: wallpaperLight },
];

export function StartMenu({ onClose, onAddBookmark }: Props) {
  const { items, settings, setSettings, exportItems, importItems } = useDesktopStore();
  const openNotepad = useNotesStore(s => s.openWindow);
  const [query, setQuery] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [wallpaperUrl, setWallpaperUrl] = useState('');

  const handleExport = () => {
    const json = exportItems();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Bookmarks exported');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const replace = window.confirm(
        'Replace all current bookmarks?\n\nClick OK to REPLACE, or Cancel to MERGE with existing items.'
      );
      const result = importItems(text, replace ? 'replace' : 'merge');
      if (result.ok) toast.success(`Imported ${result.count} item${result.count === 1 ? '' : 's'}`);
      else toast.error(result.error || 'Import failed');
    };
    reader.readAsText(file);
  };

  const bookmarks = items.filter(i => i.kind === 'bookmark');
  const filtered = bookmarks.filter(b =>
    b.title.toLowerCase().includes(query.toLowerCase()) ||
    (b.url ?? '').toLowerCase().includes(query.toLowerCase())
  );

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSettings({ wallpaper: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed bottom-12 left-2 z-40 w-[380px] max-h-[80vh] rounded-md glass-start animate-slide-up overflow-hidden flex flex-col"
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Search */}
      <div className="p-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookmarks..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-sm bg-background/60 border border-border outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Bookmarks list */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          {query ? 'Results' : 'All bookmarks'}
        </div>
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">No bookmarks</div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map(b => (
              <a
                key={b.id}
                href={b.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-2 py-1.5 rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => onClose()}
              >
                {b.favicon ? (
                  <img src={b.favicon} alt="" className="w-5 h-5" />
                ) : (
                  <Globe className="w-5 h-5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{b.title}</div>
                  <div className="text-[11px] opacity-70 truncate">{b.url}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="border-t border-border/50 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-2">
            {settings.theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            Dark mode
          </Label>
          <Switch
            checked={settings.theme === 'dark'}
            onCheckedChange={(v) => setSettings({ theme: v ? 'dark' : 'light' })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Snap to grid</Label>
          <Switch
            checked={settings.snapToGrid}
            onCheckedChange={(v) => setSettings({ snapToGrid: v })}
          />
        </div>
        <div>
          <Label className="text-xs flex items-center gap-2 mb-2">
            <ImageIcon className="w-3.5 h-3.5" /> Wallpaper
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => setSettings({ wallpaper: p.url })}
                className={cn(
                  'aspect-video rounded-sm overflow-hidden border-2 transition-all',
                  settings.wallpaper === p.url ? 'border-primary' : 'border-transparent hover:border-border'
                )}
              >
                <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
          <div className="mt-2 flex gap-1">
            <Input
              placeholder="Wallpaper image URL"
              value={wallpaperUrl}
              onChange={(e) => setWallpaperUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (wallpaperUrl.trim()) { setSettings({ wallpaper: wallpaperUrl.trim() }); setWallpaperUrl(''); }
                }
              }}
              className="h-8 text-xs flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2"
              disabled={!wallpaperUrl.trim()}
              onClick={() => { setSettings({ wallpaper: wallpaperUrl.trim() }); setWallpaperUrl(''); }}
            >
              Set
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full mt-1.5 h-8 text-xs"
            onClick={() => fileRef.current?.click()}
          >
            Upload custom
          </Button>
        </div>

        {/* Bookmark backup */}
        <div className="pt-1">
          <Label className="text-xs flex items-center gap-2 mb-2">
            <Download className="w-3.5 h-3.5" /> Bookmark backup
          </Label>
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={handleExport}>
              <Download className="w-3 h-3" /> Export
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => importRef.current?.click()}>
              <Upload className="w-3 h-3" /> Import
            </Button>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-border/50 p-2 flex items-center justify-between">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onAddBookmark} className="text-xs gap-1.5">
            <Plus className="w-4 h-4" /> Bookmark
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { openNotepad(); onClose(); }} className="text-xs gap-1.5">
            <FileText className="w-4 h-4" /> Notepad
          </Button>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Close" onClick={onClose}><Power className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}
