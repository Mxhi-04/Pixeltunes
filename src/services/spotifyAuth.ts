// Spotify access tokens stay in memory. Desktop refresh tokens stay in the main process.
export const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '0e51fa9c7bfb4df7b72cfa5d72d87df0';
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

const REFRESH_KEY = 'spotify_web_refresh_token';
const LOGIN_KEY = 'pixeltunes_spotify_login';
const tokenEndpoint = 'https://accounts.spotify.com/api/token';
type TokenResult = { access_token?: string; expires_in?: number; error?: string; refresh_token?: string };

let accessToken: string | null = null;
let expiresAt = 0;
let sessionVersion = 0;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let activeRefresh: Promise<string | null> | null = null;
let activeCallback: Promise<boolean> | null = null;
const revocationListeners = new Set<() => void>();

export function onSessionRevoked(callback: () => void) {
  revocationListeners.add(callback);
  return () => { revocationListeners.delete(callback); };
}

function clearAccessToken() {
  sessionVersion++;
  activeRefresh = null;
  accessToken = null;
  expiresAt = 0;
  clearTimeout(refreshTimer);
}

function setAccessToken(token: string, expiresIn = 3600, proactive = true) {
  accessToken = token;
  expiresAt = Date.now() + expiresIn * 1000;
  clearTimeout(refreshTimer);
  if (proactive) {
    refreshTimer = setTimeout(() => { void refresh(); }, Math.max(1000, Math.min(3000, expiresIn - 60) * 1000));
  }
}

function webRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function getSpotifyRedirectUri() {
  return window.electronAPI?.isElectron
    ? SPOTIFY_REDIRECT_URI
    : new URL(`${import.meta.env.BASE_URL === './' ? '/' : import.meta.env.BASE_URL}callback`, window.location.origin).href;
}

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function login(clientId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (window.electronAPI?.authLogin) {
      return await window.electronAPI.authLogin(clientId, {
        theme: localStorage.getItem('pixeltunes_theme'),
        motion: localStorage.getItem('pixeltunes_motion'),
      });
    }
    const redirectUri = getSpotifyRedirectUri();
    if (location.protocol !== 'https:' && !['127.0.0.1', '[::1]'].includes(location.hostname)) {
      return { success: false, error: 'Open PixelTunes on HTTPS or http://127.0.0.1 to connect Spotify.' };
    }
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)));
    const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    sessionStorage.setItem(LOGIN_KEY, JSON.stringify({ verifier, state, redirectUri, expiresAt: Date.now() + 300000 }));
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: SPOTIFY_SCOPES.join(' '),
      redirect_uri: redirectUri,
      state,
      code_challenge_method: 'S256',
      code_challenge: base64url(new Uint8Array(digest)),
    });
    window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
    return { success: true };
  } catch {
    return { success: false, error: 'Could not start Spotify authorization. Please retry.' };
  }
}

async function requestToken(params: Record<string, string>): Promise<TokenResult> {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, ...params }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json();
  return response.ok ? data : { error: data.error || 'token_request_failed' };
}

export function handleWebAuthCallback(): Promise<boolean> {
  if (activeCallback) return activeCallback;
  const params = new URLSearchParams(location.search);
  if (window.electronAPI?.isElectron || location.pathname !== new URL(getSpotifyRedirectUri()).pathname ||
      (!params.has('code') && !params.has('error'))) return Promise.resolve(false);

  activeCallback = (async () => {
    const version = sessionVersion;
    try {
      const pending = JSON.parse(sessionStorage.getItem(LOGIN_KEY) || 'null');
      sessionStorage.removeItem(LOGIN_KEY);
      if (!pending || pending.expiresAt <= Date.now() || pending.state !== params.get('state') ||
          pending.redirectUri !== getSpotifyRedirectUri()) {
        throw new Error('This Spotify authorization request is invalid or expired. Start again in PixelTunes.');
      }
      const code = params.get('code');
      if (!code || params.has('error')) throw new Error('Spotify authorization was cancelled. You can retry.');
      const data = await requestToken({
        grant_type: 'authorization_code',
        code,
        redirect_uri: pending.redirectUri,
        code_verifier: pending.verifier,
      });
      if (!data.access_token) throw new Error('Spotify authorization failed. Check the app configuration and retry.');
      if (version !== sessionVersion) return false;
      clearAccessToken();
      if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
      else localStorage.removeItem(REFRESH_KEY);
      setAccessToken(data.access_token, data.expires_in);
      return true;
    } finally {
      for (const key of ['code', 'state', 'error', 'error_description']) params.delete(key);
      const search = params.toString();
      history.replaceState(null, '', `/${search ? `?${search}` : ''}${location.hash}`);
    }
  })().finally(() => { activeCallback = null; });
  return activeCallback;
}

export function refresh(): Promise<string | null> {
  if (activeRefresh) return activeRefresh;
  const version = sessionVersion;
  const promise = (async () => {
    const nativeRefresh = window.electronAPI?.authRefresh;
    const webToken = nativeRefresh ? null : webRefreshToken();
    if (!nativeRefresh && !webToken) return null;
    const data: TokenResult = nativeRefresh
      ? await nativeRefresh()
      : await requestToken({ grant_type: 'refresh_token', refresh_token: webToken! });
    if (version !== sessionVersion) return null;
    if (data.access_token) {
      if (!nativeRefresh && data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
      setAccessToken(data.access_token, data.expires_in);
      return data.access_token;
    }
    if (data.error === 'invalid_grant' || (data.error === 'no_refresh_token' && accessToken)) {
      if (!nativeRefresh) localStorage.removeItem(REFRESH_KEY);
      clearAccessToken();
      revocationListeners.forEach((listener) => listener());
    }
    return null;
  })().catch(() => null).finally(() => {
    if (activeRefresh === promise) activeRefresh = null;
  });
  activeRefresh = promise;
  return promise;
}

export async function getAccessToken(): Promise<string | null> {
  if (accessToken && expiresAt - Date.now() > 60000) return accessToken;
  return await refresh() ?? (expiresAt > Date.now() ? accessToken : null);
}

export async function logout() {
  clearAccessToken();
  for (const key of [REFRESH_KEY, 'spotify_access_token', 'spotify_refresh_token', 'spotify_token_expires_at',
    'spotify_user_name', 'pixeltunes_user_id', 'pixeltunes_last_spotify_track', 'pixeltunes_liked_songs_cache']) {
    try { localStorage.removeItem(key); } catch {}
  }
  try { sessionStorage.removeItem(LOGIN_KEY); } catch {}
  return await window.electronAPI?.authLogout?.() ?? true;
}

export function setInMemoryTokenForTesting(token: string, expiresIn = 3600) {
  clearAccessToken();
  setAccessToken(token, expiresIn, false);
}

window.electronAPI?.onAuthTokenUpdated?.(({ access_token, expires_in }) => {
  if (!access_token) return;
  clearAccessToken();
  setAccessToken(access_token, expires_in);
});
