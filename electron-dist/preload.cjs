// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  minimize: () => import_electron.ipcRenderer.send("window:minimize"),
  maximize: () => import_electron.ipcRenderer.send("window:maximize"),
  close: () => import_electron.ipcRenderer.send("window:close"),
  toggleFullscreen: () => import_electron.ipcRenderer.send("window:toggle-fullscreen")
});
