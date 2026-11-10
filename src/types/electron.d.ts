import 'react';
import type { PlayerScale, PlayerLayoutMode } from './scale';

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag' | string;
  }
}

export interface ElectronAPI {
  isElectron: boolean;
  isMenuBarApp: boolean;
  minimize: () => void;
  close: () => void;
  toggleAlwaysOnTop: () => Promise<boolean>;
  getAlwaysOnTop: () => Promise<boolean>;
  setScale: (scale: PlayerScale) => void;
  onScaleChanged: (callback: (scale: PlayerScale) => void) => () => void;
  setSize: (width: number, height: number, options?: { dockToMenuBar?: boolean; isMenuBar?: boolean }) => void;
  dockToMenuBar?: () => Promise<boolean>;
  setLayoutMode?: (mode: PlayerLayoutMode) => void;
  onLayoutModeChanged?: (callback: (mode: PlayerLayoutMode) => void) => () => void;
  setPlaybackInfo?: (info: { title: string; artist?: string; isPlaying: boolean }) => void;
  onPlaybackAction?: (callback: (action: 'toggle' | 'next' | 'previous') => void) => () => void;
  authLogin?: (clientId?: string, presentation?: { theme: string | null; motion: string | null }) =>
    Promise<{ success: boolean; error?: string }>;
  authRefresh?: () => Promise<{ access_token?: string; expires_in?: number; error?: string }>;
  authLogout?: () => Promise<boolean>;
  authHasSession?: () => Promise<boolean>;
  onAuthTokenUpdated?: (callback: (data: { access_token?: string; expires_in?: number; error?: string; forbidden?: boolean }) => void) => () => void;
  openSpotify?: () => Promise<'desktop' | 'web' | 'unavailable'>;
  launchSpotifyInBackground?: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
