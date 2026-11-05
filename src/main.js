const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

let mainWindow;
let localServer;
let serverPort;
let CHUNKS_DIR;

// Start internal loopback server to serve v86 Wasm and handle disk chunks
function startInternalServer() {
  CHUNKS_DIR = path.join(app.getPath('userData'), 'chunks');
  if (!fs.existsSync(CHUNKS_DIR)) {
    fs.mkdirSync(CHUNKS_DIR, { recursive: true });
  }
  return new Promise((resolve) => {
    localServer = http.createServer((req, res) => {
      // CORS & Security headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

      const urlPath = decodeURIComponent(req.url.split('?')[0]);

      // 1. Intercept /chunks/ for on-demand fetch & cache
      if (urlPath.startsWith('/chunks/')) {
        const relPath = urlPath.slice('/chunks/'.length);
        const localPath = path.join(CHUNKS_DIR, relPath.replace(/\//g, path.sep));

        if (!fs.existsSync(localPath)) {
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
          const remoteUrl = `https://c.copy.sh/${relPath}`;
          https.get(remoteUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://copy.sh/v86/' } }, (remoteRes) => {
            if (remoteRes.statusCode === 200) {
              const fileStream = fs.createWriteStream(localPath);
              remoteRes.pipe(fileStream);
              fileStream.on('finish', () => {
                serveFile(localPath, req, res);
              });
            } else {
              res.writeHead(404);
              res.end('Chunk not found');
            }
          }).on('error', (err) => {
            console.error('Remote chunk error:', err);
            res.writeHead(502);
            res.end('Error fetching chunk');
          });
          return;
        }

        serveFile(localPath, req, res);
        return;
      }

      // 2. Serve static renderer files from src/
      let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        serveFile(filePath, req, res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    localServer.listen(0, '127.0.0.1', () => {
      serverPort = localServer.address().port;
      console.log(`Internal JHora server listening on http://127.0.0.1:${serverPort}`);
      resolve(serverPort);
    });
  });
}

function serveFile(filePath, req, res) {
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.wasm': 'application/wasm',
    '.bin': 'application/octet-stream',
    '.iso': 'application/octet-stream',
    '.zst': 'application/x-compressed',
    '.img': 'application/octet-stream',
    '.png': 'image/png'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  // Support HTTP 206 Partial Content for Range requests
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

async function createWindow() {
  await startInternalServer();

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'Jagannatha Hora (JHora) — Vedic Astrology',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  buildMenu();

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}/index.html`);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (localServer) localServer.close();
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Chart (.jhd)...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:action', 'open-chart')
        },
        {
          label: 'Export / Save Chart to Desktop...',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu:action', 'save-chart')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'JHora Actions',
      submenu: [
        {
          label: 'Lock / Capture Mouse',
          accelerator: 'CmdOrCtrl+M',
          click: () => mainWindow.webContents.send('menu:action', 'lock-mouse')
        },
        {
          label: 'Save Quick Snapshot',
          click: () => mainWindow.webContents.send('menu:action', 'save-snapshot')
        },
        { type: 'separator' },
        {
          label: 'Reset JHora VM',
          click: () => mainWindow.webContents.send('menu:action', 'reset-vm')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Jagannatha Hora',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Jagannatha Hora',
              message: 'Jagannatha Hora (JHora)\nAuthor: P.V.R. Narasimha Rao\n\nCross-platform Mac & Linux edition running via WebAssembly JIT.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for file dialogs
ipcMain.handle('dialog:openChart', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Jagannatha Hora Charts (*.jhd)', extensions: ['jhd', 'jh'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const buffer = fs.readFileSync(filePath);
    return { name: path.basename(filePath), data: Array.from(buffer) };
  }
  return null;
});

ipcMain.handle('dialog:saveChart', async (event, { data, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'chart.jhd',
    filters: [
      { name: 'Jagannatha Hora Charts (*.jhd)', extensions: ['jhd'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, Buffer.from(data));
    return { success: true, filePath: result.filePath };
  }
  return { success: false };
});

ipcMain.handle('window:toggleFullscreen', () => {
  const isFullScreen = mainWindow.isFullScreen();
  mainWindow.setFullScreen(!isFullScreen);
  return !isFullScreen;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
