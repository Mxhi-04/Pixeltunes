import 'react';

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag' | string;
  }
}

export interface ElectronAPI {
  isElectron: boolean;
  minimize: () => void;
  close: () => void;
  toggleAlwaysOnTop: () => Promise<boolean>;
  getAlwaysOnTop: () => Promise<boolean>;
  setMiniMode: (isMini: boolean) => void;
  setSize: (width: number, height: number) => void;
  getSize: () => Promise<{ width: number; height: number }>;
  authLogin?: () => Promise<{ success: boolean; error?: string }>;
  authRefresh?: () => Promise<{ access_token?: string; expires_in?: number; error?: string }>;
  authLogout?: () => Promise<boolean>;
  authHasSession?: () => Promise<boolean>;
  onAuthTokenUpdated?: (callback: (data: { access_token: string; expires_in: number; user_name?: string }) => void) => () => void;
  startSpotifyAuth: (authUrl: string, usePopup?: boolean) => Promise<{ code?: string; error?: string }>;
  cancelSpotifyAuth: () => Promise<boolean>;
  openBrowserLogin?: (clientId: string) => void;
  refreshSpotifyToken?: (refreshToken: string) => Promise<{ access_token: string; refresh_token?: string; expires_in?: number } | null>;
  saveTempCover?: (base64Data: string, trackKey: string) => Promise<string | null>;
  deleteTempCover?: (filePath: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

