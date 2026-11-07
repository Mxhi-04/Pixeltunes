/**
 * Spotify Background Auto-Launch & Permission Manager
 * 
 * Automatically launches Spotify Desktop App in the background (minimized)
 * when Spotify is connected or when songs are played, preventing playback
 * glitches when the desktop app was previously closed.
 */

const STORAGE_KEY = 'pixeltunes_auto_launch_spotify';

export type AutoLaunchPermission = 'allowed' | 'denied' | 'prompt';

/**
 * Get current permission state:
 * - 'allowed': User granted permission to auto-launch Spotify in background
 * - 'denied': User explicitly disabled auto-launch
 * - 'prompt': First time! Needs user permission prompt
 */
export function getAutoLaunchPermission(): AutoLaunchPermission {
  if (typeof window === 'undefined') return 'denied';
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'allowed') return 'allowed';
    if (val === 'denied') return 'denied';
  } catch (e) {}
  return 'prompt';
}

/**
 * Set user permission choice
 */
export function setAutoLaunchPermission(permission: 'allowed' | 'denied'): void {
  try {
    localStorage.setItem(STORAGE_KEY, permission);
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

/**
 * Request UI to display the retro permission prompt modal
 */
export function requestAutoLaunchPrompt(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pixeltunes:request-autolaunch-prompt'));
  }
}

/**
 * Subscribe to permission prompt requests
 */
export function onAutoLaunchPromptRequested(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('pixeltunes:request-autolaunch-prompt', handler);
  return () => window.removeEventListener('pixeltunes:request-autolaunch-prompt', handler);
}
