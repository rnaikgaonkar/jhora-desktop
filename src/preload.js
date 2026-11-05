const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jhoraDesktop', {
  openChartDialog: () => ipcRenderer.invoke('dialog:openChart'),
  saveChartDialog: (data, defaultName) => ipcRenderer.invoke('dialog:saveChart', { data, defaultName }),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  notifyReady: () => ipcRenderer.send('app:ready'),
  onMenuAction: (callback) => {
    ipcRenderer.on('menu:action', (event, action) => callback(action));
  }
});

