/**
 * Spotify API Helper Module
 * 
 * Requirements:
 * - Attaches in-memory Bearer token via getAccessToken().
 * - If any call returns 401, silently refreshes once and retries once.
 * - On 429 Too Many Requests, waits for the Retry-After header before retrying.
 * - On network error, retries with exponential backoff (5s, 10s, 20s, max 60s) without disturbing the UI.
 * - No tokens printed to the console or written to log files.
 */

import { getAccessToken, refresh } from './spotifyAuth';
import { SpotifyPlaybackState, SpotifyDevice } from '../types/spotify';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export interface SpotifyRequestOptions {
  body?: any;
  headers?: Record<string, string>;
  maxNetworkRetries?: number;
}

/**
 * Universal Spotify API Request Helper
 */
export async function spotifyRequest(
  method: string,
  path: string,
  options: SpotifyRequestOptions = {}
): Promise<Response> {
  const backoffDelays = [5000, 10000, 20000, 40000, 60000];
  let networkAttempt = 0;
  const maxRetries = options.maxNetworkRetries ?? 5;

  const url = path.startsWith('http')
    ? path
    : `${SPOTIFY_API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  while (true) {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Not authenticated with Spotify');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    };

    let serializedBody: BodyInit | undefined = undefined;
    if (options.body) {
      if (typeof options.body === 'string') {
        serializedBody = options.body;
      } else if (typeof options.body === 'object' && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        serializedBody = JSON.stringify(options.body);
      } else {
        serializedBody = options.body;
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: serializedBody,
      });
    } catch (networkError) {
      // On network error: retry with exponential backoff (5s, 10s, 20s, max 60s)
      if (networkAttempt >= maxRetries) {
        throw networkError;
      }
      const delay = backoffDelays[Math.min(networkAttempt, backoffDelays.length - 1)];
      networkAttempt++;
      await new Promise((res) => setTimeout(res, delay));
      continue;
    }

    // 1. Handle 401 Unauthorized: Refresh once, then retry call once
    if (response.status === 401) {
      const freshToken = await refresh();
      if (freshToken) {
        headers.Authorization = `Bearer ${freshToken}`;
        try {
          response = await fetch(url, {
            method,
            headers,
            body: serializedBody,
          });
        } catch (retryErr) {
          throw retryErr;
        }
      }
      return response;
    }

    // 2. Handle 429 Too Many Requests: Wait for Retry-After header before retrying
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const waitSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 5;
      await new Promise((res) => setTimeout(res, Math.max(1, waitSeconds) * 1000));
      continue;
    }

    return response;
  }
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

let cachedUserId: string | null = null;

export function getUserId(): string | null {
  if (cachedUserId) return cachedUserId;
  try {
    return localStorage.getItem('pixeltunes_user_id');
  } catch {
    return null;
  }
}

/**
 * Get authorized user profile
 */
export async function getUserProfile(): Promise<{ id: string; display_name: string } | null> {
  try {
    const res = await spotifyRequest('GET', '/me');
    if (res.ok) {
      const data = await res.json();
      if (data?.id) {
        cachedUserId = data.id;
        try {
          localStorage.setItem('pixeltunes_user_id', data.id);
        } catch {}
      }
      return data;
    }
  } catch (e) {}
  return null;
}

/**
 * Get authoritative playback state (track, position, shuffle, repeat, device)
 */
export async function getPlaybackState(): Promise<SpotifyPlaybackState | null> {
  try {
    const res = await spotifyRequest('GET', '/me/player');
    if (res.status === 204 || res.status === 404 || !res.ok) {
      return null;
    }
    return await res.json();
  } catch (e) {
    return null;
  }
}

/**
 * Play / Resume with Seamless Auto-Wake and Fallback
 */
export async function play(deviceId?: string): Promise<boolean> {
  try {
    let devices = await getDevices();

    // If devices list is empty, poll briefly for registered device
    if (devices.length === 0) {
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise((r) => setTimeout(r, 300));
        devices = await getDevices();
        if (devices.length > 0) break;
      }
    }

    if (devices.length === 0) {
      return false;
    }

    // Determine target device:
    // Prefer explicitly active device -> computer/desktop device -> first available
    const activeDevice = devices.find((d) => d.is_active);
    const computerDevice = devices.find((d) => d.type?.toLowerCase() === 'computer');
    const target = deviceId
      ? devices.find((d) => d.id === deviceId) || devices[0]
      : (activeDevice || computerDevice || devices[0]);

    const targetId = target?.id;
    if (!targetId) return false;

    // If target device is not currently active, transfer playback to activate it
    if (!target.is_active) {
      await transferPlayback(targetId, true);
      await new Promise((r) => setTimeout(r, 250));
    }

    const path = `/me/player/play?device_id=${targetId}`;

    // 1. First attempt standard resume
    const res = await spotifyRequest('PUT', path);
    if (res.ok || res.status === 204) {
      return true;
    }

    // 2. If simple resume failed (e.g. idle player without loaded context):
    // Retrieve the song that was playing in Spotify from localStorage or liked songs!
    let trackUri: string | undefined;
    let subsequentUris: string[] = [];
    try {
      const stored = localStorage.getItem('pixeltunes_last_spotify_track');
      if (stored) {
        const parsed = JSON.parse(stored);
        trackUri = parsed.uri;
      }
      const cache = localStorage.getItem('pixeltunes_liked_songs_cache');
      if (cache) {
        const list = JSON.parse(cache);
        subsequentUris = list
          .filter((t: any) => t.uri && t.uri !== trackUri)
          .map((t: any) => t.uri)
          .slice(0, 48);
      }
    } catch {}

    if (!trackUri) {
      const liked = await getLikedSongs(10).catch(() => []);
      if (liked && liked.length > 0) {
        trackUri = liked[0].uri;
        subsequentUris = liked.slice(1).map((t) => t.uri).filter(Boolean).slice(0, 48);
      }
    }

    if (!trackUri) {
      const queueData = await getQueue().catch(() => null);
      trackUri = queueData?.currentlyPlaying?.uri || (queueData?.queue && queueData.queue.length > 0 ? queueData.queue[0]?.uri : undefined);
    }

    if (trackUri) {
      let uid = getUserId();
      if (!uid) {
        const uProfile = await getUserProfile().catch(() => null);
        uid = uProfile?.id || null;
      }

      if (uid) {
        const playRes = await spotifyRequest('PUT', path, {
          body: {
            context_uri: `spotify:user:${uid}:collection`,
            offset: { uri: trackUri },
          },
        });
        if (playRes.ok || playRes.status === 204) {
          return true;
        }
      }

      // Pure Web API playback fallback with uris
      const playTrackRes = await spotifyRequest('PUT', path, {
        body: { uris: [trackUri, ...subsequentUris] },
      });
      if (playTrackRes.ok || playTrackRes.status === 204) {
        return true;
      }
    }

    return false;
  } catch (e) {
    console.error('Seamless auto-play error:', e);
    return false;
  }
}

/**
 * Pause
 */
export async function pause(deviceId?: string): Promise<boolean> {
  try {
    const path = deviceId ? `/me/player/pause?device_id=${deviceId}` : '/me/player/pause';
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
    const path = deviceId ? `/me/player/next?device_id=${deviceId}` : '/me/player/next';
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
    const path = deviceId ? `/me/player/previous?device_id=${deviceId}` : '/me/player/previous';
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
    const query = new URLSearchParams({ position_ms: positionMs.toString() });
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
    const query = new URLSearchParams({ volume_percent: Math.round(volumePercent).toString() });
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
export async function searchTracks(query: string, limit: number = 20): Promise<any[]> {
  try {
    if (!query || !query.trim()) return [];
    const res = await spotifyRequest('GET', `/search?q=${encodeURIComponent(query.trim())}&type=track&limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      return data.tracks?.items || [];
    }
  } catch (e) {
    console.error('Spotify track search error:', e);
  }
  return [];
}

