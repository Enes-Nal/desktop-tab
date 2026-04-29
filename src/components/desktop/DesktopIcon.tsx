import { useState, useRef, useEffect } from 'react';
import { FsNode, ICON_W, ICON_H } from '@/types/fs';
import { cn } from '@/lib/utils';
import { NodeIcon } from './NodeIcon';

interface Props {
  node: FsNode;
  selected: boolean;
  isRenaming: boolean;
  isDropTarget?: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onActivate: (n: FsNode) => void;
  onRenameSubmit: (id: string, name: string) => void;
  onRenameCancel: () => void;
}

export function DesktopIcon({
  node, selected, isRenaming, isDropTarget,
  onMouseDown, onContextMenu, onActivate, onRenameSubmit, onRenameCancel,
}: Props) {
  const [editValue, setEditValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setEditValue(node.name);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isRenaming, node.name]);

  return (
    <div
      data-icon-id={node.id}
      className={cn(
        'absolute flex flex-col items-center gap-1 p-1 rounded-sm cursor-default',
        'transition-[background-color,box-shadow,transform] duration-100',
        selected && 'bg-primary/25 ring-1 ring-primary/60',
        !selected && 'hover:bg-foreground/10',
        isDropTarget && 'bg-primary/40 ring-2 ring-primary scale-105',
      )}
      style={{
        left: node.x,
        top: node.y,
        width: ICON_W,
        height: ICON_H,
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onContextMenu={(e) => onContextMenu(e, node.id)}
      onDoubleClick={() => onActivate(node)}
    >
      <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
        <NodeIcon node={node} size={44} />
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
            if (e.key === 'Enter') onRenameSubmit(node.id, editValue);
            if (e.key === 'Escape') onRenameCancel();
          }}
          onBlur={() => onRenameSubmit(node.id, editValue)}
          className="w-full text-[11px] text-center px-1 bg-background text-foreground border border-primary outline-none rounded-sm"
        />
      ) : (
        <span
          className={cn(
            'desktop-icon-label text-[11px] leading-tight text-center px-1 rounded-sm max-w-full break-words line-clamp-2',
            selected && 'bg-primary/40'
          )}
        >
          {node.name}
        </span>
      )}
    </div>
  );
}
