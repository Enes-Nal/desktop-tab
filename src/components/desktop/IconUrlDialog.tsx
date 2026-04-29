import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Globe, Image as ImageIcon, AlertCircle, Check } from 'lucide-react';

interface Props {
  open: boolean;
  initialUrl?: string;
  itemTitle?: string;
  onClose: () => void;
  onSave: (url: string | null) => void; // null = reset
}

export function IconUrlDialog({ open, initialUrl, itemTitle, onClose, onSave }: Props) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');

  useEffect(() => {
    if (open) {
      setUrl(initialUrl || '');
      setStatus(initialUrl ? 'loading' : 'idle');
    }
  }, [open, initialUrl]);

  // debounce preview load
  useEffect(() => {
    if (!url) { setStatus('idle'); return; }
    setStatus('loading');
    const id = setTimeout(() => {
      const img = new Image();
      img.onload = () => setStatus('ok');
      img.onerror = () => setStatus('err');
      img.src = url;
    }, 300);
    return () => clearTimeout(id);
  }, [url]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSave(url.trim() || null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Set icon from URL
          </DialogTitle>
          <DialogDescription>
            {itemTitle ? <>Customize the icon for <span className="font-medium">{itemTitle}</span>.</> : 'Paste an image URL.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 flex items-center justify-center rounded-md bg-muted border border-border overflow-hidden shrink-0 relative">
              {status === 'ok' && url ? (
                <img src={url} alt="" className="w-14 h-14 object-contain" />
              ) : status === 'err' ? (
                <AlertCircle className="w-7 h-7 text-destructive" />
              ) : (
                <Globe className="w-7 h-7 text-muted-foreground" />
              )}
              {status === 'loading' && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <Label htmlFor="icon-url" className="text-xs">Image URL</Label>
              <Input
                id="icon-url"
                autoFocus
                placeholder="https://example.com/icon.png"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <div className="text-xs h-4 flex items-center gap-1">
                {status === 'ok' && <span className="text-primary flex items-center gap-1"><Check className="w-3 h-3" /> Image loaded</span>}
                {status === 'err' && <span className="text-destructive">Could not load image</span>}
                {status === 'idle' && <span className="text-muted-foreground">PNG, JPG, SVG, ICO supported</span>}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {initialUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={() => { onSave(null); onClose(); }}
                className="mr-auto"
              >
                Reset to favicon
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!url.trim() || status === 'err'}>Save icon</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
