import { getAccessToken, refresh } from './spotifyAuth';
import { SpotifyPlaybackState, SpotifyDevice, SpotifyPlaylist, SpotifyTrack } from '../../types/spotify';
import {
  isAutoLaunchEnabled,
  launchSpotifyInBackground,
} from './spotifyAutoLaunch';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export interface SpotifyRequestOptions {
  body?: any;
}

let rateLimitedUntil = 0;

export async function spotifyRequest(
  method: string,
  path: string,
  options: SpotifyRequestOptions = {}
): Promise<Response> {
  const url = new URL(path.startsWith('/') ? `/v1${path}` : path, `${SPOTIFY_API_BASE}/`);
  if (url.origin !== 'https://api.spotify.com' || !url.pathname.startsWith('/v1/')) {
    throw new Error('Invalid Spotify API URL');
  }

  const send = (token: string) => fetch(url, {
    method,
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${token}`,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(8000),
  });

  if (Date.now() < rateLimitedUntil) {
    return new Response(null, { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitedUntil - Date.now()) / 1000)) } });
  }

  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Spotify');

  let response = await send(token);
  if (response.status === 401) {
    const freshToken = await refresh();
    if (freshToken) response = await send(freshToken);
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After')) || 5;
    rateLimitedUntil = Date.now() + Math.max(1, retryAfter) * 1000;
  }

  return response;
}

// Snake_case alias per requirements
export const spotify_request = spotifyRequest;

/**
 * Get the User's Currently Playing Track
 * Usage Example: GET /v1/me/player/currently-playing
 */
export async function getCurrentlyPlaying(): Promise<any | null> {
  try {
    const res = await spotifyRequest('GET', '/me/player/currently-playing');
    if (res.status === 204 || res.status === 404 || !res.ok) {
      return null;
    }
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function getUserProfile(): Promise<{ id: string; display_name: string } | null> {
  const res = await spotifyRequest('GET', '/me');
  return res.ok ? await res.json() : null;
}

export async function getPlaybackState(): Promise<SpotifyPlaybackState | null> {
  const res = await spotifyRequest('GET', '/me/player?additional_types=track,episode');
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Spotify playback status ${res.status}`);
  return await res.json();
}

function pickDevice(devices: SpotifyDevice[], id?: string) {
  const available = devices.filter((device) => device.id && !device.is_restricted);
  if (id) return available.find((device) => device.id === id);
  return available.find((device) => device.is_active) ||
    available.find((device) => device.type?.toLowerCase() === 'computer') || available[0];
}

export async function ensureActivePlaybackDevice(deviceId?: string): Promise<SpotifyDevice | null> {
  const target = pickDevice(await getDevices(), deviceId);
  if (target || deviceId || !isAutoLaunchEnabled() || !await launchSpotifyInBackground()) return target ?? null;

  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const device = pickDevice(await getDevices());
    if (device) return device;
  }
  return null;
}

function deviceQuery(deviceId?: string) {
  return deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
}

export async function play(deviceId?: string): Promise<boolean> {
  try {
    const device = await ensureActivePlaybackDevice(deviceId);
    if (!device) return false;
    const path = `/me/player/play${deviceQuery(device.id ?? undefined)}`;
    const res = await spotifyRequest('PUT', path);
    if (res.ok) return true;
    if (![404, 400].includes(res.status)) return false;

    const liked = await getLikedSongs(10);
    const uris = liked.map((track) => track.uri);
    return uris.length > 0 && (await spotifyRequest('PUT', path, { body: { uris } })).ok;
  } catch {
    return false;
  }
}

/**
 * Pause
 */
export async function pause(deviceId?: string): Promise<boolean> {
  try {
    const path = `/me/player/pause${deviceQuery(deviceId)}`;
    const res = await spotifyRequest('PUT', path);
    return res.ok || res.status === 204;
  } catch (e) {
    return false;
  }
}

/**
 * Skip to Next Track
 */
export async function nextTrack(deviceId?: string): Promise<boolean> {
  try {
    const path = `/me/player/next${deviceQuery(deviceId)}`;
    const res = await spotifyRequest('POST', path);
    return res.ok || res.status === 204;
  } catch (e) {
    return false;
  }
}

/**
 * Skip to Previous Track
 */
