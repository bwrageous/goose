interface IElectronAPI {
  getConfig: () => any;
  hideWindow: () => void;
  directoryChooser: (replace: boolean) => void;
  createChatWindow: (query?: string) => void;
  logInfo: (txt: string) => void;
  showNotification: (data: { title: string; body: string }) => void;
  createWingToWingWindow: (query?: string) => void;
  openInChrome: (url: string) => void;
  fetchMetadata: (url: string) => Promise<string>;
  reloadApp: () => void;
  selectFileOrDirectory: () => Promise<string>;
  on: (channel: 'fatal-error', callback: (...args: any[]) => void) => void;
  off: (channel: 'fatal-error', callback: (...args: any[]) => void) => void;
  saveTemporaryImage: (base64Data: string) => Promise<string>;
}

declare global {
  interface Window {
    electron: IElectronAPI;
    appConfig: {
      get: (key: string) => any;
      getAll: () => any;
    };
  }
}