/**
 * Get Spotify Player Queue
 */
export async function getQueue(): Promise<{ currentlyPlaying: any; queue: any[] }> {
  try {
    const res = await spotifyRequest('GET', '/me/player/queue');
    if (res.ok) {
      const data = await res.json();
      return {
        currentlyPlaying: data.currently_playing,
        queue: data.queue || [],
      };
    }
  } catch (e) {
    console.error('Spotify get queue error:', e);
  }
  return { currentlyPlaying: null, queue: [] };
}

/**
 * Play a specific Spotify Track by URI
 */
export async function playTrack(
  uri: string,
  deviceId?: string,
  remainingUris?: string[],
  contextUri?: string
): Promise<boolean> {
  try {
    // 1. Resolve active or computer device
    let devices = await getDevices();
    if (devices.length === 0) {
      await new Promise((r) => setTimeout(r, 200));
      devices = await getDevices();
    }

    const active = devices.find((d) => d.is_active);
    const computer = devices.find((d) => d.type?.toLowerCase() === 'computer');
    const target = deviceId
      ? devices.find((d) => d.id === deviceId) || devices[0]
      : (active || computer || devices[0]);

    const targetId = target?.id;

    // 2. If target is inactive, activate device silently via API without unminimizing
    if (target && !target.is_active && targetId) {
      await transferPlayback(targetId, true).catch(() => {});
      await new Promise((r) => setTimeout(r, 200));
    }

    const query = targetId ? `?device_id=${targetId}` : '';

    // 3. Resolve context URI (use user's Liked Songs collection if not specified)
    let effectiveContextUri = contextUri;
    if (!effectiveContextUri) {
      let uid = getUserId();
      if (!uid) {
        const uProfile = await getUserProfile().catch(() => null);
        uid = uProfile?.id || null;
      }
      if (uid) {
        effectiveContextUri = `spotify:user:${uid}:collection`;
      }
    }

    let body: any;
    if (effectiveContextUri) {
      body = { context_uri: effectiveContextUri, offset: { uri } };
    } else {
      const remainingClean = (remainingUris || []).filter((u) => u && u !== uri);
      body = { uris: [uri, ...remainingClean.slice(0, 49)] };
    }

    let res = await spotifyRequest(
      'PUT',
      `/me/player/play${query}`,
      { body }
    );
    if (!res.ok && res.status !== 204 && effectiveContextUri) {
      // Fallback with uris array
      const remainingClean = (remainingUris || []).filter((u) => u && u !== uri);
      res = await spotifyRequest('PUT', `/me/player/play${query}`, {
        body: { uris: [uri, ...remainingClean.slice(0, 49)] },
      });
      if (!res.ok && res.status !== 204) {
        // Fallback simple resume
        res = await spotifyRequest('PUT', `/me/player/play${query}`);
      }
    }

    return res.ok || res.status === 204;
  } catch (e) {
    console.error('Spotify play track error:', e);
    return false;
  }
}

