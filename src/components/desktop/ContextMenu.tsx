import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface MenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  separator?: boolean;
  disabled?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  // Adjust position to viewport
  const w = 220, h = items.length * 32 + 8;
  const adjX = Math.min(x, window.innerWidth - w - 8);
  const adjY = Math.min(y, window.innerHeight - h - 56);

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[200px] py-1 rounded-md glass-menu animate-scale-in origin-top-left"
      style={{ left: adjX, top: adjY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="my-1 h-px bg-border" />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { item.onClick(); onClose(); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-1.5 text-sm text-left',
              'hover:bg-primary hover:text-primary-foreground',
              'disabled:opacity-50 disabled:pointer-events-none',
              item.destructive && 'text-destructive hover:bg-destructive hover:text-destructive-foreground',
            )}
          >
            {item.icon && <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
          </button>
        )
      )}
    </div>
  );
}
