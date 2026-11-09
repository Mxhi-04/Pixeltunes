const { app, BrowserWindow, Menu, Tray, ipcMain, shell, screen, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const playerSizes = require('../src/types/playerSizes.json');
const { results: authResults, sendSpotifyResult } = require('./spotify-result.cjs');

const isMac = process.platform === 'darwin';
const appIconPath = fs.existsSync(path.join(__dirname, 'assets', 'icon.png'))
  ? path.join(__dirname, 'assets', 'icon.png')
  : path.join(__dirname, '../assets/pixeltunes-icon.png');
let mainWindow = null;
let tray = null;
let isQuitting = false;
let isAlwaysOnTop = true;
let playerScale = 'standard';
let playerLayoutMode = 'classic';
let currentAspectRatio = 720 / 410;
let persistentAuthServer = null;

// Spotify PKCE Public Client (No Client Secret Required Anywhere!)
const SPOTIFY_CLIENT_ID = process.env.VITE_SPOTIFY_CLIENT_ID ||
  require('../package.json').config?.spotifyClientId || '0e51fa9c7bfb4df7b72cfa5d72d87df0';
const SPOTIFY_CALLBACK_ORIGIN = 'http://127.0.0.1:8888';
const SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-recently-played',
];

const tokenEndpoint = 'https://accounts.spotify.com/api/token';
let pendingLogin = null;
let sessionVersion = 0;
let activeRefresh = null;
let savedSession = null;
let lastClientId = SPOTIFY_CLIENT_ID;

function getSpotifyClientIdPath() {
  return path.join(app.getPath('userData'), 'spotify_client_id');
}

function rememberSpotifyClientId(clientId) {
  lastClientId = clientId;
  try {
    const file = getSpotifyClientIdPath();
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== clientId) {
      fs.writeFileSync(file, clientId, { mode: 0o600 });
    }
  } catch {
    console.warn('[Spotify] Could not save the Spotify Client ID preference.');
  }
}

function getSecureTokenPath() {
  return path.join(app.getPath('userData'), 'spotify_refresh.token');
}

async function saveRefreshToken(session, version) {
  if (version !== sessionVersion) return;
  savedSession = session;
  rememberSpotifyClientId(session.clientId);
  try {
    if (!await safeStorage.isAsyncEncryptionAvailable()) return;
    if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text') return;
    const encrypted = await safeStorage.encryptStringAsync(JSON.stringify(session));
    if (version === sessionVersion && savedSession === session) {
      const tokenPath = getSecureTokenPath();
      fs.writeFileSync(`${tokenPath}.tmp`, encrypted, { mode: 0o600 });
      fs.renameSync(`${tokenPath}.tmp`, tokenPath);
    }
  } catch {
    console.warn('[Spotify] Secure token storage is unavailable. This session is in memory.');
  }
}

async function loadRefreshToken() {
  const version = sessionVersion;
  if (savedSession) return savedSession;
  try {
    const buffer = fs.readFileSync(getSecureTokenPath());
    if (!await safeStorage.isAsyncEncryptionAvailable()) return null;
    if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text') return null;
    const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(buffer);
    if (!result || version !== sessionVersion) return null;
    // Older releases encrypted the token by itself.
    const session = result.startsWith('{') ? JSON.parse(result) : { refreshToken: result, clientId: SPOTIFY_CLIENT_ID };
    if (typeof session.refreshToken !== 'string' || !/^[a-f0-9]{32}$/i.test(session.clientId)) return null;
    savedSession = session;
    rememberSpotifyClientId(session.clientId);
    if (shouldReEncrypt) void saveRefreshToken(session, version);
    return session;
  } catch {
    return null;
  }
}

function clearSession() {
  sessionVersion++;
  pendingLogin = null;
  savedSession = null;
  const tokenPath = getSecureTokenPath();
  fs.rmSync(tokenPath, { force: true });
  fs.rmSync(`${tokenPath}.tmp`, { force: true });
}

