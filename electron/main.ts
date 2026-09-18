import { app, BrowserWindow, shell } from 'electron';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

// ── Performance / GPU flags (must be set before app.whenReady) ──────────────
// Bypass GPU driver block-list so the GPU is always used
app.commandLine.appendSwitch('ignore-gpu-blocklist');
// Disable background tab throttling so the game loop never slows down
app.commandLine.appendSwitch('disable-renderer-backgrounding');
// Force GPU compositing
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
// WebGPU (future-proofing / optional)
app.commandLine.appendSwitch('enable-unsafe-webgpu');
// Extra GPU command buffer memory for large voxel meshes
app.commandLine.appendSwitch('max-gum-command-buffer-size', '65536');
// Allow SharedArrayBuffer (useful for future worker-based chunk gen)
app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    title: 'Voxel Frontiers: Procedural Sandbox',
    backgroundColor: '#000000',
    show: false, // avoid white flash on startup
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !isDev,
      backgroundThrottling: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Open external links in the OS browser, not inside the game window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
