import 'dotenv/config';
import { loadZshEnv } from './utils/loadEnv';
import { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, Notification, MenuItem, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { startGoosed } from './goosed';
import started from "electron-squirrel-startup";
import log from './utils/logger';
import { exec } from 'child_process';
import { addRecentDir, loadRecentDirs } from './utils/recentDirs';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) app.quit();

declare var MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare var MAIN_WINDOW_VITE_NAME: string;

// Parse command line arguments
const parseArgs = () => {
  const args = process.argv.slice(2); // Remove first two elements (electron and script path)
  let dirPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && i + 1 < args.length) {
      dirPath = args[i + 1];
      break;
    }
  }

  return { dirPath };
};

const checkApiCredentials = () => {

  loadZshEnv(app.isPackaged);

  //{env-macro-start}//  
  const isDatabricksConfigValid =
    process.env.GOOSE_PROVIDER__TYPE === 'databricks' &&
    process.env.GOOSE_PROVIDER__HOST &&
    process.env.GOOSE_PROVIDER__MODEL;

  const isOpenAIDirectConfigValid =
    process.env.GOOSE_PROVIDER__TYPE === 'openai' &&
    process.env.GOOSE_PROVIDER__HOST === 'https://api.openai.com' &&
    process.env.GOOSE_PROVIDER__MODEL &&
    process.env.GOOSE_PROVIDER__API_KEY;

  return isDatabricksConfigValid || isOpenAIDirectConfigValid
  //{env-macro-end}//
};

const generateSecretKey = () => {
  const crypto = require('crypto');
  let key = crypto.randomBytes(32).toString('hex');
  process.env.GOOSE_SERVER__SECRET_KEY = key;
  return key;
};

let appConfig = { 
  apiCredsMissing: !checkApiCredentials(),
  GOOSE_API_HOST: 'http://127.0.0.1',
  GOOSE_SERVER__PORT: 0,
  GOOSE_WORKING_DIR: '',
  secretKey: generateSecretKey(),
};

const createLauncher = () => {
  const launcherWindow = new BrowserWindow({
    width: 600,
    height: 60,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [JSON.stringify(appConfig)],
    },
    skipTaskbar: true,
    alwaysOnTop: true,
  });

  // Center on screen
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const windowBounds = launcherWindow.getBounds();

  launcherWindow.setPosition(
    Math.round(width / 2 - windowBounds.width / 2),
    Math.round(height / 3 - windowBounds.height / 2)
  );

  // Load launcher window content
  const launcherParams = '?window=launcher#/launcher';
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    launcherWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}${launcherParams}`);
  } else {
    launcherWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html${launcherParams}`)
    );
  }

  // Destroy window when it loses focus
  launcherWindow.on('blur', () => {
    launcherWindow.destroy();
  });
};


// Track windows by ID
let windowCounter = 0;
const windowMap = new Map<number, BrowserWindow>();

