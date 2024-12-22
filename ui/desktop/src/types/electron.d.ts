// Define the electron API interface
interface ElectronAPI {
  hideWindow: () => void;
  createChatWindow: (query?: string) => void;
  directoryChooser: (replace?: boolean) => void;
  logInfo: (txt: string) => void;
  showNotification: (data: { title: string; body: string }) => void;
  createWingToWingWindow: (query?: string) => void;
  openInChrome: (url: string) => void;
  fetchMetadata: (url: string) => Promise<string>;
  reloadApp: () => void;
  selectFileOrDirectory: () => Promise<string>;
  getConfig: () => any;
  on: (channel: 'fatal-error', callback: (...args: any[]) => void) => void;
  off: (channel: 'fatal-error', callback: (...args: any[]) => void) => void;
  saveTemporaryImage: (base64Data: string) => Promise<string>;
}

interface AppConfig {
  get: (key: string) => any;
  getAll: () => any;
}

// Augment the Window interface
declare global {
  interface Window {
    electron: ElectronAPI;
    appConfig: AppConfig;
  }
}

export type { ElectronAPI, AppConfig };