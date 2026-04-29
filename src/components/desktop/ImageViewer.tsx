import { useEffect, useState } from 'react';
import { Win } from './Win';
import { WindowState, useWMStore } from '@/store/wmStore';
import { useFsStore } from '@/store/fsStore';
import { getBlobUrl } from '@/lib/fsdb';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export function ImageViewer({ win }: { win: WindowState }) {
  const fileId = win.props.fileId as string;
  const node = useFsStore(s => s.nodes.find(n => n.id === fileId));
  const setTitle = useWMStore(s => s.setTitle);
  const [url, setUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setTitle(win.id, `${node?.name || 'Image'} — Image`);
  }, [node?.name, win.id, setTitle]);

  useEffect(() => {
    let active = true;
    let revoke: string | null = null;
    if (node?.blobKey) {
      getBlobUrl(node.blobKey).then(u => {
        if (!active || !u) return;
        revoke = u; setUrl(u);
      });
    }
    return () => { active = false; if (revoke) URL.revokeObjectURL(revoke); };
  }, [node?.blobKey]);

  if (!node) {
    return (
      <Win win={win}>
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">File not found</div>
      </Win>
    );
  }

  return (
    <Win win={win} minWidth={400} minHeight={300}>
      <div className="h-9 border-b border-border bg-muted/40 flex items-center px-2 gap-1 shrink-0">
        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.2))} className="h-7 w-7 flex items-center justify-center rounded-sm hover:bg-foreground/10" title="Zoom out">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(8, z + 0.2))} className="h-7 w-7 flex items-center justify-center rounded-sm hover:bg-foreground/10" title="Zoom in">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setZoom(1)} className="h-7 w-7 flex items-center justify-center rounded-sm hover:bg-foreground/10" title="Reset zoom">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground truncate">{node.name}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto bg-[hsl(var(--muted))] flex items-center justify-center p-4">
        {url ? (
          <img
            src={url}
            alt={node.name}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center', maxWidth: zoom <= 1 ? '100%' : 'none', maxHeight: zoom <= 1 ? '100%' : 'none' }}
            className="object-contain transition-transform select-none"
            draggable={false}
          />
        ) : (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}
      </div>
    </Win>
  );
}
