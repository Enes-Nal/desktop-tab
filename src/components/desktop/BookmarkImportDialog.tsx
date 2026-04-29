import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFsStore } from '@/store/fsStore';

export function BookmarkImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importBookmarksHtml = useFsStore(s => s.importBookmarksHtml);
  const [mode, setMode] = useState<'desktop' | 'folder'>('folder');
  const [status, setStatus] = useState('');

  const handleFile = async (file?: File) => {
    if (!file) return;
    const html = await file.text();
    const result = importBookmarksHtml(html, mode);
    setStatus(result.ok ? `Imported ${result.count} bookmark${result.count === 1 ? '' : 's'}.` : result.error || 'Import failed.');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Browser Bookmarks</DialogTitle>
          <DialogDescription>Choose a Chrome, Edge, or Firefox bookmarks HTML export.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode('folder')} className={`h-9 rounded-sm border text-sm ${mode === 'folder' ? 'bg-primary text-primary-foreground' : 'hover:bg-foreground/10'}`}>Imported folder</button>
            <button onClick={() => setMode('desktop')} className={`h-9 rounded-sm border text-sm ${mode === 'desktop' ? 'bg-primary text-primary-foreground' : 'hover:bg-foreground/10'}`}>Desktop</button>
          </div>
          <input ref={inputRef} type="file" accept=".html,.htm,text/html" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          {status && <div className="text-sm text-muted-foreground">{status}</div>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={() => inputRef.current?.click()}>Choose HTML</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
