import { useWMStore } from '@/store/wmStore';
import { FileExplorer } from './FileExplorer';
import { TextViewer } from './TextViewer';
import { ImageViewer } from './ImageViewer';

export function WindowHost() {
  const windows = useWMStore(s => s.windows);
  return (
    <>
      {windows.map(win => {
        switch (win.app) {
          case 'file-explorer': return <FileExplorer key={win.id} win={win} />;
          case 'text-viewer': return <TextViewer key={win.id} win={win} />;
          case 'image-viewer': return <ImageViewer key={win.id} win={win} />;
          default: return null;
        }
      })}
    </>
  );
}
