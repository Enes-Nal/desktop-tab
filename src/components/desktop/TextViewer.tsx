import { useEffect, useState } from 'react';
import { Win } from './Win';
import { WindowState, useWMStore } from '@/store/wmStore';
import { useFsStore } from '@/store/fsStore';
import { Download, Save } from 'lucide-react';

export function TextViewer({ win }: { win: WindowState }) {
  const fileId = win.props.fileId as string;
  const node = useFsStore(s => s.nodes.find(n => n.id === fileId));
  const updateTextFile = useFsStore(s => s.updateTextFile);
  const renameItem = useFsStore(s => s.renameItem);
  const setTitle = useWMStore(s => s.setTitle);

  const [content, setContent] = useState(node?.textContent ?? '');
  const [name, setName] = useState(node?.name ?? '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setTitle(win.id, `${name || 'Untitled'}${dirty ? ' *' : ''} - Notepad`);
  }, [name, dirty, win.id, setTitle]);

  useEffect(() => {
    if (!dirty || !node) return;
    const id = window.setTimeout(() => {
      updateTextFile(fileId, content);
      if (name !== node.name) renameItem(fileId, name);
      setDirty(false);
    }, 900);
    return () => window.clearTimeout(id);
  }, [content, dirty, fileId, name, node, renameItem, updateTextFile]);

  useEffect(() => {
    // Sync if external changes (rare while editing)
    if (!dirty) {
      setContent(node?.textContent ?? '');
      setName(node?.name ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  if (!node) {
    return (
      <Win win={win}>
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          File not found
        </div>
      </Win>
    );
  }

  const save = () => {
    updateTextFile(fileId, content);
    if (name !== node.name) renameItem(fileId, name);
    setDirty(false);
  };

  const download = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name || 'file.txt';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Win win={win} minWidth={420} minHeight={260}>
      <div className="h-9 border-b border-border bg-muted/40 flex items-center px-2 gap-2 shrink-0">
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setDirty(true); }}
          placeholder="Untitled"
          className="flex-1 h-7 px-2 text-xs bg-background/60 border border-border rounded-sm outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={save}
          disabled={!dirty}
          className="h-7 px-2 text-xs flex items-center gap-1 rounded-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
          title="Save"
        >
          <Save className="w-3 h-3" /> Save
        </button>
        <button
          onClick={download}
          className="h-7 px-2 text-xs flex items-center gap-1 rounded-sm hover:bg-foreground/10"
          title="Download .txt"
        >
          <Download className="w-3 h-3" />
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); setDirty(true); }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault(); save();
          }
        }}
        className="flex-1 p-3 bg-transparent outline-none resize-none text-sm font-mono leading-relaxed"
        placeholder="Start typing..."
        spellCheck
      />
      <div className="px-3 py-1 text-[11px] text-muted-foreground border-t border-border flex justify-between shrink-0">
        <span>{content.length} chars · {content.split(/\s+/).filter(Boolean).length} words</span>
        <span>{dirty ? 'Unsaved changes' : 'Saved'}</span>
      </div>
    </Win>
  );
}
