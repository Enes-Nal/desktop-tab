import { useState, useRef, useEffect } from 'react';
import { DesktopItem, ICON_W, ICON_H } from '@/types/desktop';
import { cn } from '@/lib/utils';
import { Globe, Folder } from 'lucide-react';

interface Props {
  item: DesktopItem;
  selected: boolean;
  isRenaming: boolean;
  isDropTarget?: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onActivate: (item: DesktopItem) => void;
  onRenameSubmit: (id: string, title: string) => void;
  onRenameCancel: () => void;
}

export function DesktopIcon({
  item, selected, isRenaming, isDropTarget,
  onMouseDown, onContextMenu, onActivate, onRenameSubmit, onRenameCancel,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const [editValue, setEditValue] = useState(item.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setEditValue(item.title);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isRenaming, item.title]);

  const iconSrc = item.customIcon || item.favicon;

  return (
    <div
      data-icon-id={item.id}
      className={cn(
        'absolute flex flex-col items-center gap-1 p-1 rounded-sm cursor-default',
        'transition-[background-color,box-shadow,transform] duration-100',
        selected && 'bg-primary/25 ring-1 ring-primary/60',
        !selected && 'hover:bg-foreground/10',
        isDropTarget && 'bg-primary/40 ring-2 ring-primary scale-105',
      )}
      style={{
        left: item.x,
        top: item.y,
        width: ICON_W,
        height: ICON_H,
      }}
      onMouseDown={(e) => onMouseDown(e, item.id)}
      onContextMenu={(e) => onContextMenu(e, item.id)}
      onDoubleClick={() => onActivate(item)}
    >
      <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
        {item.kind === 'folder' ? (
          <Folder
            className="w-11 h-11"
            strokeWidth={1.25}
            style={{ color: 'hsl(45 90% 60%)', fill: 'hsl(45 90% 60% / 0.85)' }}
          />
        ) : iconSrc && !imgError ? (
          <img
            src={iconSrc}
            alt=""
            className="w-10 h-10 object-contain drop-shadow-md"
            draggable={false}
            onError={() => setImgError(true)}
          />
        ) : (
          <Globe className="w-9 h-9 text-primary drop-shadow-md" />
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
            if (e.key === 'Enter') onRenameSubmit(item.id, editValue);
            if (e.key === 'Escape') onRenameCancel();
          }}
          onBlur={() => onRenameSubmit(item.id, editValue)}
          className="w-full text-[11px] text-center px-1 bg-background text-foreground border border-primary outline-none rounded-sm"
        />
      ) : (
        <span
          className={cn(
            'desktop-icon-label text-[11px] leading-tight text-center px-1 rounded-sm max-w-full break-words line-clamp-2',
            selected && 'bg-primary/40'
          )}
        >
          {item.title}
        </span>
      )}
    </div>
  );
}
