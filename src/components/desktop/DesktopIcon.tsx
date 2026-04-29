import { useState, useRef, useEffect } from 'react';
import { FsNode, ICON_W, ICON_H } from '@/types/fs';
import { cn } from '@/lib/utils';
import { NodeIcon } from './NodeIcon';

interface Props {
  node: FsNode;
  selected: boolean;
  isRenaming: boolean;
  isDropTarget?: boolean;
  hoverEffectsEnabled: boolean;
  scale: number;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onActivate: (n: FsNode) => void;
  onRenameSubmit: (id: string, name: string) => void;
  onRenameCancel: () => void;
}

export function DesktopIcon({
  node, selected, isRenaming, isDropTarget, hoverEffectsEnabled, scale,
  onMouseDown, onContextMenu, onActivate, onRenameSubmit, onRenameCancel,
}: Props) {
  const [editValue, setEditValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const iconSize = Math.round(44 * scale);
  const iconWrapSize = Math.round(48 * scale);
  const labelSize = Math.max(10, Math.round(11 * scale));
  const isBookmark = node.kind === 'bookmark';
  const openCount = node.openCount ?? 0;
  const portalLevel = openCount >= 12 ? 'seasoned' : openCount >= 5 ? 'warm' : openCount >= 2 ? 'used' : 'fresh';
  const host = isBookmark && node.url ? safeHost(node.url) : '';

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
      data-portal-level={isBookmark ? portalLevel : undefined}
      className={cn(
        'desktop-icon absolute flex flex-col items-center gap-1 p-1 rounded-sm cursor-default',
        'transition-[background-color,box-shadow,transform] duration-100',
        isBookmark && hoverEffectsEnabled && 'bookmark-portal',
        selected && 'bg-primary/25 ring-1 ring-primary/60',
        hoverEffectsEnabled && !selected && 'hover:bg-foreground/10',
        isDropTarget && 'bg-primary/40 ring-2 ring-primary scale-105',
      )}
      style={{
        left: node.x,
        top: node.y,
        width: Math.round(ICON_W * scale),
        height: Math.round(ICON_H * scale),
        gap: Math.max(2, Math.round(4 * scale)),
        padding: Math.max(2, Math.round(4 * scale)),
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onContextMenu={(e) => onContextMenu(e, node.id)}
      onDoubleClick={() => onActivate(node)}
    >
      <div className="portal-icon-wrap flex items-center justify-center overflow-hidden" style={{ width: iconWrapSize, height: iconWrapSize }}>
        <NodeIcon node={node} size={iconSize} />
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
          className="w-full text-center px-1 bg-background text-foreground border border-primary outline-none rounded-sm"
          style={{ fontSize: labelSize, lineHeight: 1.15 }}
        />
      ) : (
        <span
          className={cn(
            'desktop-icon-label leading-tight text-center px-1 rounded-sm max-w-full break-words line-clamp-2',
            selected && 'bg-primary/40'
          )}
          style={{ fontSize: labelSize }}
        >
          {node.name}
        </span>
      )}
      {hoverEffectsEnabled && isBookmark && !isRenaming && (
        <div className="portal-preview pointer-events-none" aria-hidden>
          <div className="portal-preview-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="portal-preview-body">
            <NodeIcon node={node} size={24} />
            <div className="min-w-0">
              <div className="portal-preview-title">{node.name || host}</div>
              <div className="portal-preview-url">{host}</div>
            </div>
          </div>
          <div className="portal-preview-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
    </div>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}
