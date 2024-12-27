import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './types/electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  hideWindow: () => ipcRenderer.send('hide-window'),
  createChatWindow: (query: string) => ipcRenderer.send('create-chat-window', query),
  directoryChooser: (replace: boolean) => ipcRenderer.send('directory-chooser', replace),
  logInfo: (txt: string) => ipcRenderer.send('logInfo', txt),
  showNotification: (data: { title: string; body: string }) => ipcRenderer.send('notify', data),
  createWingToWingWindow: (query: string) => ipcRenderer.send('create-wing-to-wing-window', query),
  openInChrome: (url: string) => ipcRenderer.send('open-in-chrome', url),
  fetchMetadata: (url: string) => ipcRenderer.invoke('fetch-metadata', url),
  reloadApp: () => ipcRenderer.send('reload-app'),
  selectFileOrDirectory: () => ipcRenderer.invoke('select-file-or-directory'),
  getConfig: () => window.appConfig?.getAll(),
  on: (channel: 'fatal-error', callback: (...args: any[]) => void) => ipcRenderer.on(channel, callback),
  off: (channel: 'fatal-error', callback: (...args: any[]) => void) => ipcRenderer.removeListener(channel, callback),
  saveTemporaryImage: (base64Data: string) => ipcRenderer.invoke('save-temp-image', base64Data),
} as ElectronAPI); 