import { useWMStore } from '@/store/wmStore';
import { FileExplorer } from './FileExplorer';
import { TextViewer } from './TextViewer';
import { ImageViewer } from './ImageViewer';
import { RecycleBin } from './RecycleBin';
import { GoogleAppWindow } from './GoogleAppWindow';
import { SettingsWindow } from './SettingsWindow';

export function WindowHost() {
  const windows = useWMStore(s => s.windows);
  return (
    <>
      {windows.map(win => {
        switch (win.app) {
          case 'file-explorer': return <FileExplorer key={win.id} win={win} />;
          case 'text-viewer': return <TextViewer key={win.id} win={win} />;
          case 'image-viewer': return <ImageViewer key={win.id} win={win} />;
          case 'recycle-bin': return <RecycleBin key={win.id} win={win} />;
          case 'google-app': return <GoogleAppWindow key={win.id} win={win} />;
          case 'settings': return <SettingsWindow key={win.id} win={win} />;
          default: return null;
        }
      })}
    </>
  );
}
