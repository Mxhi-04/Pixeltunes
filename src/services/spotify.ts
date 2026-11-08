/**
 * Spotify Integration Bridge
 * 
 * Re-exports PKCE Auth module and API helpers while maintaining full backwards
 * compatibility with RetroWindow, SpotifyModal, and App components.
 */

import {
  login as authLogin,
  logout as authLogout,
  getAccessToken,
  onSessionRevoked,
  handleWebAuthCallback,
} from './spotifyAuth';

import {
  spotifyRequest,
  getPlaybackState,
  getCurrentlyPlaying,
  getUserProfile,
  play as playSpotify,
  pause as pauseSpotify,
  nextTrack as nextTrackSpotify,
  previousTrack as previousTrackSpotify,
  seek as seekSpotify,
  setVolume as setVolumeSpotify,
  getDevices as getSpotifyDevices,
  transferPlayback as transferPlaybackSpotify,
  setShuffle as setShuffleSpotify,
  setRepeat as setRepeatSpotify,
} from './spotifyApi';

export * from './spotifyAuth';
export * from './spotifyApi';
export * from './spotifyAutoLaunch';

// Username in-memory cache
let cachedUserName: string = 'SPOTIFY USER';

export function getStoredUserName(): string {
  return cachedUserName || 'SPOTIFY USER';
}

export function setStoredUserName(name: string) {
  cachedUserName = name.toUpperCase();
}

/**
 * Validates the current Spotify session.
 * If a secure Keychain session exists, gets an in-memory access token and fetches the user profile.
 */
export async function validateSpotifyToken(playbackVerified = false): Promise<{
  valid: boolean;
  user?: string;
  needsScopeUpgrade?: boolean;
  forbidden?: boolean;
  error?: string;
}> {
  try {
    if (!await getAccessToken()) return { valid: false };

    if (!playbackVerified) {
      const access = await spotifyRequest('GET', '/me/player/devices');
      if (access.status === 403) {
        const scopeMissing = /insufficient_scope/i.test(access.headers.get('WWW-Authenticate') || '');
        return {
          valid: false,
          needsScopeUpgrade: scopeMissing,
          forbidden: !scopeMissing,
          error: scopeMissing
            ? 'Reconnect Spotify and grant playback permissions.'
            : 'Spotify denied playback access (403). Ask the app owner to allow your account or use your own Client ID in Spotify Setup.',
        };
      }
      if (!access.ok) {
        return { valid: false, error: access.status === 429
          ? 'Spotify is limiting requests. Wait a moment and try again.'
          : 'Could not verify Spotify playback access. Try again in a moment.' };
      }
    }

    const profile = await getUserProfile().catch(() => null);
    const name = (profile?.display_name || profile?.id || 'SPOTIFY USER').toUpperCase();
    cachedUserName = name;
    return { valid: true, user: name };
  } catch {
    return { valid: false, error: 'Could not reach Spotify. Check your connection and try again.' };
  }
}

/**
 * Clears authentication session across memory and macOS Keychain.
 */
export async function clearSpotifyAuth() {
  await authLogout();
  cachedUserName = 'SPOTIFY USER';
}

/**
 * Backwards compatibility helper for UI
 */
export async function initiateSpotifyLogin() {
  return await authLogin();
}

/**
 * Background auto-refresh loop (maintains proactive token freshness)
 */
export function startSpotifyAutoRefreshLoop(): () => void {
  // Proactive 50-minute timer is already automatically managed inside spotifyAuth.ts!
  // We return a teardown hook here for component lifecycle compatibility.
  const unsubscribeRevocation = onSessionRevoked(() => {
    cachedUserName = 'SPOTIFY USER';
  });

  return () => {
    unsubscribeRevocation();
  };
}

// Backwards compatibility export names
export {
  getAccessToken as getStoredAccessToken,
  authLogout as logoutSpotify,
  playSpotify,
  pauseSpotify,
  nextTrackSpotify,
  previousTrackSpotify,
  seekSpotify,
  setVolumeSpotify,
  getSpotifyDevices,
  transferPlaybackSpotify,
  setShuffleSpotify,
  setShuffleSpotify as toggleShuffleSpotify,
  setRepeatSpotify,
  setRepeatSpotify as setRepeatModeSpotify,
  getPlaybackState,
  getCurrentlyPlaying,
  handleWebAuthCallback,
};

export {
  searchTracks,
  getQueue,
  playTrack,
  playPlaylist,
  getUserPlaylists,
  getPlaylistTracks,
  getLikedSongs,
  getAlbumTracks,
} from './spotifyApi';
