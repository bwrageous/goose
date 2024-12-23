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

// Initialize temp directory path in user's home directory
const TEMP_DIR = path.join(os.homedir(), '.goose-temp');

// Ensure temp directory exists and is accessible
const ensureTempDir = () => {
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true, mode: 0o777 });
    }
    return true;
  } catch (error) {
    console.error('Error creating temp directory:', error);
    return false;
  }
};

// Image handling functions
const saveTempImage = async (imageData: string) => {
  try {
    // First, ensure the temp directory exists
    if (!ensureTempDir()) {
      throw new Error('Failed to create temp directory');
    }

    // Extract base64 data if needed
    const base64Data = imageData.includes('base64,')
      ? imageData.split('base64,')[1]
      : imageData;

    // Create a unique filename
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const filepath = path.join(TEMP_DIR, filename);

    // Write file synchronously with full permissions
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'), { mode: 0o666 });

    // Verify file was written
    if (!fs.existsSync(filepath)) {
      throw new Error('Failed to verify file was written');
    }

    return filepath;
  } catch (error) {
    console.error('Error in saveTempImage:', error);
    throw error;
  }
};

// Set up temp directory when app is ready
app.whenReady().then(() => {
  // Create temp directory with full permissions
  if (!ensureTempDir()) {
    console.error('Failed to set up temp directory on startup');
  }
});

// Handle image saving
ipcMain.handle('save-temp-image', async (_, imageData: string) => {
  if (!imageData) {
    throw new Error('No image data provided');
  }

  try {
    // Always ensure temp directory exists before saving
    if (!ensureTempDir()) {
      throw new Error('Failed to create temp directory');
    }

    const filepath = await saveTempImage(imageData);
    if (!fs.existsSync(filepath)) {
      throw new Error('File not found after saving');
    }
    return filepath;
  } catch (error) {
    console.error('Error in save-temp-image handler:', error);
    throw error;
  }
});

// Clean up temp files periodically
const cleanupTempFiles = () => {
  try {
    if (fs.existsSync(TEMP_DIR)) {
      const files = fs.readdirSync(TEMP_DIR);
      const now = Date.now();
      files.forEach(file => {
        const filePath = path.join(TEMP_DIR, file);
        const stats = fs.statSync(filePath);
        // Remove files older than 1 hour
        if (now - stats.mtimeMs > 3600000) {
          fs.unlinkSync(filePath);
        }
      });
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
};

// Clean up old files every hour
setInterval(cleanupTempFiles, 3600000);

// Clean up on app exit
app.on('will-quit', () => {
  try {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Error cleaning up temp directory:', error);
  }
});