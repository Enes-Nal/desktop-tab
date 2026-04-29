import { useEffect, useState } from 'react';
import { FsNode } from '@/types/fs';
import { getBlobUrl } from '@/lib/fsdb';
import { Folder, Globe, FileText, Image as ImageIcon, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  node: FsNode;
  size?: number;
  className?: string;
}

export function NodeIcon({ node, size = 40, className }: Props) {
  const [imgErr, setImgErr] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    if (node.kind === 'file' && node.blobKey && node.mimeType?.startsWith('image/')) {
      getBlobUrl(node.blobKey).then(u => {
        if (u) { url = u; setBlobUrl(u); }
      });
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [node.id, node.blobKey, node.kind, node.mimeType]);

  const px = `${size}px`;
  const wrapStyle = { width: px, height: px };

  if (node.kind === 'folder') {
    return (
      <Folder
        className={cn('drop-shadow-md', className)}
        style={{ ...wrapStyle, color: 'hsl(45 90% 60%)', fill: 'hsl(45 90% 60% / 0.85)' }}
        strokeWidth={1.25}
      />
    );
  }

  if (node.kind === 'bookmark') {
    const src = node.customIcon || node.favicon;
    if (src && !imgErr) {
      return (
        <img
          src={src}
          alt=""
          className={cn('object-contain drop-shadow-md', className)}
          style={wrapStyle}
          draggable={false}
          onError={() => setImgErr(true)}
        />
      );
    }
    return <Globe className={cn('text-primary drop-shadow-md', className)} style={wrapStyle} />;
  }

  // file
  if (node.mimeType === 'text/plain') {
    return <FileText className={cn('text-blue-400 drop-shadow-md', className)} style={wrapStyle} strokeWidth={1.5} />;
  }
  if (node.mimeType?.startsWith('image/')) {
    if (blobUrl) {
      return (
        <img
          src={blobUrl}
          alt=""
          className={cn('object-cover rounded-sm drop-shadow-md', className)}
          style={wrapStyle}
          draggable={false}
        />
      );
    }
    return <ImageIcon className={cn('text-emerald-400 drop-shadow-md', className)} style={wrapStyle} strokeWidth={1.5} />;
  }
  return <File className={cn('text-muted-foreground drop-shadow-md', className)} style={wrapStyle} strokeWidth={1.5} />;
}
