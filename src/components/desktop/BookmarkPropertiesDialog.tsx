import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FsNode } from '@/types/fs';
import { getFaviconUrl, normalizeUrl } from '@/lib/favicon';
import { useFsStore } from '@/store/fsStore';

export function BookmarkPropertiesDialog({ node, onClose }: { node: FsNode | null; onClose: () => void }) {
  const updateBookmark = useFsStore(s => s.updateBookmark);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [customIcon, setCustomIcon] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(node?.name ?? '');
    setUrl(node?.url ?? '');
    setCustomIcon(node?.customIcon ?? '');
    setNotes(node?.notes ?? '');
    setTags((node?.tags ?? []).join(', '));
  }, [node]);

  const save = () => {
    if (!node) return;
    const normalized = normalizeUrl(url);
    updateBookmark(node.id, {
      name: name.trim() || normalized,
      url: normalized,
      favicon: node.favicon || getFaviconUrl(normalized),
      customIcon: customIcon || undefined,
      notes,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    onClose();
  };

  const refreshFavicon = () => {
    if (!node) return;
    const normalized = normalizeUrl(url);
    setUrl(normalized);
    updateBookmark(node.id, { favicon: getFaviconUrl(normalized), url: normalized });
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCustomIcon(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={!!node} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Bookmark Properties</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} onBlur={() => setUrl(normalizeUrl(url))} /></div>
          <div className="space-y-1.5">
            <Label>Custom icon</Label>
            <div className="flex gap-2">
              <Input value={customIcon.startsWith('data:') ? 'Uploaded image' : customIcon} onChange={(e) => setCustomIcon(e.target.value)} />
              <input ref={fileRef} hidden type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>Upload</Button>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Tags</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="work, docs, reading" /></div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={refreshFavicon}>Refresh favicon</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
