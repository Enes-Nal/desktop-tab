import { useRef, useState } from 'react';
import { Win } from './Win';
import { WindowState } from '@/store/wmStore';
import { useFsStore } from '@/store/fsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download, Image as ImageIcon, Keyboard, MousePointer2, Moon, Palette, Settings, Shuffle, Sun, Type,
  Upload, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeWallpaperUrl } from '@/lib/wallpaper';
import { GOOGLE_FONTS } from '@/lib/googleFonts';
import { toast } from 'sonner';
import wallpaperDefault from '@/assets/wallpaper-default.jpg';
import wallpaperDark from '@/assets/wallpaper-dark.jpg';
import wallpaperLight from '@/assets/wallpaper-light.jpg';

const PRESETS = [
  { name: 'Hero', url: wallpaperDefault },
  { name: 'Cosmic', url: wallpaperDark },
  { name: 'Sunset', url: wallpaperLight },
];

const WINDOW_THEMES = [
  { id: 'glassy-vista', label: 'Glassy Vista', swatch: ['#d7f2ff', '#2f86c7', '#0f2238'] },
  { id: 'neon-cyberdeck', label: 'Neon cyberdeck', swatch: ['#0a0f1d', '#35f0ff', '#ff2bd6'] },
  { id: 'cozy-paper', label: 'Cozy paper desk', swatch: ['#f4ead8', '#765a3a', '#7da06b'] },
  { id: 'minimal-mono', label: 'Minimal monochrome', swatch: ['#f7f7f4', '#1f1f1f', '#b8b8b2'] },
] as const;

const SETTINGS_TABS = [
  { id: 'personalization', label: 'Personalization' },
  { id: 'desktop', label: 'Desktop behavior' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'backup', label: 'Backup' },
] as const;

const SHORTCUT_GROUPS = [
  {
    title: 'Desktop',
    shortcuts: [
      { keys: ['Ctrl/Cmd', 'K'], action: 'Open command palette' },
      { keys: ['Ctrl/Cmd', 'N'], action: 'Create a new text file' },
      { keys: ['Ctrl/Cmd', 'Shift', 'N'], action: 'Create a new folder' },
      { keys: ['Delete'], action: 'Move selected items to Recycle Bin' },
      { keys: ['F2'], action: 'Rename the selected item' },
      { keys: ['Enter'], action: 'Open selected items' },
      { keys: ['Escape'], action: 'Clear selection and close menus' },
      { keys: ['Ctrl/Cmd/Shift', 'Click'], action: 'Add or remove items from selection' },
      { keys: ['Drag empty space'], action: 'Select icons with a rectangle' },
    ],
  },
  {
    title: 'File Explorer',
    shortcuts: [
      { keys: ['Ctrl/Cmd', 'F'], action: 'Focus search' },
      { keys: ['Alt', 'Left'], action: 'Go back' },
      { keys: ['Alt', 'Right'], action: 'Go forward' },
      { keys: ['Backspace'], action: 'Go up one folder' },
      { keys: ['Delete'], action: 'Move selected items to Recycle Bin' },
      { keys: ['F2'], action: 'Rename the selected item' },
      { keys: ['Enter'], action: 'Open the selected item' },
    ],
  },
  {
    title: 'Notepad',
    shortcuts: [
      { keys: ['Ctrl/Cmd', 'S'], action: 'Save the open text file' },
    ],
  },
] as const;