async function requestToken(params, clientId) {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    body: new URLSearchParams({ client_id: clientId, ...params }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json();
  return response.ok ? data : { error: data.error || 'token_request_failed' };
}

function performPkceTokenRefresh() {
  const version = sessionVersion;
  if (activeRefresh?.version === version) return activeRefresh.promise;
  const promise = (async () => {
    try {
      const session = await loadRefreshToken();
      if (!session || version !== sessionVersion) return { error: 'no_refresh_token' };
      const data = await requestToken({
        grant_type: 'refresh_token', refresh_token: session.refreshToken,
      }, session.clientId);
      if (version !== sessionVersion) return { error: 'session_changed' };
      if (data.error === 'invalid_grant') {
        clearSession();
        return data;
      }
      if (data.refresh_token) void saveRefreshToken({ ...session, refreshToken: data.refresh_token }, version);
      if (version !== sessionVersion) return { error: 'session_changed' };
      return { access_token: data.access_token, expires_in: data.expires_in, error: data.error };
    } catch {
      return { error: 'network_error' };
    } finally {
      if (activeRefresh?.version === version) activeRefresh = null;
    }
  })();
  activeRefresh = { version, promise };
  return promise;
}

function launchSpotifyInBackground(callback) {
  const { exec, execFile, spawn } = require('child_process');
  if (process.platform === 'darwin') {
    execFile('/usr/bin/open', ['-j', '-g', '-b', 'com.spotify.client'], (error) => callback(!error));
  } else if (process.platform === 'win32') {
    exec('start "" /min "spotify:"', (error) => callback(!error));
  } else if (process.platform === 'linux') {
    const child = spawn('spotify', ['--minimized'], { detached: true, stdio: 'ignore' });
    child.once('error', () => callback(false));
    child.once('spawn', () => {
      child.unref();
      callback(true);
    });
  } else {
    callback(false);
  }
}

async function openSpotify() {
  try {
    if (isMac) {
      const { execFile } = require('child_process');
      await new Promise((resolve, reject) => {
        execFile('/usr/bin/open', ['-b', 'com.spotify.client'], (error) => error ? reject(error) : resolve());
      });
    } else {
      await shell.openExternal('spotify:');
    }
    return 'desktop';
  } catch {
    try {
      await shell.openExternal('https://open.spotify.com/');
      return 'web';
    } catch {
      return 'unavailable';
    }
  }
}

function redirectSpotifyResult(res, outcome, login) {
  const params = new URLSearchParams({ status: outcome });
  if (login?.theme) params.set('theme', login.theme);
  if (login?.motion === 'off') params.set('motion', 'off');
  res.writeHead(303, { Location: `/callback/result?${params}` }).end();
}

function finishSpotifyAuth(res, outcome, login, payload = {}) {
  mainWindow?.webContents.send('auth:token-updated', {
    ...payload,
    error: outcome === 'connected' ? undefined : authResults[outcome].detail,
    forbidden: outcome === 'forbidden',
  });
  showPlayer();
  redirectSpotifyResult(res, outcome, login);
}

function startPersistentAuthServer() {
  return new Promise((resolve) => {
    persistentAuthServer = http.createServer(async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      if (req.method !== 'GET' || req.headers.host !== '127.0.0.1:8888' || !req.url) {
        res.writeHead(404).end('Not found');
        return;
      }

      const url = new URL(req.url, SPOTIFY_CALLBACK_ORIGIN);
      const params = url.searchParams;
      if (url.pathname === '/callback/result') {
        const outcome = params.get('status');
        if (Object.hasOwn(authResults, outcome)) {
          sendSpotifyResult(res, outcome, params.get('theme'), params.get('motion'));
        } else {
          res.writeHead(404).end('Not found');
        }
        return;
      }
      if (url.pathname === '/callback/logo.png') {
        try {
          const logo = await fs.promises.readFile(appIconPath);
          res.writeHead(200, { 'Content-Type': 'image/png', 'X-Content-Type-Options': 'nosniff' }).end(logo);
        } catch {
          res.writeHead(404).end('Not found');
        }
        return;
      }
      if (url.pathname !== '/callback' || !url.search) {
        res.writeHead(404).end('Not found');
        return;
      }
      const login = pendingLogin;
      if (!login || login.expiresAt <= Date.now() || params.get('state') !== login.state) {
        redirectSpotifyResult(res, 'expired', login);
        return;
      }

      pendingLogin = null;
      const code = params.get('code');
      if (!code || params.has('error')) {
        finishSpotifyAuth(res, 'cancelled', login);
        return;
      }

      try {
        const data = await requestToken({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_REDIRECT_URI,
          code_verifier: login.verifier,
        }, login.clientId);
        if (login.version !== sessionVersion) {
          redirectSpotifyResult(res, 'expired', login);
          return;
        }
        if (!data.access_token) {
          finishSpotifyAuth(res, 'unavailable', login);
          return;
        }

        const access = await fetch('https://api.spotify.com/v1/me/player/devices', {
          headers: { Authorization: `Bearer ${data.access_token}` },
          signal: AbortSignal.timeout(8000),
        });
        if (login.version !== sessionVersion) {
          redirectSpotifyResult(res, 'expired', login);
          return;
        }
        if (!access.ok) {
          finishSpotifyAuth(res, access.status === 403 ? 'forbidden' : 'unavailable', login);
          return;
        }

        const version = ++sessionVersion;
        savedSession = null;
        rememberSpotifyClientId(login.clientId);
        try { fs.rmSync(getSecureTokenPath(), { force: true }); } catch {
          console.warn('[Spotify] Could not replace the previous saved session.');
        }
        if (data.refresh_token) {
          // Keychain may wait for macOS approval. Keep the new session usable in memory meanwhile.
          void saveRefreshToken({ clientId: login.clientId, refreshToken: data.refresh_token }, version);
        }
        finishSpotifyAuth(res, 'connected', login, { access_token: data.access_token, expires_in: data.expires_in || 3600 });
      } catch {
        if (login.version === sessionVersion) finishSpotifyAuth(res, 'unavailable', login);
        else redirectSpotifyResult(res, 'expired', login);
      }
    });

    persistentAuthServer.once('error', (err) => {
      console.warn('[Spotify] Could not start the loopback callback:', err.code);
      resolve(false);
    });
    persistentAuthServer.listen(8888, '127.0.0.1', () => resolve(true));
  });
}

