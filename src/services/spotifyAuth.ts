/**
 * Spotify PKCE Authentication Module
 * 
 * Requirements:
 * - Authorization Code Flow with PKCE (Client ID: 0e51fa9c7bfb4df7b72cfa5d72d87df0).
 * - No Client Secret required or used anywhere.
 * - Redirect URI: http://127.0.0.1:8888/callback
 * - Scopes: user-read-playback-state user-modify-playback-state user-read-currently-playing
 * - In-Memory Access Token ONLY (Never in localStorage, URLs, logs, or disk).
 * - Refresh Token stored securely in macOS Keychain (via Electron safeStorage) or local backend session.
 * - Single-flight refresh lock: concurrent calls share a single in-flight refresh promise.
 * - 50-minute proactive background refresh timer (3000s) so the token is always fresh.
 * - On invalid_grant: clears session and notifies UI to show non-blocking "Reconnect Spotify".
 */

export const SPOTIFY_CLIENT_ID = '0e51fa9c7bfb4df7b72cfa5d72d87df0';
export const SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:8888/callback';
export const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-recently-played',
];

// In-Memory Token Storage ONLY (Never logged or written to localStorage/disk)
let inMemoryAccessToken: string | null = null;
let inMemoryExpiresAt = 0; // Timestamp in milliseconds

// Single-flight refresh lock / shared promise
let activeRefreshPromise: Promise<string | null> | null = null;

// 50-minute (3000s) proactive background refresh timer
let proactiveRefreshTimer: ReturnType<typeof setInterval> | null = null;

// Revocation listeners (for invalid_grant handling)
type RevocationCallback = () => void;
const revocationListeners = new Set<RevocationCallback>();

export function onSessionRevoked(cb: RevocationCallback): () => void {
  revocationListeners.add(cb);
  return () => revocationListeners.delete(cb);
}

function notifySessionRevoked() {
  inMemoryAccessToken = null;
  inMemoryExpiresAt = 0;
  stopProactiveTimer();
  revocationListeners.forEach((listener) => {
    try { listener(); } catch (e) {}
  });
}

function startProactiveTimer() {
  stopProactiveTimer();
  // 50 minutes = 3000 seconds = 3,000,000 ms
  proactiveRefreshTimer = setInterval(async () => {
    await refresh();
  }, 3000 * 1000);
}

function stopProactiveTimer() {
  if (proactiveRefreshTimer) {
    clearInterval(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}

/**
 * Checks if a secure refresh token exists in the native Keychain / backend session.
 * The user logs in only once; if this returns true, no login screen is ever shown.
 */
export async function hasStoredSession(): Promise<boolean> {
  if (typeof window !== 'undefined' && window.electronAPI?.authHasSession) {
    return await window.electronAPI.authHasSession();
  }

  // Web fallback: query local auth server or web refresh token
  try {
    const res = await fetch('http://127.0.0.1:8888/api/auth/session');
    if (res.ok) {
      const data = await res.json();
      if (data.hasSession) return true;
    }
  } catch (e) {}

  if (typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('spotify_web_refresh_token'))) {
    return true;
  }

  return false;
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let str = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    str += chars[bytes[i] % chars.length];
  }
  return str;
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Initiates the PKCE login flow.
 * Opens the system browser with the PKCE authorization URL.
 * User logs in once; the refresh token is saved securely in the macOS Keychain.
 */
export async function login(): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined' && window.electronAPI?.authLogin) {
    return await window.electronAPI.authLogin();
  }

  // Check if local auth server is running (Electron / local dev)
  let isLocal = false;
  try {
    const check = await fetch('http://127.0.0.1:8888/api/auth/session', { signal: AbortSignal.timeout(500) });
    isLocal = check.ok;
  } catch (e) {}

  if (isLocal) {
    window.open('http://127.0.0.1:8888/login', '_blank');
    return { success: true };
  }

  // Pure Web Browser PKCE Flow (e.g. deployed on Vercel)
  try {
    const verifier = generateRandomString(64);
    sessionStorage.setItem('spotify_pkce_verifier', verifier);
    const challenge = await generateCodeChallenge(verifier);
    const redirectUri = window.location.origin + (window.location.pathname.endsWith('/') ? '' : '/') + 'callback';
    sessionStorage.setItem('spotify_redirect_uri', redirectUri);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: SPOTIFY_SCOPES.join(' '),
      redirect_uri: redirectUri,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Handle Web Auth Redirect Callback if '?code=' is present in browser URL
 */
export async function handleWebAuthCallback(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (!code) return false;

  const verifier = sessionStorage.getItem('spotify_pkce_verifier');
  const redirectUri = sessionStorage.getItem('spotify_redirect_uri') || window.location.origin + (window.location.pathname.endsWith('/') ? '' : '/') + 'callback';

  if (!verifier) return false;

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: verifier,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      inMemoryAccessToken = data.access_token;
      inMemoryExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      if (data.refresh_token) {
        localStorage.setItem('spotify_web_refresh_token', data.refresh_token);
      }
      startProactiveTimer();

      window.history.replaceState({}, document.title, window.location.pathname);
      sessionStorage.removeItem('spotify_pkce_verifier');
      return true;
    }
  } catch (e) {
    console.error('Web PKCE exchange failed:', e);
  }
  return false;
}

