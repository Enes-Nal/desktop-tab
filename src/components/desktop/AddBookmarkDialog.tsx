import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { getFaviconUrl, normalizeUrl, getDomain } from '@/lib/favicon';
import { Globe, Upload, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; url: string; favicon: string; customIcon?: string }) => void;
}

export function AddBookmarkDialog({ open, onClose, onAdd }: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [customIcon, setCustomIcon] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setUrl(''); setTitle(''); setCustomIcon(null); }
  }, [open]);

  useEffect(() => {
    if (!url) return;
    const domain = getDomain(url);
    if (!title) {
      const name = domain.split('.')[0];
      setTitle(name.charAt(0).toUpperCase() + name.slice(1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim()) return;
    const finalUrl = normalizeUrl(url);
    onAdd({
      title: title.trim(),
      url: finalUrl,
      favicon: getFaviconUrl(finalUrl),
      customIcon: customIcon ?? undefined,
    });
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCustomIcon(reader.result as string);
    reader.readAsDataURL(file);
  };

  const previewIcon = customIcon || (url ? getFaviconUrl(normalizeUrl(url)) : '');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Bookmark</DialogTitle>
          <DialogDescription>Add a website to your desktop. The favicon is fetched automatically.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 flex items-center justify-center rounded bg-muted overflow-hidden border border-border shrink-0">
                {previewIcon ? (
                  <img src={previewIcon} alt="" className="w-10 h-10 object-contain" />
                ) : (
                  <Globe className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
                <Input
                  placeholder="Paste image URL (optional)"
                  value={customIcon && !customIcon.startsWith('data:') ? customIcon : ''}
                  onChange={(e) => setCustomIcon(e.target.value || null)}
                  className="h-8 text-xs"
                />
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => fileRef.current?.click()}>
                    <Upload className="w-3 h-3 mr-1" /> Upload
                  </Button>
                  {customIcon && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCustomIcon(null)}>
                      <X className="w-3 h-3 mr-1" /> Reset
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" autoFocus placeholder="example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Name</Label>
            <Input id="title" placeholder="Auto from URL" value={title} onChange={(e) => setTitle(e.target.value)} />
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
