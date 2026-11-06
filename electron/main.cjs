const { app, BrowserWindow, ipcMain, shell, screen, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const crypto = require('crypto');

let mainWindow = null;
let isAlwaysOnTop = true;
let persistentAuthServer = null;

// Spotify PKCE Public Client (No Client Secret Required Anywhere!)
const SPOTIFY_CLIENT_ID = '0e51fa9c7bfb4df7b72cfa5d72d87df0';
const SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
];

// Secure Refresh Token Storage using macOS Keychain (via Electron safeStorage)
function getSecureTokenPath() {
  return path.join(app.getPath('userData'), 'spotify_refresh.token');
}

function saveRefreshTokenSecurely(refreshToken) {
  if (!refreshToken) return;
  try {
    const tokenPath = getSecureTokenPath();
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(refreshToken);
      fs.writeFileSync(tokenPath, encrypted);
    } else {
      fs.writeFileSync(tokenPath, Buffer.from(refreshToken, 'utf8'), { mode: 0o600 });
    }
  } catch (err) {
    // Never print token or sensitive data
    console.error('[Auth Storage] Failed to securely persist refresh token');
  }
}

function loadRefreshTokenSecurely() {
  try {
    const tokenPath = getSecureTokenPath();
    if (!fs.existsSync(tokenPath)) return null;
    const buffer = fs.readFileSync(tokenPath);
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(buffer);
    }
    return buffer.toString('utf8');
  } catch (err) {
    return null;
  }
}

function clearRefreshTokenSecurely() {
  try {
    const tokenPath = getSecureTokenPath();
    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
    }
  } catch (err) {}
}

let activePkceVerifier = '';

// PKCE Authorization Code & Refresh Logic (Pure Public Client)
async function performPkceTokenRefresh() {
  const refreshToken = loadRefreshTokenSecurely();
  if (!refreshToken) {
    return { error: 'no_refresh_token' };
  }

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 400 && data.error === 'invalid_grant') {
        console.warn('[Spotify Auth] Refresh token was revoked (invalid_grant). Clearing stored session.');
        clearRefreshTokenSecurely();
        return { error: 'invalid_grant' };
      }
      return { error: data.error || `HTTP ${res.status}` };
    }

    // If Spotify rotated the refresh token, securely store the new one in Keychain
    if (data.refresh_token) {
      saveRefreshTokenSecurely(data.refresh_token);
    }

    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
    };
  } catch (netErr) {
    return { error: 'network_error' };
  }
}