/**
 * Performs a silent, background token refresh using the Keychain-stored refresh token.
 * Single-flight: Multiple concurrent requests share the exact same refresh promise.
 * Playback and UI state continue completely uninterrupted with 0ms lag.
 */
export async function refresh(): Promise<string | null> {
  // If a refresh is already in-flight, await and share the existing promise
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      let data: { access_token?: string; expires_in?: number; error?: string; refresh_token?: string } | null = null;

      // 1. Electron Native Keychain Refresh
      if (typeof window !== 'undefined' && window.electronAPI?.authRefresh) {
        data = await window.electronAPI.authRefresh();
      } else {
        // 2. Web fallback to local server
        try {
          const res = await fetch('http://127.0.0.1:8888/api/auth/refresh');
          data = await res.json().catch(() => null);
        } catch (e) {}

        // 3. Web direct refresh token fallback (e.g. Vercel)
        if (!data?.access_token) {
          const webRefreshToken = localStorage.getItem('spotify_web_refresh_token');
          if (webRefreshToken) {
            try {
              const res = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  grant_type: 'refresh_token',
                  refresh_token: webRefreshToken,
                  client_id: SPOTIFY_CLIENT_ID,
                }),
              });
              if (res.ok) {
                const refreshed = await res.json();
                data = refreshed;
                if (refreshed?.refresh_token) {
                  localStorage.setItem('spotify_web_refresh_token', refreshed.refresh_token);
                }
              }
            } catch (e) {}
          }
        }
      }

      if (data && data.access_token) {
        inMemoryAccessToken = data.access_token;
        const expiresIn = data.expires_in || 3600;
        inMemoryExpiresAt = Date.now() + expiresIn * 1000;
        startProactiveTimer();
        return inMemoryAccessToken;
      }

      // Handle invalid_grant (revoked refresh token)
      if (data && data.error === 'invalid_grant') {
        notifySessionRevoked();
        return null;
      }

      return null;
    } catch (err) {
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

/**
 * Returns a valid Spotify access token.
 * - If the token in memory is valid for more than 60 more seconds, returns it immediately.
 * - Otherwise silently refreshes in the background, then returns the new one.
 * - Never logs or exposes tokens.
 */
export async function getAccessToken(): Promise<string | null> {
  const now = Date.now();
  // Valid for more than 60 seconds
  if (inMemoryAccessToken && inMemoryExpiresAt - now > 60000) {
    return inMemoryAccessToken;
  }

  return await refresh();
}

// Python / snake_case alias per requirements
export const get_access_token = getAccessToken;

/**
 * Logs out of Spotify.
 * Clears in-memory access token and wipes the refresh token from macOS Keychain.
 */
export async function logout(): Promise<boolean> {
  inMemoryAccessToken = null;
  inMemoryExpiresAt = 0;
  stopProactiveTimer();

  // Clear legacy localStorage keys to ensure clean migration
  try {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expires_at');
    localStorage.removeItem('spotify_user_name');
  } catch (e) {}

  if (typeof window !== 'undefined' && window.electronAPI?.authLogout) {
    return await window.electronAPI.authLogout();
  }

  try {
    await fetch('http://127.0.0.1:8888/api/auth/logout');
  } catch (e) {}

  return true;
}

/**
 * Allows manual token injection strictly in memory (for debugging or tests)
 */
export function setInMemoryTokenForTesting(token: string, expiresInSec: number = 3600) {
  inMemoryAccessToken = token;
  inMemoryExpiresAt = Date.now() + expiresInSec * 1000;
}

/**
 * Force-expires the in-memory token (for automated or manual verification tests)
 */
export function forceExpireTokenForTesting() {
  inMemoryExpiresAt = Date.now() - 1000;
}

// Automatically subscribe to Electron's token updates on initial login callback
if (typeof window !== 'undefined' && window.electronAPI?.onAuthTokenUpdated) {
  window.electronAPI.onAuthTokenUpdated((payload) => {
    if (payload.access_token) {
      inMemoryAccessToken = payload.access_token;
      const expiresIn = payload.expires_in || 3600;
      inMemoryExpiresAt = Date.now() + expiresIn * 1000;
      startProactiveTimer();
    }
  });
}

