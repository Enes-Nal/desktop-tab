import { useState, useRef, useEffect } from 'react';
import { Bookmark, ICON_W, ICON_H } from '@/types/desktop';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';

interface Props {
  bookmark: Bookmark;
  selected: boolean;
  isRenaming: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onOpen: (b: Bookmark) => void;
  onRenameSubmit: (id: string, title: string) => void;
  onRenameCancel: () => void;
}

export function DesktopIcon({
  bookmark, selected, isRenaming,
  onMouseDown, onContextMenu, onOpen, onRenameSubmit, onRenameCancel,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const [editValue, setEditValue] = useState(bookmark.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setEditValue(bookmark.title);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isRenaming, bookmark.title]);

  return (
    <div
      data-icon-id={bookmark.id}
      className={cn(
        'absolute flex flex-col items-center gap-1 p-1 rounded-sm cursor-default',
        'transition-[background-color,box-shadow] duration-100',
        selected && 'bg-primary/25 ring-1 ring-primary/60',
        !selected && 'hover:bg-foreground/10',
      )}
      style={{
        left: bookmark.x,
        top: bookmark.y,
        width: ICON_W,
        height: ICON_H,
      }}
      onMouseDown={(e) => onMouseDown(e, bookmark.id)}
      onContextMenu={(e) => onContextMenu(e, bookmark.id)}
      onDoubleClick={() => onOpen(bookmark)}
    >
      <div className="w-12 h-12 flex items-center justify-center rounded bg-card/40 backdrop-blur-sm shadow-md overflow-hidden">
        {bookmark.favicon && !imgError ? (
          <img
            src={bookmark.favicon}
            alt=""
            className="w-9 h-9 object-contain"
            draggable={false}
            onError={() => setImgError(true)}
          />
        ) : (
          <Globe className="w-8 h-8 text-primary" />
        )}
      </div>
      {isRenaming ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') onRenameSubmit(bookmark.id, editValue.trim() || bookmark.title);
            if (e.key === 'Escape') onRenameCancel();
          }}
          onBlur={() => onRenameSubmit(bookmark.id, editValue.trim() || bookmark.title)}
          className="w-full text-[11px] text-center px-1 bg-background text-foreground border border-primary outline-none rounded-sm"
        />
      ) : (
        <span
          className={cn(
            'desktop-icon-label text-[11px] leading-tight text-center px-1 rounded-sm max-w-full break-words line-clamp-2',
            selected && 'bg-primary/40'
          )}
        >
          {bookmark.title}
        </span>
      )}
    </div>
  );
}
