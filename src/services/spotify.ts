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
  refresh as authRefresh,
  hasStoredSession,
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
let cachedUserName: string = 'RABGON';

export function getStoredUserName(): string {
  return cachedUserName || 'RABGON';
}

export function setStoredUserName(name: string) {
  cachedUserName = name.toUpperCase();
}

/**
 * Validates the current Spotify session.
 * If a secure Keychain session exists, gets an in-memory access token and fetches the user profile.
 */
export async function validateSpotifyToken(): Promise<{ valid: boolean; user?: string; needsScopeUpgrade?: boolean }> {
  const hasSession = await hasStoredSession();
  if (!hasSession) {
    return { valid: false };
  }

  try {
    const token = await getAccessToken();
    if (!token) {
      return { valid: false };
    }

    const profile = await getUserProfile();
    if (profile) {
      const name = (profile.display_name || profile.id || 'SPOTIFY USER').toUpperCase();
      cachedUserName = name;

      // Verify that the token has user-library-read scope for Liked Songs
      const tracksCheck = await spotifyRequest('GET', '/me/tracks?limit=1').catch(() => null);
      if (tracksCheck && tracksCheck.status === 403) {
        return { valid: false, user: name, needsScopeUpgrade: true };
      }

      return { valid: true, user: name };
    }
  } catch (e) {}

  return { valid: false };
}

/**
 * Clears authentication session across memory and macOS Keychain.
 */
export async function clearSpotifyAuth() {
  await authLogout();
  cachedUserName = 'RABGON';
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
    cachedUserName = 'RABGON';
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
  loadAndPauseFirstLikedSong,
} from './spotifyApi';