function startPersistentAuthServer() {
  if (persistentAuthServer) {
    try { persistentAuthServer.close(); } catch (e) {}
  }

  persistentAuthServer = http.createServer(async (req, res) => {
    // CORS headers for local page access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      const parsedUrl = new URL(req.url, 'http://127.0.0.1:8888');

      // 1. /login: Start PKCE OAuth in default browser
      if (parsedUrl.pathname === '/login') {
        activePkceVerifier = crypto.randomBytes(64).toString('base64url');
        const challenge = crypto.createHash('sha256').update(activePkceVerifier).digest('base64url');

        const params = new URLSearchParams({
          response_type: 'code',
          client_id: SPOTIFY_CLIENT_ID,
          scope: SPOTIFY_SCOPES.join(' '),
          redirect_uri: SPOTIFY_REDIRECT_URI,
          code_challenge_method: 'S256',
          code_challenge: challenge,
        });

        const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
        res.writeHead(302, { Location: authUrl });
        res.end();
        return;
      }

      // 2. /callback: Receive authorization code from Spotify and exchange using PKCE
      if (parsedUrl.pathname === '/callback') {
        const code = parsedUrl.searchParams.get('code');
        const error = parsedUrl.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>Spotify Authorization Cancelled</title></head>
            <body style="background:#120e29;color:#ff7b90;font-family:monospace;text-align:center;padding:50px;">
              <h2>Login Cancelled or Declined</h2>
              <p>${error}</p>
              <p><a href="/login" style="color:#9df0cf;">Click here to try again</a></p>
            </body>
            </html>
          `);
          return;
        }

        if (code) {
          try {
            // Exchange code via PKCE (No Client Secret!)
            const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: SPOTIFY_CLIENT_ID,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
                code_verifier: activePkceVerifier,
              }),
            });

            if (!tokenRes.ok) {
              const errData = await tokenRes.json().catch(() => ({}));
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>Authentication Error</title></head>
                <body style="background:#120e29;color:#ff7b90;font-family:monospace;text-align:center;padding:50px;">
                  <h2>Authentication Error</h2>
                  <p>${errData.error_description || 'Invalid authorization code or verifier'}</p>
                  <p><a href="/login" style="color:#9df0cf;">Click here to retry</a></p>
                </body>
                </html>
              `);
              return;
            }

            const tokenData = await tokenRes.json();
            const accessToken = tokenData.access_token;
            const refreshToken = tokenData.refresh_token || '';
            const expiresIn = tokenData.expires_in || 3600;

            // Persist refresh token securely in macOS Keychain (never in localStorage/logs)
            if (refreshToken) {
              saveRefreshTokenSecurely(refreshToken);
            }

            // Fetch user profile name
            let userName = 'SPOTIFY USER';
            try {
              const userRes = await fetch('https://api.spotify.com/v1/me', {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (userRes.ok) {
                const uProfile = await userRes.json();
                userName = (uProfile.display_name || uProfile.id || 'SPOTIFY USER').toUpperCase();
              }
            } catch (e) {}

            // Send in-memory credentials to Electron renderer (NO page reload, NO UI disruption!)
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('auth:token-updated', {
                access_token: accessToken,
                expires_in: expiresIn,
                user_name: userName,
              });
            }

            // Success Page in browser
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <title>Pixel Player - Connected!</title>
                <style>
                  body { background-color: #120e29; color: #fec5db; font-family: monospace, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                  .card { background: #191244; border: 4px solid #fec5db; padding: 40px; box-shadow: 8px 8px 0px #fec5db; max-width: 480px; }
                  h1 { font-size: 22px; color: #9df0cf; margin-top: 0; }
                  p { color: #ffe6f0; font-size: 14px; line-height: 1.6; }
                  .badge { display: inline-block; background: #9df0cf; color: #191244; font-weight: bold; padding: 8px 16px; margin-top: 20px; font-size: 13px; letter-spacing: 1px; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>★ SPOTIFY CONNECTED! ★</h1>
                  <p>Connected as <strong>${userName}</strong>.</p>
                  <p>Your <strong>Pixeltunes Player</strong> is synced and will auto-refresh seamlessly.</p>
                  <div class="badge">READY • YOU CAN CLOSE THIS TAB</div>
                </div>
              </body>
              </html>
            `);
            return;
          } catch (exchangeErr) {
            console.error('[Auth Server] Token exchange error');
          }
        }
      }

      // 3. /api/auth/refresh: API endpoint for silent background refresh
      if (parsedUrl.pathname === '/api/auth/refresh') {
        const result = await performPkceTokenRefresh();
        res.writeHead(result.error ? 400 : 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      // 4. /api/capture: capture screenshot of main window
      if (parsedUrl.pathname === '/api/capture') {
        if (mainWindow) {
          const img = await mainWindow.webContents.capturePage();
          const buf = img.toPNG();
          res.writeHead(200, { 'Content-Type': 'image/png' });
          res.end(buf);
          return;
        }
        res.writeHead(404);
        res.end();
        return;
      }

      // 5. /api/click-playlist: toggle playlist/queue view
      if (parsedUrl.pathname === '/api/click-playlist') {
        if (mainWindow) {
          try {
            const clicked = await mainWindow.webContents.executeJavaScript(`
              (() => {
                const btn = document.querySelector('[data-testid="toggle-cover-btn"]') ||
                            document.querySelector('[data-testid="toggle-playlist-btn"]') ||
                            Array.from(document.querySelectorAll('button')).find(b => 
                              b.textContent.includes('VIEW PLAYLIST') || 
                              b.textContent.includes('COVER')
                            );
                if (btn) {
                  btn.click();
                  return true;
                }
                return false;
              })()
            `);
            res.writeHead(200);
            res.end(clicked ? 'toggled' : 'not_found');
            return;
          } catch (err) {
            console.error('click-playlist error:', err);
            res.writeHead(500);
            res.end('error');
            return;
          }
        }
      }

      // 6. /api/close-modal: close any open modal
      if (parsedUrl.pathname === '/api/close-modal') {
        if (mainWindow) {
          await mainWindow.webContents.executeJavaScript(`
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'CLOSE' || b.textContent.trim() === '✕');
            if (btn) btn.click();
          `);
          res.writeHead(200);
          res.end('closed');
          return;
        }
      }

      // 9. /api/click-play: click the main play/pause button
      if (parsedUrl.pathname === '/api/click-play') {
        if (mainWindow) {
          const resVal = await mainWindow.webContents.executeJavaScript(`
            (() => {
              const playBtn = document.querySelector('button[title="Play"]') ||
                              document.querySelector('button[title="Pause"]');
              if (playBtn) {
                playBtn.click();
                return 'clicked';
              }
              return 'not_found';
            })()
          `);
          res.writeHead(200);
          res.end(resVal);
          return;
        }
      }

      // 7. /api/test-spark: trigger click and capture spark
      if (parsedUrl.pathname === '/api/test-spark') {
        if (mainWindow) {
          await mainWindow.webContents.executeJavaScript(`
            window.dispatchEvent(new PointerEvent('pointerdown', { clientX: 360, clientY: 200, bubbles: true }));
          `);
          await new Promise(r => setTimeout(r, 60));
          const img = await mainWindow.webContents.capturePage();
          res.writeHead(200, { 'Content-Type': 'image/png' });
          res.end(img.toPNG());
          return;
        }
      }

      // 4. /api/auth/session: Check if refresh token exists in Keychain
      if (parsedUrl.pathname === '/api/auth/session') {
        const hasSession = Boolean(loadRefreshTokenSecurely());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ hasSession }));
        return;
      }

      // 5. /api/auth/logout: Wipe Keychain session
      if (parsedUrl.pathname === '/api/auth/logout') {
        clearRefreshTokenSecurely();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // 8. /api/spotify/wake: Launch or wake Spotify app on macOS in background
      if (parsedUrl.pathname === '/api/spotify/wake') {
        const { exec } = require('child_process');
        if (process.platform === 'darwin') {
          exec('open -g -a Spotify', (err) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: !err }));
          });
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // 10. /api/spotify/open-uri: open a Spotify track URI directly
      if (parsedUrl.pathname === '/api/spotify/open-uri') {
        const uri = parsedUrl.query?.uri;
        if (uri) {
          const { exec } = require('child_process');
          if (process.platform === 'darwin') {
            exec(`open "${uri}"`);
          } else {
            shell.openExternal(uri);
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    } catch (err) {
      res.writeHead(500);
      res.end('Internal server error');
    }
  });

  persistentAuthServer.listen(8888, '0.0.0.0', () => {
    console.log('Persistent Spotify Auth server listening on http://127.0.0.1:8888');
  });

  persistentAuthServer.on('error', (err) => {
    console.warn('Persistent auth server error:', err.message);
  });
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: 720,
    height: 410,
    minWidth: 420,
    minHeight: 240,
    x: Math.round(screenWidth - 740),
    y: 80,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    title: 'Pixeltunes - Pixel Music Player',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  mainWindow.setAspectRatio(720 / 410);

  if (process.platform === 'darwin') {
    mainWindow.setAlwaysOnTop(true, 'floating', 1);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  const fs = require('fs');
  const distHtmlPath = path.join(__dirname, '../dist/index.html');
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const forceDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

  if (forceDev || !fs.existsSync(distHtmlPath)) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(distHtmlPath);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:toggle-always-on-top', () => {
  if (!mainWindow) return isAlwaysOnTop;
  isAlwaysOnTop = !isAlwaysOnTop;
  if (process.platform === 'darwin') {
    mainWindow.setAlwaysOnTop(isAlwaysOnTop, isAlwaysOnTop ? 'floating' : 'normal', 1);
    mainWindow.setVisibleOnAllWorkspaces(isAlwaysOnTop, { visibleOnFullScreen: true });
  } else {
    mainWindow.setAlwaysOnTop(isAlwaysOnTop);
  }
  return isAlwaysOnTop;
});

ipcMain.handle('window:get-always-on-top', () => isAlwaysOnTop);

ipcMain.on('window:set-size', (event, { width, height }) => {
  if (!mainWindow) return;
  const currentBounds = mainWindow.getBounds();
  mainWindow.setBounds({
    x: currentBounds.x,
    y: currentBounds.y,
    width: Math.max(400, Math.round(width)),
    height: Math.max(280, Math.round(height)),
  });
});

ipcMain.handle('window:get-size', () => {
  if (!mainWindow) return { width: 720, height: 410 };
  const bounds = mainWindow.getBounds();
  return { width: bounds.width, height: bounds.height };
});

// PKCE Auth IPC Handlers (Secure Keychain Storage - No Client Secret)
ipcMain.handle('auth:has-session', () => {
  return Boolean(loadRefreshTokenSecurely());
});

ipcMain.handle('auth:login', () => {
  shell.openExternal('http://127.0.0.1:8888/login');
  return { success: true };
});

ipcMain.handle('auth:refresh', async () => {
  return await performPkceTokenRefresh();
});

ipcMain.handle('auth:logout', () => {
  clearRefreshTokenSecurely();
  return true;
});

ipcMain.on('spotify:open-browser-login', () => {
  shell.openExternal('http://127.0.0.1:8888/login');
});

ipcMain.handle('spotify:refresh-token', async () => {
  const result = await performPkceTokenRefresh();
  return result.access_token ? result : null;
});

ipcMain.handle('spotify:wake', async () => {
  const { exec } = require('child_process');
  if (process.platform === 'darwin') {
    exec('open -g -a Spotify');
  }
  return true;
});

ipcMain.handle('spotify:open-uri', (event, uri) => {
  if (uri) {
    const { exec } = require('child_process');
    if (process.platform === 'darwin') {
      exec(`open "${uri}"`);
    } else {
      shell.openExternal(uri);
    }
  }
  return true;
});

// Legacy in-app popup or start-auth handler
ipcMain.handle('spotify:start-auth', async (event, { authUrl, usePopup = true }) => {
  if (!usePopup) {
    shell.openExternal('http://127.0.0.1:8888/login');
    return { code: undefined };
  }

  return new Promise((resolve) => {
    let popup = new BrowserWindow({
      width: 540,
      height: 740,
      minWidth: 420,
      minHeight: 500,
      title: 'Spotify Login - Pixel Music Player',
      frame: true,
      resizable: true,
      alwaysOnTop: true,
      parent: mainWindow,
      backgroundColor: '#120e29',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    popup.webContents.setUserAgent(userAgent);

    const checkCallback = (navUrl) => {
      try {
        const parsed = new URL(navUrl);
        const isCallback = (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') &&
                           (parsed.port === '8888' || parsed.pathname.includes('/callback'));

        if (isCallback && parsed.searchParams.has('code')) {
          const code = parsed.searchParams.get('code');
          if (popup) { popup.destroy(); popup = null; }
          resolve({ code });
          return true;
        }
      } catch (e) {}
      return false;
    };

    popup.webContents.on('will-redirect', (e, url) => { if (checkCallback(url)) e.preventDefault(); });
    popup.webContents.on('will-navigate', (e, url) => { if (checkCallback(url)) e.preventDefault(); });
    popup.webContents.on('did-navigate', (e, url) => { checkCallback(url); });
    popup.on('closed', () => { popup = null; resolve({ error: 'Login window closed' }); });
    popup.loadURL(authUrl);
  });
});

ipcMain.handle('spotify:cancel-auth', () => true);

// Temporary Pixel Cover Image Cache (Generated per song and deleted when song changes)
const coverTempDir = path.join(os.tmpdir(), 'pixel-music-player-covers');

function ensureCoverTempDir() {
  if (!fs.existsSync(coverTempDir)) {
    fs.mkdirSync(coverTempDir, { recursive: true });
  }
}

function cleanAllTempCovers() {
  try {
    if (fs.existsSync(coverTempDir)) {
      const files = fs.readdirSync(coverTempDir);
      for (const file of files) {
        try { fs.unlinkSync(path.join(coverTempDir, file)); } catch (err) {}
      }
      console.log('Cleaned temporary pixel music covers directory');
    }
  } catch (e) {
    console.warn('Temp covers cleanup error:', e);
  }
}

ipcMain.handle('cover:save-temp', async (event, { base64Data, trackKey }) => {
  try {
    ensureCoverTempDir();
    const cleanKey = (trackKey || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const filePath = path.join(coverTempDir, `cover_${cleanKey}_${Date.now()}.png`);
    const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    fs.writeFileSync(filePath, buffer);
    return filePath;
  } catch (e) {
    console.error('Save temp cover error:', e);
    return null;
  }
});

ipcMain.handle('cover:delete-temp', async (event, filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Deleted previous pixel cover to free up space:', filePath);
      return true;
    }
  } catch (e) {
    console.warn('Delete temp cover error:', e);
  }
  return false;
});

app.whenReady().then(() => {
  cleanAllTempCovers();
  startPersistentAuthServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  cleanAllTempCovers();
});

app.on('window-all-closed', () => {
  cleanAllTempCovers();
  if (process.platform !== 'darwin') app.quit();
});