export async function previousTrack(deviceId?: string): Promise<boolean> {
  try {
    const path = `/me/player/previous${deviceQuery(deviceId)}`;
    const res = await spotifyRequest('POST', path);
    return res.ok || res.status === 204;
  } catch (e) {
    return false;
  }
}

/**
 * Seek to Position (in ms)
 */
export async function seek(positionMs: number, deviceId?: string): Promise<boolean> {
  try {
    const query = new URLSearchParams({ position_ms: String(Math.max(0, Math.round(positionMs))) });
    if (deviceId) query.append('device_id', deviceId);
    const res = await spotifyRequest('PUT', `/me/player/seek?${query.toString()}`);
    return res.ok || res.status === 204;
  } catch (e) {
    return false;
  }
}

/**
 * Set Volume (0 to 100)
 */
export async function setVolume(volumePercent: number, deviceId?: string): Promise<boolean> {
  try {
    const query = new URLSearchParams({ volume_percent: String(Math.max(0, Math.min(100, Math.round(volumePercent)))) });
    if (deviceId) query.append('device_id', deviceId);
    const res = await spotifyRequest('PUT', `/me/player/volume?${query.toString()}`);
    return res.ok || res.status === 204;
  } catch (e) {
    return false;
  }
}

/**
 * Get active user devices
 */
export async function getDevices(): Promise<SpotifyDevice[]> {
  try {
    const res = await spotifyRequest('GET', '/me/player/devices');
    if (res.ok) {
      const data = await res.json();
      return data.devices || [];
    }
  } catch (e) {}
  return [];
}

/**
 * Transfer playback to device
 */
export async function transferPlayback(deviceId: string, playState: boolean = true): Promise<boolean> {
  try {
    const res = await spotifyRequest('PUT', '/me/player', {
      body: { device_ids: [deviceId], play: playState },
    });
    return res.ok || res.status === 204;
  } catch (e) {
    return false;
  }
}

/**
 * Toggle Shuffle
 */
export async function setShuffle(state: boolean, deviceId?: string): Promise<boolean> {
  try {
    const query = new URLSearchParams({ state: state.toString() });
    if (deviceId) query.append('device_id', deviceId);
    const res = await spotifyRequest('PUT', `/me/player/shuffle?${query.toString()}`);
    return res.ok || res.status === 204;
  } catch (e) {
    return false;
  }
}

/**
 * Cycle Repeat (off, track, context)
 */
export async function setRepeat(state: 'off' | 'track' | 'context', deviceId?: string): Promise<boolean> {
  try {
    const query = new URLSearchParams({ state });
    if (deviceId) query.append('device_id', deviceId);
    const res = await spotifyRequest('PUT', `/me/player/repeat?${query.toString()}`);
    return res.ok || res.status === 204;
  } catch (e) {
    return false;
  }
}

/**
 * Search Spotify Tracks by query
 */
export async function searchTracks(query: string, limit: number = 10): Promise<any[]> {
  try {
    if (!query || !query.trim()) return [];
    const res = await spotifyRequest('GET', `/search?q=${encodeURIComponent(query.trim())}&type=track&limit=${Math.min(10, limit)}`);
    if (res.ok) {
      const data = await res.json();
      return data.tracks?.items || [];
    }
  } catch (e) {
    console.error('Spotify track search error:', e);
  }
  return [];
}

export async function getQueue(): Promise<{
  currentlyPlaying: SpotifyPlaybackState['item'];
  queue: NonNullable<SpotifyPlaybackState['item']>[];
}> {
  const res = await spotifyRequest('GET', '/me/player/queue');
  if (res.status === 204) return { currentlyPlaying: null, queue: [] };
  if (!res.ok) throw new Error(`Spotify queue status ${res.status}`);
  const data = await res.json();
  return { currentlyPlaying: data.currently_playing, queue: (data.queue || []).filter(Boolean) };
}

export async function addTrackToQueue(uri: string) {
  try {
    return (await spotifyRequest('POST', `/me/player/queue?${new URLSearchParams({ uri })}`)).ok;
  } catch {
    return false;
  }
}

/**
 * Play a specific Spotify Track by URI
 */
export async function playTrack(
  uri: string,
  deviceId?: string,
  remainingUris: string[] = [],
  contextUri?: string
): Promise<boolean> {
  const uris = [uri, ...remainingUris.filter((value) => value && value !== uri).slice(0, 49)];
  return playSelection(contextUri ? { context_uri: contextUri, offset: { uri } } : { uris }, deviceId);
}

