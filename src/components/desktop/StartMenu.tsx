import { useRef, useState } from 'react';
import { useFsStore } from '@/store/fsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sun, Moon, Power, Image as ImageIcon, Search, Plus, Globe,
  Download, Upload, FileText, FolderOpen, Shuffle, X, Type,
} from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { openFileExplorerAt } from '@/lib/appLauncher';
import { ROOT_DESKTOP, ROOT_DOCUMENTS, ROOT_PICTURES } from '@/types/fs';
import { toast } from 'sonner';
import wallpaperDefault from '@/assets/wallpaper-default.jpg';
import wallpaperDark from '@/assets/wallpaper-dark.jpg';
import wallpaperLight from '@/assets/wallpaper-light.jpg';
import { cn } from '@/lib/utils';
import { normalizeWallpaperUrl } from '@/lib/wallpaper';
import { GOOGLE_FONTS } from '@/lib/googleFonts';

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
  const nodes = useFsStore(s => s.nodes);
  const settings = useFsStore(s => s.settings);
  const setSettings = useFsStore(s => s.setSettings);
  const exportItems = useFsStore(s => s.exportItems);
  const importItems = useFsStore(s => s.importItems);
  const openNotepad = useNotesStore(s => s.openWindow);
  const [query, setQuery] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  const [fontQuery, setFontQuery] = useState('');

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
        'Replace all current items?\n\nClick OK to REPLACE, or Cancel to MERGE with existing items.'
      );
      const result = importItems(text, replace ? 'replace' : 'merge');
      if (result.ok) toast.success(`Imported ${result.count} item${result.count === 1 ? '' : 's'}`);
      else toast.error(result.error || 'Import failed');
    };
    reader.readAsText(file);
  };

  const bookmarks = nodes.filter(n => n.kind === 'bookmark');
  const filtered = bookmarks.filter(b =>
    b.name.toLowerCase().includes(query.toLowerCase()) ||
    (b.url ?? '').toLowerCase().includes(query.toLowerCase())
  );

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const wallpaper = reader.result as string;
      setSettings({
        wallpaper,
        wallpapers: [wallpaper, ...settings.wallpapers.filter(url => url !== wallpaper)],
        wallpaperLastShuffleAt: Date.now(),
      });
    };
    reader.readAsDataURL(file);
  };

  const addWallpapers = (raw: string) => {
    const incoming = raw
      .split(/[\s,]+/)
      .map(normalizeWallpaperUrl)
      .filter(Boolean);
    if (incoming.length === 0) return;
    const wallpaper = incoming[0];
    setSettings({
      wallpaper,
      wallpapers: [...incoming, ...settings.wallpapers.filter(url => !incoming.includes(url))],
      wallpaperLastShuffleAt: Date.now(),
    });
    setWallpaperUrl('');
  };

  const removeWallpaper = (url: string) => {
    const wallpapers = settings.wallpapers.filter(item => item !== url);
    const nextWallpaper = settings.wallpaper === url ? (wallpapers[0] || wallpaperDefault) : settings.wallpaper;
    setSettings({
      wallpaper: nextWallpaper,
      wallpapers: wallpapers.length ? wallpapers : [nextWallpaper],
      wallpaperShuffleEnabled: wallpapers.length > 1 ? settings.wallpaperShuffleEnabled : false,
      wallpaperLastShuffleAt: Date.now(),
    });
  };

  const openFolder = (id: string) => { openFileExplorerAt(id); onClose(); };

  return (
    <div
      className="fixed bottom-12 left-2 z-40 w-[380px] max-h-[80vh] rounded-md glass-start animate-slide-up overflow-hidden flex flex-col"
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
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

      {/* Quick access */}
      <div className="px-2 pt-2 grid grid-cols-3 gap-1.5 shrink-0">
        <QuickButton label="Desktop" onClick={() => openFolder(ROOT_DESKTOP)} />
        <QuickButton label="Documents" onClick={() => openFolder(ROOT_DOCUMENTS)} />
        <QuickButton label="Pictures" onClick={() => openFolder(ROOT_PICTURES)} />
      </div>

      {/* Bookmarks list */}
      <div className="overflow-y-auto p-2 max-h-[180px] shrink-0">
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
                {(b.customIcon || b.favicon) ? (
                  <img src={b.customIcon || b.favicon} alt="" className="w-5 h-5" />
                ) : (
                  <Globe className="w-5 h-5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{b.name || <span className="opacity-60">Untitled</span>}</div>
                  <div className="text-[11px] opacity-70 truncate">{b.url}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="border-t border-border/50 p-3 space-y-3 flex-1 overflow-y-auto min-h-0">
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
            <Type className="w-3.5 h-3.5" /> Font
          </Label>
          <div className="flex gap-1">
            <Input
              list="google-fonts"
              placeholder="Search Google Fonts"
              value={fontQuery || (settings.fontFamily === 'system' ? '' : settings.fontFamily)}
              onChange={(e) => setFontQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const next = fontQuery.trim();
                if (next && GOOGLE_FONTS.includes(next as typeof GOOGLE_FONTS[number])) {
                  setSettings({ fontFamily: next });
                }
              }}
              className="h-8 text-xs flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2"
              disabled={!fontQuery.trim() || !GOOGLE_FONTS.includes(fontQuery.trim() as typeof GOOGLE_FONTS[number])}
              onClick={() => setSettings({ fontFamily: fontQuery.trim() })}
            >
              Set
            </Button>
          </div>
          <datalist id="google-fonts">
            {GOOGLE_FONTS.map(font => <option key={font} value={font} />)}
          </datalist>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="min-w-0 truncate text-[11px] text-muted-foreground">
              {settings.fontFamily === 'system' ? 'System default' : settings.fontFamily}
            </div>
            {settings.fontFamily !== 'system' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => { setSettings({ fontFamily: 'system' }); setFontQuery(''); }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
        <div>
          <Label className="text-xs flex items-center gap-2 mb-2">
            <ImageIcon className="w-3.5 h-3.5" /> Wallpaper
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => setSettings({
                  wallpaper: p.url,
                  wallpapers: [p.url, ...settings.wallpapers.filter(url => url !== p.url)],
                  wallpaperLastShuffleAt: Date.now(),
                })}
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
              placeholder="Wallpaper image URL(s)"
              value={wallpaperUrl}
              onChange={(e) => setWallpaperUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (wallpaperUrl.trim()) addWallpapers(wallpaperUrl);
                }
              }}
              className="h-8 text-xs flex-1"
            />
            <Button
              type="button" variant="outline" size="sm" className="h-8 text-xs px-2"
              disabled={!wallpaperUrl.trim()}
              onClick={() => addWallpapers(wallpaperUrl)}
            >
              Add
            </Button>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs flex items-center gap-2">
                <Shuffle className="w-3.5 h-3.5" /> Shuffle
              </Label>
              <Switch
                checked={settings.wallpaperShuffleEnabled}
                disabled={settings.wallpapers.length < 2}
                onCheckedChange={(v) => setSettings({
                  wallpaperShuffleEnabled: v,
                  wallpaperLastShuffleAt: Date.now(),
                })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground shrink-0">Every</span>
              <Input
                type="number"
                min={1}
                max={1440}
                value={settings.wallpaperShuffleMinutes}
                onChange={(e) => setSettings({
                  wallpaperShuffleMinutes: Math.max(1, Number(e.target.value) || 1),
                  wallpaperLastShuffleAt: Date.now(),
                })}
                className="h-8 text-xs w-20"
              />
              <span className="text-[11px] text-muted-foreground">minutes</span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
              {settings.wallpapers.map((url) => (
                <div
                  key={url}
                  className={cn(
                    'flex items-center gap-2 rounded-sm border px-1.5 py-1',
                    settings.wallpaper === url ? 'border-primary bg-primary/10' : 'border-border/60 bg-background/30',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSettings({ wallpaper: url, wallpaperLastShuffleAt: Date.now() })}
                    className="h-8 w-12 overflow-hidden rounded-sm bg-muted shrink-0"
                    title="Use wallpaper"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                  <div className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                    {url.startsWith('data:') ? 'Uploaded wallpaper' : url}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWallpaper(url)}
                    className="h-6 w-6 flex items-center justify-center rounded-sm hover:bg-destructive hover:text-destructive-foreground shrink-0"
                    title="Remove wallpaper"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <Button
            type="button" variant="outline" size="sm" className="w-full mt-1.5 h-8 text-xs"
            onClick={() => fileRef.current?.click()}
          >
            Upload custom
          </Button>
        </div>

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

function QuickButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-sm hover:bg-foreground/10 transition-colors"
    >
      <FolderOpen className="w-5 h-5 text-yellow-500" />
      <span className="text-[11px]">{label}</span>
    </button>
  );
}