const createChat = async (app, query?: string, dir?: string) => {
  const [port, working_dir] = await startGoosed(app, dir);  
  const mainWindow = new BrowserWindow({
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 10 },
    vibrancy: 'under-window',
    width: 750,
    height: 800,
    minWidth: 650,
    minHeight: 800,
    transparent: true,
    useContentSize: true,
    icon: path.join(__dirname, '../images/icon'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [JSON.stringify({ ...appConfig, GOOSE_SERVER__PORT: port, GOOSE_WORKING_DIR: working_dir, REQUEST_DIR: dir })],
    },
  });

  // Load the index.html of the app.
  const queryParam = query ? `?initialQuery=${encodeURIComponent(query)}` : '';
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  // Increment window counter to track number of windows
  const windowId = ++windowCounter;
  const direction = windowId % 2 === 0 ? 1 : -1; // Alternate direction
  const initialOffset = 50;

  // Set window position with alternating offset strategy
  const baseXPosition = Math.round(width / 2 - mainWindow.getSize()[0] / 2);
  const xOffset = direction * initialOffset * Math.floor(windowId / 2);
  mainWindow.setPosition(baseXPosition + xOffset, 100);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}${queryParam}`);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { search: queryParam.slice(1) }
    );
  }

  // DevTools
  globalShortcut.register('Alt+Command+I', () => {
    mainWindow.webContents.openDevTools();
  });

  windowMap.set(windowId, mainWindow);
  mainWindow.on('closed', () => {
    windowMap.delete(windowId);
  });
};

const createTray = () => {
  const isDev = process.env.NODE_ENV === 'development';
  let iconPath: string;

  if (isDev) {
    iconPath = path.join(process.cwd(), 'src', 'images', 'iconTemplate.png');
  } else {
    iconPath = path.join(process.resourcesPath, 'images', 'iconTemplate.png');
  }

  const tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Window', click: showWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setToolTip('Goose');
  tray.setContextMenu(contextMenu);
};


const showWindow = () => {
  const windows = BrowserWindow.getAllWindows();

  if (windows.length === 0) {
    log.info("No windows are currently open.");
    return;
  }

  // Define the initial offset values
  const initialOffsetX = 30;
  const initialOffsetY = 30;

  // Iterate over all windows
  windows.forEach((win, index) => {
    const currentBounds = win.getBounds(); // Get the current window bounds (position and size)

    // Calculate the new position with an incremental offset
    const newX = currentBounds.x + initialOffsetX * index;
    const newY = currentBounds.y + initialOffsetY * index;

    // Set the new bounds with the calculated position
    win.setBounds({
      x: newX,
      y: newY,
      width: currentBounds.width,
      height: currentBounds.height,
    });

    if (!win.isVisible()) {
      win.show();
    }

    win.focus();
  });
};

const buildRecentFilesMenu = () => {
  const recentDirs = loadRecentDirs();
  return recentDirs.map(dir => ({
    label: dir,
    click: () => {
      createChat(app, undefined, dir);
    }
  }));
};

const openDirectoryDialog = async (replaceWindow: boolean = false) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    addRecentDir(result.filePaths[0]);
    if (replaceWindow) {
      BrowserWindow.getFocusedWindow().close();
    }
    createChat(app, undefined, result.filePaths[0]);
  }
};

// Global error handler
const handleFatalError = (error: Error) => {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(win => {
    win.webContents.send('fatal-error', error.message || 'An unexpected error occurred');
  });
};

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  handleFatalError(error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  handleFatalError(error instanceof Error ? error : new Error(String(error)));
});

// Add file/directory selection handler
ipcMain.handle('select-file-or-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Temp directory for image storage
const TEMP_DIR = path.join(os.tmpdir(), 'goose-images');

// Ensure temp directory exists with proper permissions
const ensureTempDir = () => {
  try {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { 
        recursive: true, 
        mode: 0o777  // Full permissions for temp directory
      });
    }

    // Verify directory permissions
    const stats = fs.statSync(TEMP_DIR);
    const requiredMode = 0o777;
    
    if ((stats.mode & 0o777) !== requiredMode) {
      fs.chmodSync(TEMP_DIR, requiredMode);
    }

    return true;
  } catch (error) {
    log.error('Error in ensureTempDir:', error);
    return false;
  }
};

// Save temporary image with retries
const saveTempImage = async (imageData: string, retries = 3): Promise<string> => {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Ensure temp directory exists
      if (!ensureTempDir()) {
        throw new Error('Failed to create temp directory');
      }

      // Process base64 data
      const base64Data = imageData.includes('base64,')
        ? imageData.split('base64,')[1]
        : imageData;

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const filename = `${timestamp}-${random}.png`;
      const filepath = path.join(TEMP_DIR, filename);

      // Write file with proper permissions
      await fs.promises.writeFile(filepath, Buffer.from(base64Data, 'base64'), { mode: 0o666 });

      // Verify file was written
      if (!fs.existsSync(filepath)) {
        throw new Error('Failed to verify file was written');
      }

      return filepath;
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        throw new Error(`Failed to save file after ${retries} attempts: ${error.message}`);
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
};

// Cleanup temporary files
const cleanupTempFiles = () => {
  try {
    if (!fs.existsSync(TEMP_DIR)) {
      return;
    }

    const files = fs.readdirSync(TEMP_DIR);
    const now = Date.now();
    let totalSize = 0;

    // Get directory stats
    files.forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });

    // Cleanup based on multiple criteria
    files.forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      const stats = fs.statSync(filePath);

      // Age-based cleanup (files older than 1 hour)
      const AGE_LIMIT = 3600000; // 1 hour in milliseconds
      const isTooOld = (now - stats.mtimeMs) > AGE_LIMIT;

      // Size-based cleanup (if directory is too large)
      const SIZE_LIMIT = 100 * 1024 * 1024; // 100MB
      const isDirectoryFull = totalSize > SIZE_LIMIT;

      if (isTooOld || isDirectoryFull) {
        try {
          fs.unlinkSync(filePath);
          log.info(`Cleaned up file: ${file}`);
          totalSize -= stats.size;
        } catch (error) {
          log.error(`Failed to delete file ${file}:`, error);
        }
      }
    });
  } catch (error) {
    log.error('Error in cleanupTempFiles:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupTempFiles, 3600000);

// Cleanup on app exit
app.on('will-quit', () => {
  try {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
      log.info('Successfully removed temp directory on exit');
    }
  } catch (error) {
    log.error('Failed to cleanup temp directory on exit:', error);
  }
});

// Add IPC handler for saving temporary images
ipcMain.handle('save-temp-image', async (_, imageData: string) => {
  return saveTempImage(imageData);
});

app.whenReady().then(async () => {
  // Test error feature - only enabled with GOOSE_TEST_ERROR=true
  if (process.env.GOOSE_TEST_ERROR === 'true') {
    console.log('Test error feature enabled, will throw error in 5 seconds');
    setTimeout(() => {
      console.log('Throwing test error now...');
      throw new Error('Test error: This is a simulated fatal error after 5 seconds');
    }, 5000);
  }

  // Parse command line arguments
  const { dirPath } = parseArgs();
  
  createTray();
  createChat(app, undefined, dirPath);

  // Show launcher input on key combo
  globalShortcut.register('Control+Alt+Command+G', createLauncher);

  // Preserve existing menu and add new items
  const menu = Menu.getApplicationMenu();
  const fileMenu = menu?.items.find(item => item.label === 'File');
  
  // open goose to specific dir and set that as its working space
  fileMenu.submenu.append(new MenuItem({
    label: 'Open Directory...',
    accelerator: 'CmdOrCtrl+O',
    click() {
      openDirectoryDialog();
    },
  }));

  // Add Recent Files submenu
  const recentFilesSubmenu = buildRecentFilesMenu();
  if (recentFilesSubmenu.length > 0) {
    fileMenu.submenu.append(new MenuItem({ type: 'separator' }));
    fileMenu.submenu.append(new MenuItem({
      label: 'Recent Directories',
      submenu: recentFilesSubmenu
    }));
  }

  // Add 'New Chat Window' and 'Open Directory' to File menu
  if (fileMenu && fileMenu.submenu) {
    fileMenu.submenu.append(new MenuItem({
      label: 'New Chat Window',
      accelerator: 'CmdOrCtrl+N',
      click() {
        ipcMain.emit('create-chat-window');
      },
    }));

  }

  Menu.setApplicationMenu(menu);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createChat(app);
    }
  });

  ipcMain.on('create-chat-window', (_, query) => {
    createChat(app, query);
  });

  ipcMain.on('directory-chooser', (_, replace: boolean = false) => {
    openDirectoryDialog(replace);
  });

  ipcMain.on('notify', (event, data) => {
    console.log("NOTIFY", data);
    new Notification({ title: data.title, body: data.body }).show();
  });

  ipcMain.on('logInfo', (_, info) => {
    log.info("from renderer:", info);
  });

  ipcMain.on('reload-app', () => {
    app.relaunch();
    app.exit(0);
  });

  // Handle metadata fetching from main process
  ipcMain.handle('fetch-metadata', async (_, url) => {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Goose/1.0)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Error fetching metadata:', error);
      throw error;
    }
  });

  ipcMain.on('open-in-chrome', (_, url) => {
    // On macOS, use the 'open' command with Chrome
    if (process.platform === 'darwin') {
      exec(`open -a "Google Chrome" "${url}"`);
    } else if (process.platform === 'win32') {
      // On Windows, use start command
      exec(`start chrome "${url}"`);
    } else {
      // On Linux, use xdg-open with chrome
      exec(`xdg-open "${url}"`);
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});