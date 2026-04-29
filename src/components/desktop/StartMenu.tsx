import { useState } from 'react';
import { useFsStore } from '@/store/fsStore';
import { Button } from '@/components/ui/button';
import {
  CalendarDays, Cloud, FileText, FolderOpen, Globe, Mail, Plus, Power,
  Search, Settings, Youtube,
} from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import { openFileExplorerAt, openGoogleApp, openSettingsApp } from '@/lib/appLauncher';
import { ROOT_DESKTOP, ROOT_DOCUMENTS, ROOT_PICTURES } from '@/types/fs';
import { GOOGLE_APP_ORDER, GOOGLE_APPS, GoogleService } from '@/lib/googleApps';

interface Props {
  onClose: () => void;
  onAddBookmark: () => void;
}

export function StartMenu({ onClose, onAddBookmark }: Props) {
  const nodes = useFsStore(s => s.nodes);
  const markBookmarkOpened = useFsStore(s => s.markBookmarkOpened);
  const openNotepad = useNotesStore(s => s.openWindow);
  const [query, setQuery] = useState('');

  const bookmarks = nodes.filter(n => !n.deletedAt && n.kind === 'bookmark');
  const filtered = bookmarks.filter(b =>
    b.name.toLowerCase().includes(query.toLowerCase()) ||
    (b.url ?? '').toLowerCase().includes(query.toLowerCase())
  );

  const openFolder = (id: string) => { openFileExplorerAt(id); onClose(); };
  const openSettings = () => { openSettingsApp(); onClose(); };

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

      <div className="px-2 pt-2 grid grid-cols-3 gap-1.5 shrink-0">
        <QuickButton label="Desktop" onClick={() => openFolder(ROOT_DESKTOP)} />
        <QuickButton label="Documents" onClick={() => openFolder(ROOT_DOCUMENTS)} />
        <QuickButton label="Pictures" onClick={() => openFolder(ROOT_PICTURES)} />
      </div>

      <div className="px-2 pt-2 shrink-0">
        <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          Google apps
        </div>
        <div className="grid grid-cols-5 gap-1">
          {GOOGLE_APP_ORDER.map(service => (
            <GoogleAppButton
              key={service}
              service={service}
              onClick={() => { openGoogleApp(service); onClose(); }}
            />
          ))}
        </div>
      </div>

      <div className="overflow-y-auto p-2 min-h-[180px] flex-1">
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
                onClick={() => { markBookmarkOpened(b.id); onClose(); }}
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
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Settings" onClick={openSettings}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Close" onClick={onClose}>
            <Power className="w-4 h-4" />
          </Button>
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

function GoogleAppButton({ service, onClick }: { service: GoogleService; onClick: () => void }) {
  const app = GOOGLE_APPS[service];
  const icon = service === 'gmail'
    ? <Mail className="w-5 h-5" />
    : service === 'calendar'
      ? <CalendarDays className="w-5 h-5" />
      : service === 'drive'
        ? <Cloud className="w-5 h-5" />
        : service === 'youtube'
          ? <Youtube className="w-5 h-5" />
          : <FileText className="w-5 h-5" />;

  return (
    <button
      onClick={onClick}
      className="flex min-w-0 flex-col items-center gap-1 rounded-sm p-2 transition-colors hover:bg-foreground/10"
      title={app.name}
    >
      <span style={{ color: app.accent }}>{icon}</span>
      <span className="max-w-full truncate text-[11px]">{app.name}</span>
    </button>
  );
}
