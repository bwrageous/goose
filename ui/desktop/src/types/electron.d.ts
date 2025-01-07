interface IElectronAPI {
  hideWindow: () => void;
  createChatWindow: (query?: string) => void;
  directoryChooser: (replace?: boolean) => void;
  logInfo: (txt: string) => void;
  showNotification: (data: { title: string; body: string }) => void;
  createWingToWingWindow: (query?: string) => void;
  openInChrome: (url: string) => void;
  fetchMetadata: (url: string) => Promise<string>;
  reloadApp: () => void;
  selectFileOrDirectory: () => Promise<string | null>;
  saveTemporaryImage: (imageData: string) => Promise<string>;
  getConfig: () => {
    GOOSE_SERVER__PORT: number;
    GOOSE_API_HOST: string;
    apiCredsMissing: boolean;
    secretKey: string;
  };
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    electron: IElectronAPI;
    appConfig: {
      get: (key: string) => any;
      getAll: () => Record<string, any>;
    };
  }
}

export {};