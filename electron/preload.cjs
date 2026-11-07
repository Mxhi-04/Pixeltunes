const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),
  setMiniMode: (isMini) => ipcRenderer.send('window:set-mini-mode', isMini),
  setSize: (width, height) => ipcRenderer.send('window:set-size', { width, height }),
  getSize: () => ipcRenderer.invoke('window:get-size'),
  // Spotify PKCE Auth (Keychain Secured - No Client Secret)
  authLogin: () => ipcRenderer.invoke('auth:login'),
  authRefresh: () => ipcRenderer.invoke('auth:refresh'),
  authLogout: () => ipcRenderer.invoke('auth:logout'),
  authHasSession: () => ipcRenderer.invoke('auth:has-session'),
  onAuthTokenUpdated: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('auth:token-updated', handler);
    return () => ipcRenderer.removeListener('auth:token-updated', handler);
  },
  // Legacy helpers
  startSpotifyAuth: (authUrl, usePopup) => ipcRenderer.invoke('spotify:start-auth', { authUrl, usePopup }),
  cancelSpotifyAuth: () => ipcRenderer.invoke('spotify:cancel-auth'),
  openBrowserLogin: (clientId) => ipcRenderer.send('spotify:open-browser-login', clientId),
  refreshSpotifyToken: (refreshToken) => ipcRenderer.invoke('spotify:refresh-token', refreshToken),
  wakeSpotify: () => ipcRenderer.invoke('spotify:wake'),
  launchSpotifyInBackground: () => ipcRenderer.invoke('spotify:launch-background'),
  openSpotifyUri: (uri) => ipcRenderer.invoke('spotify:open-uri', uri),
  saveTempCover: (base64Data, trackKey) => ipcRenderer.invoke('cover:save-temp', { base64Data, trackKey }),
  deleteTempCover: (filePath) => ipcRenderer.invoke('cover:delete-temp', filePath),
});