let cachedUserId: string | null = null;

export async function getUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId;
  try {
    const stored = localStorage.getItem('pixeltunes_user_id');
    if (stored) {
      cachedUserId = stored;
      return stored;
    }
  } catch {}
  try {
    const profile = await getUserProfile();
    if (profile?.id) {
      cachedUserId = profile.id;
      try { localStorage.setItem('pixeltunes_user_id', profile.id); } catch {}
      return profile.id;
    }
  } catch {}
  return null;
}

/**
 * Play a track from user's Liked Songs collection
 */
export async function playLikedSong(
  uri: string,
  deviceId?: string,
  remainingUris: string[] = []
): Promise<boolean> {
  const userId = await getUserId();
  if (userId) {
    const ok = await playSelection({
      context_uri: `spotify:user:${userId}:collection`,
      offset: { uri },
    }, deviceId);
    if (ok) return true;
  }
  return playTrack(uri, deviceId, remainingUris);
}

export function playPlaylist(contextUri: string, deviceId?: string): Promise<boolean> {
  return playSelection({ context_uri: contextUri }, deviceId);
}

async function playSelection(body: Record<string, unknown>, deviceId?: string): Promise<boolean> {
  try {
    const device = await ensureActivePlaybackDevice(deviceId);
    if (!device) return false;
    const result = await spotifyRequest('PUT', `/me/player/play${deviceQuery(device.id ?? undefined)}`, { body });
    return result.ok;
  } catch {
    return false;
  }
}

export async function getUserPlaylists(offset = 0): Promise<{ playlists: SpotifyPlaylist[]; nextOffset: number | null }> {
  const res = await spotifyRequest('GET', `/me/playlists?limit=50&offset=${offset}`);
  if (!res.ok) throw new Error(`Spotify playlists status ${res.status}`);
  const { items, next }: { items: (SpotifyPlaylist | null)[]; next: string | null } = await res.json();
  const nextPage = next ? new URL(next, SPOTIFY_API_BASE) : null;
  const nextOffset = Number(nextPage?.searchParams.get('offset'));
  return {
    playlists: items.filter((playlist): playlist is SpotifyPlaylist => Boolean(playlist?.id && playlist?.uri)),
    nextOffset: Number.isSafeInteger(nextOffset) && nextOffset > offset ? nextOffset : null,
  };
}

/**
 * Get Tracks in a Playlist
 */
export async function getPlaylistTracks(playlistId: string, limit: number = 50): Promise<any[]> {
  const cleanId = playlistId.replace(/^spotify:playlist:/, '').split('?')[0];
  try {
    let res = await spotifyRequest('GET', `/playlists/${encodeURIComponent(cleanId)}/items?limit=${limit}`);
    if (res.status === 404) {
      res = await spotifyRequest('GET', `/playlists/${encodeURIComponent(cleanId)}/tracks?limit=${limit}`);
    }
    if (res.ok) {
      const data = await res.json();
      return (data.items || []).map((item: any) => item.item || item.track).filter(Boolean);
    }
  } catch (e) {
    // fallback
  }
  return [];
}

/**
 * Get User's Liked Songs (Saved Tracks)
 */
export async function getLikedSongs(limit: number = 50): Promise<SpotifyTrack[]> {
  const res = await spotifyRequest('GET', `/me/tracks?limit=${limit}`);
  if (!res.ok) throw new Error(`Spotify library status ${res.status}`);
  const data = await res.json();
  return (data.items || []).map((item: { track?: SpotifyTrack }) => item.track)
    .filter((track: SpotifyTrack | undefined) => track?.uri?.startsWith('spotify:track:'));
}

/**
 * Get Tracks in an Album
 */
export async function getAlbumTracks(albumId: string, albumMeta?: any): Promise<any[]> {
  try {
    const res = await spotifyRequest('GET', `/albums/${albumId}/tracks?limit=50`);
    if (res.ok) {
      const data = await res.json();
      return (data.items || []).map((t: any) => ({
        ...t,
        album: albumMeta || t.album || { id: albumId, images: [] },
      }));
    }
  } catch (e) {
    console.error('Spotify get album tracks error:', e);
  }
  return [];
}

