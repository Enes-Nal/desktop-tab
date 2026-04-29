import { Win } from './Win';
import { WindowState } from '@/store/wmStore';
import { useFsStore } from '@/store/fsStore';
import { NodeIcon } from './NodeIcon';
import { formatSize, nodeSize, nodeTypeLabel } from '@/lib/fsMeta';
import { RotateCcw, Trash2 } from 'lucide-react';

export function RecycleBin({ win }: { win: WindowState }) {
  const nodes = useFsStore(s => s.nodes);
  const { restoreItems, emptyRecycleBin } = useFsStore();
  const deleted = nodes.filter(n => n.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));

  return (
    <Win win={win} minWidth={460} minHeight={280}>
      <div className="h-10 border-b border-border bg-muted/40 flex items-center px-2 gap-2 shrink-0">
        <button onClick={() => restoreItems(deleted.map(n => n.id))} disabled={!deleted.length} className="h-8 px-2 text-xs rounded-sm hover:bg-foreground/10 disabled:opacity-40 flex items-center gap-1">
          <RotateCcw className="w-4 h-4" /> Restore all
        </button>
        <button onClick={emptyRecycleBin} disabled={!deleted.length} className="h-8 px-2 text-xs rounded-sm hover:bg-destructive hover:text-destructive-foreground disabled:opacity-40 flex items-center gap-1">
          <Trash2 className="w-4 h-4" /> Empty Recycle Bin
        </button>
      </div>
      {deleted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Recycle Bin is empty</div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground sticky top-0 bg-background/90">
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 font-normal">Name</th>
                <th className="text-left px-2 py-2 font-normal">Type</th>
                <th className="text-left px-2 py-2 font-normal">Deleted</th>
                <th className="text-right px-3 py-2 font-normal">Size</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {deleted.map(n => (
                <tr key={n.id} className="border-b border-border/40 hover:bg-foreground/5">
                  <td className="px-3 py-2"><div className="flex items-center gap-2"><NodeIcon node={n} size={16} /><span className="truncate">{n.name}</span></div></td>
                  <td className="px-2 py-2 text-muted-foreground">{nodeTypeLabel(n)}</td>
                  <td className="px-2 py-2 text-muted-foreground">{n.deletedAt ? new Date(n.deletedAt).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatSize(nodeSize(n))}</td>
                  <td className="px-2 py-1 text-right">
                    <button onClick={() => restoreItems([n.id])} className="h-7 px-2 rounded-sm hover:bg-foreground/10">Restore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Win>
  );
}