export function SettingsWindow({ win }: { win: WindowState }) {
  const settings = useFsStore(s => s.settings);
  const setSettings = useFsStore(s => s.setSettings);
  const exportItems = useFsStore(s => s.exportItems);
  const importItems = useFsStore(s => s.importItems);
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

  return (
    <Win win={win} icon={<Settings className="h-4 w-4" />} minWidth={320} minHeight={360}>
      <div className="flex-1 overflow-y-auto bg-background/80 p-3 sm:p-4">
        <Tabs defaultValue="personalization" className="mx-auto w-full max-w-5xl">
          <div className="w-full">
            <main className="min-w-0">
              <TabsList className="mb-3 grid h-auto w-full grid-cols-2 gap-1 rounded-md bg-muted/70 p-1">
                {SETTINGS_TABS.map(tab => (
                  <TabsTrigger key={tab.id} value={tab.id} className="min-w-0 px-2 text-xs">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="personalization" className="mt-0 space-y-3 sm:space-y-4">
                <section className="rounded-md border border-border/70 bg-card/75 p-3 shadow-sm backdrop-blur sm:p-4">
                  <h2 className="mb-3 text-sm font-medium">Appearance</h2>
                  <div className="space-y-4">
                    <div className="flex min-w-0 items-center justify-between gap-4">
                      <Label className="flex min-w-0 items-center gap-2 text-sm">
                        {settings.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        <span className="truncate">Dark mode</span>
                      </Label>
                      <Switch
                        checked={settings.theme === 'dark'}
                        onCheckedChange={(v) => setSettings({ theme: v ? 'dark' : 'light' })}
                      />
                    </div>

                    <div>
                      <Label className="mb-2 flex items-center gap-2 text-sm">
                        <Palette className="w-4 h-4" /> Window theme
                      </Label>
                      <div className="grid grid-cols-1 gap-2">
                        {WINDOW_THEMES.map(theme => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setSettings({ windowTheme: theme.id })}
                            className={cn(
                              'min-h-11 rounded-md border px-3 py-2 flex items-center justify-between gap-2 text-left text-xs transition-colors',
                              settings.windowTheme === theme.id
                                ? 'border-primary bg-primary/15'
                                : 'border-border/70 hover:bg-foreground/10',
                            )}
                          >
                            <span className="truncate">{theme.label}</span>
                            <span className="flex gap-1 shrink-0">
                              {theme.swatch.map(color => (
                                <span
                                  key={color}
                                  className="h-4 w-4 rounded-full border border-black/15"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 flex items-center gap-2 text-sm">
                        <Type className="w-4 h-4" /> Font
                      </Label>
                      <div className="flex min-w-0 flex-col gap-2">
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
                          className="h-9 min-w-0 flex-1 text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0 justify-center"
                          disabled={!fontQuery.trim() || !GOOGLE_FONTS.includes(fontQuery.trim() as typeof GOOGLE_FONTS[number])}
                          onClick={() => setSettings({ fontFamily: fontQuery.trim() })}
                        >
                          Set
                        </Button>
                      </div>
                      <datalist id="google-fonts">
                        {GOOGLE_FONTS.map(font => <option key={font} value={font} />)}
                      </datalist>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate text-xs text-muted-foreground">
                          {settings.fontFamily === 'system' ? 'System default' : settings.fontFamily}
                        </div>
                        {settings.fontFamily !== 'system' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => { setSettings({ fontFamily: 'system' }); setFontQuery(''); }}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-md border border-border/70 bg-card/75 p-3 shadow-sm backdrop-blur sm:p-4">
                  <h2 className="mb-3 text-sm font-medium">Wallpaper</h2>
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
                          'aspect-video overflow-hidden rounded-md border-2 transition-all',
                          settings.wallpaper === p.url ? 'border-primary' : 'border-transparent hover:border-border'
                        )}
                      >
                        <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>

                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
                  <div className="mt-3 flex min-w-0 flex-col gap-2">
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
                      className="h-9 min-w-0 flex-1 text-sm"
                    />
                    <Button
                      type="button" variant="outline" size="sm" className="h-9 shrink-0 justify-center"
                      disabled={!wallpaperUrl.trim()}
                      onClick={() => addWallpapers(wallpaperUrl)}
                    >
                      Add
                    </Button>
                    <Button
                      type="button" variant="outline" size="sm" className="h-9 shrink-0 justify-center gap-1.5"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" /> Upload
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <Label className="flex min-w-0 items-center gap-2 text-sm">
                        <Shuffle className="w-4 h-4 shrink-0" /> <span className="truncate">Shuffle wallpapers</span>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">Every</span>
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        value={settings.wallpaperShuffleMinutes}
                        onChange={(e) => setSettings({
                          wallpaperShuffleMinutes: Math.max(1, Number(e.target.value) || 1),
                          wallpaperLastShuffleAt: Date.now(),
                        })}
                        className="h-8 w-24 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">minutes</span>
                    </div>
                    <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                      {settings.wallpapers.map((url) => (
                        <div
                          key={url}
                          className={cn(
                            'flex items-center gap-2 rounded-sm border px-2 py-1.5',
                            settings.wallpaper === url ? 'border-primary bg-primary/10' : 'border-border/60 bg-background/30',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setSettings({ wallpaper: url, wallpaperLastShuffleAt: Date.now() })}
                            className="h-10 w-16 shrink-0 overflow-hidden rounded-md bg-muted"
                            title="Use wallpaper"
                          >
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </button>
                          <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                            {url.startsWith('data:') ? 'Uploaded wallpaper' : url}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeWallpaper(url)}
                            className="h-7 w-7 flex items-center justify-center rounded-sm hover:bg-destructive hover:text-destructive-foreground shrink-0"
                            title="Remove wallpaper"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="desktop" className="mt-0">
                <section className="rounded-md border border-border/70 bg-card/75 p-3 shadow-sm backdrop-blur sm:p-4">
                  <h2 className="mb-3 text-sm font-medium">Desktop</h2>
                  <div className="space-y-3">
                    <div className="flex min-w-0 items-center justify-between gap-4">
                      <Label className="flex min-w-0 items-center gap-2 truncate text-sm">
                        <MousePointer2 className="h-4 w-4 shrink-0" /> Hover effects
                      </Label>
                      <Switch
                        checked={settings.hoverEffectsEnabled}
                        onCheckedChange={(v) => setSettings({ hoverEffectsEnabled: v })}
                      />
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-4">
                      <Label className="min-w-0 truncate text-sm">Snap icons to grid</Label>
                      <Switch
                        checked={settings.snapToGrid}
                        onCheckedChange={(v) => setSettings({ snapToGrid: v })}
                      />
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="shortcuts" className="mt-0">
                <section className="rounded-md border border-border/70 bg-card/75 p-3 shadow-sm backdrop-blur sm:p-4">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <Keyboard className="w-4 h-4" /> Shortcuts
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {SHORTCUT_GROUPS.map(group => (
                      <div key={group.title} className="rounded-md border border-border/60 bg-background/35">
                        <div className="border-b border-border/60 px-3 py-2 text-xs font-medium">{group.title}</div>
                        <div className="divide-y divide-border/50">
                          {group.shortcuts.map(shortcut => (
                            <div key={`${group.title}-${shortcut.action}`} className="flex min-w-0 items-center justify-between gap-3 px-3 py-2">
                              <div className="min-w-0 text-xs text-muted-foreground">{shortcut.action}</div>
                              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                {shortcut.keys.map(key => (
                                  <kbd key={key} className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
                                    {key}
                                  </kbd>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="backup" className="mt-0">
                <section className="rounded-md border border-border/70 bg-card/75 p-3 shadow-sm backdrop-blur sm:p-4">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <ImageIcon className="w-4 h-4" /> Bookmark backup
                  </h2>
                  <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="h-9 justify-center gap-1.5" onClick={handleExport}>
                      <Download className="w-4 h-4" /> Export
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 justify-center gap-1.5" onClick={() => importRef.current?.click()}>
                      <Upload className="w-4 h-4" /> Import
                    </Button>
                  </div>
                </section>
              </TabsContent>
            </main>
          </div>
        </Tabs>
      </div>
    </Win>
  );
}