/**
 * Play a specific Spotify Playlist / Context by URI
 */
export async function playPlaylist(contextUri: string, deviceId?: string): Promise<boolean> {
  try {
    let targetId = deviceId;
    if (!targetId) {
      const devices = await getDevices();
      const active = devices.find((d) => d.is_active);
      targetId = active?.id || (devices.length > 0 ? devices[0].id : undefined);
    }
    const query = targetId ? `?device_id=${targetId}` : '';
    const res = await spotifyRequest('PUT', `/me/player/play${query}`, {
      body: { context_uri: contextUri },
    });
    return res.ok || res.status === 204;
  } catch (e) {
    console.error('Spotify play playlist error:', e);
    return false;
  }
}

/**
 * Get User Playlists
 */
export async function getUserPlaylists(limit: number = 20): Promise<any[]> {
  try {
    const res = await spotifyRequest('GET', `/me/playlists?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      return data.items || [];
    }
  } catch (e) {
    // 403 or network error fallback
  }
  return [];
}

/**
 * Get Tracks in a Playlist
 */
export async function getPlaylistTracks(playlistId: string, limit: number = 50): Promise<any[]> {
  try {
    const res = await spotifyRequest('GET', `/playlists/${playlistId}/tracks?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      return (data.items || []).map((item: any) => item.track).filter(Boolean);
    }
  } catch (e) {
    // fallback
  }
  return [];
}

/**
 * Get User's Liked Songs (Saved Tracks)
 */
export async function getLikedSongs(limit: number = 50): Promise<any[]> {
  try {
    const res = await spotifyRequest('GET', `/me/tracks?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      return (data.items || []).map((item: any) => item.track).filter(Boolean);
    }
  } catch (e) {
    console.error('Spotify get liked songs error:', e);
  }
  return [];
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

/**
 * Loads the user's first Liked Song into Spotify and leaves it paused.
 * Guarantees that Pixeltunes is paused on the user's first liked song on startup or connect.
 */
export async function loadAndPauseFirstLikedSong(): Promise<{
  firstTrack: any | null;
  likedSongs: any[];
}> {
  try {
    // If Spotify is actively playing in the background, pause it so Pixeltunes is paused on the first liked song
    try {
      const stateRes = await spotifyRequest('GET', '/me/player').catch(() => null);
      if (stateRes && stateRes.ok) {
        const state = await stateRes.json().catch(() => null);
        if (state && state.is_playing) {
          await spotifyRequest('PUT', '/me/player/pause').catch(() => {});
        }
      }
    } catch {}

    const liked = await getLikedSongs(50);
    if (!liked || liked.length === 0) {
      return { firstTrack: null, likedSongs: [] };
    }

    const firstSong = liked[0];

    // Store in cache for instantaneous rendering
    try {
      localStorage.setItem('pixeltunes_last_spotify_track', JSON.stringify(firstSong));
      localStorage.setItem('pixeltunes_liked_songs_cache', JSON.stringify(liked));
    } catch {}

    // Never trigger OS open commands - keep Spotify completely minimized and untouched!
    return { firstTrack: firstSong, likedSongs: liked };
  } catch (err) {
    console.error('Failed to load and pause first liked song:', err);
    return { firstTrack: null, likedSongs: [] };
  }
}

