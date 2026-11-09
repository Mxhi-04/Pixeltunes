const { contextBridge, ipcRenderer } = require('electron');

try {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.classList.add('is-electron');
  }
} catch {
  // ignore
}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  isMenuBarApp: false,
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),
  setScale: (scale) => ipcRenderer.send('window:set-scale', scale),
  onScaleChanged: (callback) => {
    const handler = (_event, scale) => callback(scale);
    ipcRenderer.on('window:scale-changed', handler);
    return () => ipcRenderer.removeListener('window:scale-changed', handler);
  },
  setSize: (width, height) => ipcRenderer.send('window:set-size', { width, height }),
  // Spotify PKCE Auth (Keychain Secured - No Client Secret)
  authLogin: (clientId, presentation) => ipcRenderer.invoke('auth:login', clientId, presentation),
  authRefresh: () => ipcRenderer.invoke('auth:refresh'),
  authLogout: () => ipcRenderer.invoke('auth:logout'),
  authHasSession: () => ipcRenderer.invoke('auth:has-session'),
  onAuthTokenUpdated: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('auth:token-updated', handler);
    return () => ipcRenderer.removeListener('auth:token-updated', handler);
  },
  openSpotify: () => ipcRenderer.invoke('spotify:open'),
  launchSpotifyInBackground: () => ipcRenderer.invoke('spotify:launch-background'),
});
