/**
 * Spotify Background Auto-Launch & Permission Manager
 * 
 * Automatically launches Spotify Desktop App in the background (minimized)
 * when Spotify is connected or when songs are played, preventing playback
 * glitches when the desktop app was previously closed.
 */

const STORAGE_KEY_PERMISSION = 'pixeltunes_auto_launch_spotify';
const STORAGE_KEY_PROMPTED = 'pixeltunes_has_prompted_auto_launch';

export type AutoLaunchPermission = 'allowed' | 'denied';

/**
 * Check whether the user has already been prompted for permission.
 * Guaranteed to only prompt ONCE on the very first time opening PixelTunes!
 */
export function hasPromptedAutoLaunch(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY_PROMPTED) === 'true';
  } catch (e) {
    return true;
  }
}

/**
 * Mark that the user has been prompted so they are never asked again on subsequent opens.
 */
export function markAutoLaunchPrompted(): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROMPTED, 'true');
  } catch (e) {}
}

/**
 * Get current permission choice:
 * - 'allowed': User enabled background auto-launch
 * - 'denied': User disabled background auto-launch (default)
 */
export function getAutoLaunchPermission(): AutoLaunchPermission {
  if (typeof window === 'undefined') return 'denied';
  try {
    const val = localStorage.getItem(STORAGE_KEY_PERMISSION);
    if (val === 'allowed') return 'allowed';
  } catch (e) {}
  return 'denied';
}

/**
 * Set user permission choice and mark prompted
 */
export function setAutoLaunchPermission(permission: AutoLaunchPermission): void {
  try {
    localStorage.setItem(STORAGE_KEY_PERMISSION, permission);
    localStorage.setItem(STORAGE_KEY_PROMPTED, 'true');
  } catch (e) {}
}

/**
 * Check if auto-launch is currently enabled
 */
export function isAutoLaunchEnabled(): boolean {
  return getAutoLaunchPermission() === 'allowed';
}

/**
 * Trigger background launch of Spotify Desktop App (minimized/hidden).
 * Uses Electron IPC when running in Electron app, or local auth server HTTP API in web preview.
 */
export async function launchSpotifyInBackground(): Promise<boolean> {
  // 1. Electron API
  if (typeof window !== 'undefined' && window.electronAPI?.launchSpotifyInBackground) {
    try {
      const res = await window.electronAPI.launchSpotifyInBackground();
      if (res) return true;
    } catch (e) {
      console.warn('[AutoLaunch] Electron IPC error:', e);
    }
  }

  // 2. Local HTTP Server endpoint
  try {
    const res = await fetch('http://127.0.0.1:8888/api/spotify/launch-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.success);
    }
  } catch (e) {}

  return false;
}