let authServerReady;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: 720,
    height: 410,
    minWidth: 160,
    minHeight: 28,
    x: Math.round(screenWidth - 740),
    y: 80,
    show: !tray,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true,
    minimizable: true,
    alwaysOnTop: isAlwaysOnTop,
    backgroundColor: '#00000000',
    title: 'Pixeltunes - Pixel Music Player',
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (process.platform === 'darwin' && isAlwaysOnTop) {
    mainWindow.setAlwaysOnTop(true, 'floating', 1);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  const distHtmlPath = path.join(__dirname, '../dist/index.html');
  const requestedDevUrl = URL.parse(process.env.VITE_DEV_SERVER_URL || '');
  const devServerUrl = requestedDevUrl?.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(requestedDevUrl.hostname)
    ? requestedDevUrl.origin : 'http://127.0.0.1:5173';
  const forceDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (URL.parse(validatedURL)?.origin === devServerUrl) {
      if (fs.existsSync(distHtmlPath)) {
        console.log('[Electron] Dev server not reachable, falling back to dist/index.html');
        mainWindow.loadFile(distHtmlPath);
      } else {
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
          <!DOCTYPE html>
          <html>
          <body style="background:#191244;color:#fec5db;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px;box-sizing:border-box;-webkit-app-region:drag;">
            <div style="background:#261b5c;border:3px solid #fec5db;border-radius:12px;padding:24px;max-width:440px;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
              <h2 style="margin:0 0 12px;font-size:18px;color:#fec5db;">📻 Dev Server Not Detected</h2>
              <p style="font-size:13px;color:#cbd5e1;line-height:1.6;margin:0 0 16px;">
                No Vite dev server is running at <code style="background:#191244;padding:2px 6px;border-radius:4px;color:#8fa2d4;">${devServerUrl}</code>.
              </p>
              <div style="background:#191244;border-radius:8px;padding:12px;text-align:left;font-family:monospace;font-size:12px;color:#8fa2d4;line-height:1.8;">
                <div><span style="color:#fec5db;"># For live development mode:</span></div>
                <div>npm run electron:dev</div>
                <div style="margin-top:8px;"><span style="color:#fec5db;"># Or to build and run production:</span></div>
                <div>npm run app</div>
              </div>
            </div>
          </body>
          </html>
        `)}`);
      }
    }
  });

  if (forceDev || !fs.existsSync(distHtmlPath)) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(distHtmlPath);
  }

  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.on('will-redirect', (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (URL.parse(url)?.protocol === 'https:') {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (tray && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('restore', () => {
    if (process.platform === 'darwin' && isAlwaysOnTop) {
      mainWindow.setAlwaysOnTop(true, 'floating', 1);
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showPlayer(fromTray = false) {
  if (!mainWindow) createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();

  const anchor = tray?.getBounds();
  if (fromTray && !mainWindow.isVisible() && anchor?.width > 0) {
    const { workArea } = screen.getDisplayMatching(anchor);
    const bounds = mainWindow.getBounds();
    const fit = Math.min(1, workArea.width / bounds.width, workArea.height / bounds.height);
    const width = Math.round(bounds.width * fit);
    const height = Math.round(bounds.height * fit);
    const x = Math.round(anchor.x + (anchor.width - width) / 2);
    const y = Math.max(workArea.y, anchor.y + anchor.height) + 6;
    mainWindow.setBounds({
      x: Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - width)),
      y: Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - height)),
      width,
      height,
    });
  }

  mainWindow.show();
  mainWindow.focus();
}

let currentPlaybackInfo = { title: '', artist: '', isPlaying: false };

function buildTrayMenu() {
  const isPlayerActive = mainWindow?.isVisible() && !mainWindow?.isMinimized();
  const trackLabel = currentPlaybackInfo.title
    ? `${currentPlaybackInfo.isPlaying ? '▶' : '❚❚'} ${currentPlaybackInfo.title}${currentPlaybackInfo.artist ? ` - ${currentPlaybackInfo.artist}` : ''}`
    : 'PixelTunes: Nothing Playing';

  return Menu.buildFromTemplate([
    { label: trackLabel, enabled: false },
    { type: 'separator' },
    {
      label: currentPlaybackInfo.isPlaying ? '❚❚ Pause' : '▶ Play',
      click: () => mainWindow?.webContents.send('playback:action', 'toggle'),
    },
    {
      label: '▶▶ Next Track',
      click: () => mainWindow?.webContents.send('playback:action', 'next'),
    },
    {
      label: '◀◀ Previous Track',
      click: () => mainWindow?.webContents.send('playback:action', 'previous'),
    },
    { type: 'separator' },
    isPlayerActive
      ? { label: 'Hide Player', click: () => mainWindow?.hide() }
      : { label: 'Show Player', click: () => showPlayer(true) },
    {
      label: 'Layout Mode',
      submenu: [
        {
          label: 'Classic Player',
          type: 'radio',
          checked: playerLayoutMode === 'classic',
          click: () => {
            playerLayoutMode = 'classic';
            mainWindow?.webContents.send('window:layout-changed', 'classic');
            showPlayer(true);
          },
        },
        {
          label: 'Music Card',
          type: 'radio',
          checked: playerLayoutMode === 'card',
          click: () => {
            playerLayoutMode = 'card';
            mainWindow?.webContents.send('window:layout-changed', 'card');
            showPlayer(true);
          },
        },
        {
          label: 'iPod Mini',
          type: 'radio',
          checked: playerLayoutMode === 'ipod',
          click: () => {
            playerLayoutMode = 'ipod';
            mainWindow?.webContents.send('window:layout-changed', 'ipod');
            showPlayer(true);
          },
        },
      ],
    },
    {
      label: 'Window Size',
      submenu: Object.entries(playerSizes).map(([id, { label, width, height }]) => ({
        label: `${label} (${width} × ${height})`,
        type: 'radio',
        checked: playerScale === id,
        click: () => {
          playerScale = id;
          applyPlayerScale(id);
          mainWindow?.webContents.send('window:scale-changed', id);
          showPlayer(true);
        },
      })),
    },
    {
      label: 'Keep Player on Top',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: () => setAlwaysOnTop(!isAlwaysOnTop),
    },
    { label: 'Open Spotify', click: () => { void openSpotify(); } },
    { type: 'separator' },
    {
      label: 'Quit PixelTunes',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function updateTrayDisplay() {
  if (!tray) return;
  if (!currentPlaybackInfo.title) {
    tray.setTitle(' ♪ PixelTunes');
    tray.setToolTip('PixelTunes');
  } else {
    const icon = currentPlaybackInfo.isPlaying ? '▶' : '❚❚';
    const text = currentPlaybackInfo.artist
      ? `${currentPlaybackInfo.title} · ${currentPlaybackInfo.artist}`
      : currentPlaybackInfo.title;
    const shortText = text.length > 25 ? text.slice(0, 24) + '…' : text;
    tray.setTitle(` ${icon} ${shortText}`);
    tray.setToolTip(`PixelTunes: ${text}`);
  }
}

function createMenuBar() {
  const iconPath = path.join(__dirname, 'assets', 'PixelTunesTemplate.png');
  let icon = null;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      icon.setTemplateImage(true);
    }
  } catch (err) {
    console.warn('[PixelTunes] Could not load tray icon:', err.message);
  }

  tray = icon && !icon.isEmpty() ? new Tray(icon) : new Tray(iconPath);
  tray.setTitle(' ♪ PixelTunes');
  tray.setToolTip('PixelTunes');
  tray.setIgnoreDoubleClickEvents(true);

  tray.on('click', () => {
    if (mainWindow?.isMinimized()) {
      mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      showPlayer(true);
    }
  });

  tray.on('right-click', () => {
    tray.popUpContextMenu(buildTrayMenu());
  });
}

// Accept IPC only from the main app document.
function fromApp(event) {
  return Boolean(mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents);
}

function handle(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!fromApp(event)) throw new Error('Invalid IPC sender');
    return handler(...args);
  });
}

ipcMain.on('window:minimize', (event) => {
  if (!fromApp(event) || !mainWindow) return;
  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(false);
    mainWindow.setAlwaysOnTop(false);
  }
  mainWindow.minimize();
});

ipcMain.on('window:close', (event) => {
  if (fromApp(event)) mainWindow.close();
});

function setAlwaysOnTop(enabled) {
  isAlwaysOnTop = enabled;
  if (!mainWindow) return isAlwaysOnTop;
  if (process.platform === 'darwin') {
    mainWindow.setAlwaysOnTop(isAlwaysOnTop, isAlwaysOnTop ? 'floating' : 'normal', 1);
    mainWindow.setVisibleOnAllWorkspaces(isAlwaysOnTop, { visibleOnFullScreen: true });
  } else {
    mainWindow.setAlwaysOnTop(isAlwaysOnTop);
  }
  return isAlwaysOnTop;
}

handle('window:toggle-always-on-top', () => setAlwaysOnTop(!isAlwaysOnTop));
handle('window:get-always-on-top', () => isAlwaysOnTop);

function resizePlayer(width, height, options = {}) {
  if (!mainWindow) return;
  const currentBounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(currentBounds);
  const { workArea, bounds: screenBounds } = display;
  const isMenuBar = Boolean(options.dockToMenuBar || options.isMenuBar || playerLayoutMode === 'capsule');

  const fit = Math.min(1, screenBounds.width / width, screenBounds.height / height);
  const w = Math.round(width * fit);
  const h = Math.round(height * fit);

  let newX = currentBounds.x;
  let newY = currentBounds.y;

  if (options.dockToMenuBar) {
    const anchor = tray?.getBounds();
    if (anchor && anchor.width > 0 && anchor.x > 0) {
      newX = Math.round(anchor.x + anchor.width / 2 - w / 2);
    } else {
      newX = Math.round(screenBounds.x + (screenBounds.width - w) / 2);
    }
    // Dock right in the menu bar at the top of the MacBook screen
    newY = screenBounds.y + 2;
  } else if (isMenuBar) {
    newX = Math.max(screenBounds.x, Math.min(newX, screenBounds.x + screenBounds.width - w));
    newY = Math.max(screenBounds.y, Math.min(newY, screenBounds.y + screenBounds.height - h));
  } else {
    newX = Math.max(workArea.x, Math.min(newX, workArea.x + workArea.width - w));
    newY = Math.max(workArea.y, Math.min(newY, workArea.y + workArea.height - h));
  }

  mainWindow.setBounds({
    x: newX,
    y: newY,
    width: w,
    height: h,
  });

  if (process.platform === 'darwin' && isMenuBar) {
    mainWindow.setAlwaysOnTop(true, 'status', 1);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
}

function applyPlayerScale(scale) {
  if (!Object.hasOwn(playerSizes, scale)) return;
  if (!mainWindow) createWindow();
  const { width, height } = playerSizes[scale];
  playerScale = scale;
  resizePlayer(width, height);
}

ipcMain.on('window:set-scale', (event, scale) => {
  if (fromApp(event) && typeof scale === 'string') applyPlayerScale(scale);
});

ipcMain.on('window:set-size', (event, dimensions) => {
  if (!fromApp(event)) return;
  const { width, height, dockToMenuBar, isMenuBar } = dimensions || {};
  if (!Number.isFinite(width) || !Number.isFinite(height)) return;
  playerScale = null;
  resizePlayer(Math.max(160, width), Math.max(28, height), { dockToMenuBar, isMenuBar });
});

ipcMain.on('window:set-layout-mode', (event, mode) => {
  if (!fromApp(event) || typeof mode !== 'string') return;
  playerLayoutMode = mode;
});

ipcMain.on('tray:set-playback-info', (event, info) => {
  if (!fromApp(event)) return;
  if (info) {
    currentPlaybackInfo = {
      title: (info.title || '').trim(),
      artist: (info.artist || '').trim(),
      isPlaying: Boolean(info.isPlaying),
    };
    updateTrayDisplay();
  }
});

handle('window:dock-to-menubar', () => {
  if (!mainWindow) return false;
  const bounds = mainWindow.getBounds();
  resizePlayer(bounds.width, bounds.height, { dockToMenuBar: true, isMenuBar: true });
  return true;
});

handle('auth:has-session', async () => Boolean(await loadRefreshToken()));

handle('auth:login', async (clientId, presentation) => {
  if (!await authServerReady) return { success: false, error: 'Spotify callback port 8888 is unavailable.' };

  if (clientId !== undefined && (typeof clientId !== 'string' || !/^[a-f0-9]{32}$/i.test(clientId))) {
    return { success: false, error: 'Enter the 32-character Client ID from your Spotify Developer Dashboard.' };
  }
  const selectedClientId = clientId || lastClientId;
  const state = crypto.randomBytes(32).toString('base64url');
  const verifier = crypto.randomBytes(64).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const theme = typeof presentation?.theme === 'string' && /^[a-z]{1,16}$/.test(presentation.theme) ? presentation.theme : null;
  const login = {
    state, verifier, clientId: selectedClientId, version: ++sessionVersion, expiresAt: Date.now() + 5 * 60_000,
    theme, motion: presentation?.motion === 'off' ? 'off' : 'system',
  };
  pendingLogin = login;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: selectedClientId,
    scope: SPOTIFY_SCOPES.join(' '),
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  try {
    await shell.openExternal(`https://accounts.spotify.com/authorize?${params}`);
    return { success: true };
  } catch {
    if (pendingLogin === login) pendingLogin = null;
    return { success: false, error: 'Could not open the browser for Spotify authorization.' };
  }
});

handle('auth:refresh', performPkceTokenRefresh);
handle('auth:logout', () => {
  clearSession();
  return true;
});
handle('spotify:open', openSpotify);
handle('spotify:launch-background', () => new Promise(launchSpotifyInBackground));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (app.isReady()) {
      showPlayer(false);
      if (mainWindow) mainWindow.reload();
    }
  });
  app.on('before-quit', () => { isQuitting = true; });
  app.on('will-quit', () => {
    tray?.destroy();
    persistentAuthServer?.close();
  });
  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });

  app.whenReady().then(() => {
    try {
      const configured = fs.readFileSync(getSpotifyClientIdPath(), 'utf8').trim();
      if (/^[a-f0-9]{32}$/i.test(configured)) lastClientId = configured;
    } catch {}
    if (isMac) {
      if (app.dock) {
        try {
          if (fs.existsSync(appIconPath)) {
            app.dock.setIcon(appIconPath);
          }
          app.dock.show();
        } catch (e) {
          console.warn('[PixelTunes] Could not set dock icon:', e.message);
        }
      }
      createMenuBar();
      app.setActivationPolicy('regular');
    }
    authServerReady = startPersistentAuthServer();
    createWindow();
    showPlayer(false);
    app.on('activate', () => showPlayer(false));
  });
}
