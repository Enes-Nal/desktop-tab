import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { getFaviconUrl, normalizeUrl, getDomain } from '@/lib/favicon';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; url: string; favicon: string }) => void;
  position?: { x: number; y: number };
  initialPosition?: { x: number; y: number };
}

export function AddBookmarkDialog({ open, onClose, onAdd }: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!open) { setUrl(''); setTitle(''); }
  }, [open]);

  // Auto-fill title from domain when URL changes and title is empty/derived
  useEffect(() => {
    if (!url) return;
    const domain = getDomain(url);
    if (!title || title === getDomain(url.slice(0, -1))) {
      const niceName = domain.split('.')[0];
      setTitle(niceName.charAt(0).toUpperCase() + niceName.slice(1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim()) return;
    const finalUrl = normalizeUrl(url);
    onAdd({
      title: title.trim() || getDomain(finalUrl),
      url: finalUrl,
      favicon: getFaviconUrl(finalUrl),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Bookmark</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              autoFocus
              placeholder="example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Name</Label>
            <Input
              id="title"
              placeholder="Auto from URL"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!url.trim()}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
