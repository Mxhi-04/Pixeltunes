import { useEffect, useState } from 'react';
import { PixelSaturnIcon } from './PixelSaturnIcon';
import { getLikedSongs, getQueue, getUserPlaylists, playPlaylist, playTrack } from '../services/spotify';
import { BUILTIN_TRACKS } from '../services/lofiAudio';
import { playClickSound } from '../services/soundEffects';
import { getSpotifyItemUrl } from '../services/spotifyLinks';
import type { SpotifyPlaybackState, SpotifyPlaylist, SpotifyTrack } from '../types/spotify';

interface RetroQueueViewProps {
  isSpotifyConnected: boolean;
  onClose: () => void;
  onOpenSpotifyModal: (opener: HTMLElement) => void;
  onTrackPlayed: () => void;
  currentTrack?: SpotifyPlaybackState['item'];
  currentBuiltinId?: string;
  onBuiltinSelect: (index: number) => void;
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RetroQueueView({
  isSpotifyConnected, onClose, onOpenSpotifyModal, onTrackPlayed, currentTrack, currentBuiltinId, onBuiltinSelect,
}: RetroQueueViewProps) {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [queue, setQueue] = useState<Awaited<ReturnType<typeof getQueue>>['queue']>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [playlistOffset, setPlaylistOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [list, setList] = useState<'playlists' | 'liked' | 'queue'>('playlists');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [pendingTrack, setPendingTrack] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!isSpotifyConnected) {
      setTracks([]);
      setQueue([]);
      setPlaylists([]);
      setPlaylistOffset(0);
      setNextOffset(null);
      setList('playlists');
      setStatus('');
      setPendingTrack(null);
      return;
    }
    setLoading(true);
    setLoadError(false);
    const load = async () => {
      if (list === 'playlists') {
        const page = await getUserPlaylists(playlistOffset);
        if (cancelled) return;
        setPlaylists((previous) => {
          const combined = playlistOffset ? [...previous, ...page.playlists] : page.playlists;
          return [...new Map(combined.map((playlist) => [playlist.id, playlist])).values()];
        });
        setNextOffset(page.nextOffset);
      } else if (list === 'liked') {
        const liked = await getLikedSongs();
        if (!cancelled) setTracks(liked);
      } else {
        const result = await getQueue();
        if (!cancelled) setQueue(result.queue);
      }
    };
    load().catch(() => {
      if (!cancelled) setLoadError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [isSpotifyConnected, refreshCount, list, playlistOffset]);

  const playEntry = async (uri: string, play: () => Promise<boolean>, itemType: 'track' | 'playlist') => {
    playClickSound();
    setPendingTrack(uri);
    setStatus('Contacting Spotify…');
    const success = await play();
    setPendingTrack(null);
    setStatus(success ? '' : `Could not play this ${itemType}. Check your Spotify device and Premium access.`);
    if (success) onTrackPlayed();
  };

  const labels = { playlists: 'Spotify playlists', liked: 'Liked songs', queue: 'Spotify queue' };
  const selectList = (next: typeof list) => {
    if (next === list) return;
    setPlaylistOffset(0);
    setNextOffset(null);
    setLoadError(false);
    setList(next);
    setStatus('');
  };
  const entries = isSpotifyConnected
    ? (list === 'playlists' ? playlists.map((playlist) => ({
      id: playlist.uri, name: playlist.name, artist: playlist.owner?.display_name || 'Spotify playlist',
      duration: null, selected: false, url: getSpotifyItemUrl(playlist.uri),
    })) : (list === 'liked' ? tracks : queue).map((track) => ({
      id: track.uri, name: track.name, artist: track.artists?.map(({ name }) => name).join(', ') ||
        ('show' in track ? track.show?.name : undefined),
      duration: track.duration_ms, selected: list === 'liked' && track.uri === currentTrack?.uri,
      url: getSpotifyItemUrl(track.uri),
    })))
    : BUILTIN_TRACKS.map((track) => ({
      id: track.id, name: track.name, artist: track.artist, duration: track.duration * 1000, url: undefined,
      selected: track.id === currentBuiltinId,
    }));

  return (
    <section aria-label={isSpotifyConnected ? labels[list] : 'Lo-fi library'}
      className="w-full h-full bg-[#fffdf5] flex flex-col overflow-hidden text-[#191244] select-none">
      <div className="h-7 bg-[#fec5db] border-b-2 border-[#191244] px-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <PixelSaturnIcon className="w-5 h-3.5 shrink-0" />
          <span className="font-pixel text-[8px] font-bold truncate">
            {isSpotifyConnected ? ({
              playlists: `PLAYLISTS (${playlists.length})`, liked: `LIKED SONGS (${tracks.length})`, queue: 'SPOTIFY QUEUE',
            })[list] : 'LO-FI LIBRARY'}
          </span>
        </div>
        <button data-testid="toggle-cover-btn" onClick={onClose}
          className="px-1.5 py-0.5 bg-[#fffdf5] border border-[#191244] text-[7px] font-pixel hover:bg-[#9df0cf]">
          COVER
        </button>
      </div>

      {isSpotifyConnected && (
        <div className="flex items-center justify-between gap-1 px-2 py-1 text-[8px] font-pixel border-b border-[#191244]">
          <div className="flex gap-1.5">
            <button aria-pressed={list === 'playlists'} onClick={() => selectList('playlists')} className="underline aria-pressed:font-bold">Playlists</button>
            <button aria-pressed={list === 'liked'} onClick={() => selectList('liked')} className="underline aria-pressed:font-bold">Liked songs</button>
            <button aria-pressed={list === 'queue'} onClick={() => selectList('queue')} className="underline aria-pressed:font-bold">Up next</button>
          </div>
          <button type="button" aria-label="Refresh" title="Refresh" disabled={loading} onClick={() => {
            setPlaylistOffset(0);
            setNextOffset(null);
            setRefreshCount((count) => count + 1);
          }} className="px-1 text-xs">↻</button>
        </div>
      )}
      {currentTrack && isSpotifyConnected && (
        <p className="bg-[#9df0cf] border-b-2 border-[#191244] px-2 py-1.5 font-pixel text-[8px] truncate">
          Selected in Spotify · {currentTrack.name}
        </p>
      )}
      {(status || loadError) && isSpotifyConnected && (
        <p role="status" className="bg-[#ffd269] px-2 py-1 font-pixel text-[8px]">
          {status || `Could not load ${list === 'liked' ? 'Liked Songs' : labels[list]}. Try refreshing.`}
        </p>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && !entries.length && <p role="status" className="p-3 font-pixel text-[8px]">Loading…</p>}
        {!loading && !loadError && !entries.length && (
          <p className="p-3 font-pixel text-[8px]">
            {list === 'playlists' ? 'Save or create a playlist in Spotify to see it here.'
              : list === 'liked' ? 'Like a track in Spotify to see it here.' : 'The Spotify queue is empty.'}
          </p>
        )}
        {entries.map((entry, index) => {
          const label = (
            <>
              <span className="font-pixel text-[8px] text-[#4a3e77]">{String(index + 1).padStart(2, '0')}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-pixel text-[9px] font-bold truncate" title={entry.name}>{entry.name}</span>
                <span className="block font-silkscreen text-[8px] truncate" title={entry.artist}>{entry.artist}</span>
              </span>
              <span className="font-silkscreen text-[8px]">{entry.duration === null ? '▶' : formatTime(entry.duration)}</span>
            </>
          );
          const rowClass = `w-full px-2 py-2 flex items-center gap-2 text-left ${entry.selected ? 'bg-[#ffd269]' : 'hover:bg-[#fec5db]/60'}`;

          return (
            <div key={`${entry.id}-${index}`} className="flex border-b border-[#191244]/15">
              {isSpotifyConnected && list === 'queue' ? (
                <div className={rowClass}>{label}</div>
              ) : (
                <button type="button" aria-current={entry.selected ? 'true' : undefined} disabled={Boolean(pendingTrack)}
                  aria-label={isSpotifyConnected && list === 'playlists' ? `Play ${entry.name}` : undefined}
                  onClick={() => {
                    if (!isSpotifyConnected) onBuiltinSelect(index);
                    else if (list === 'playlists') void playEntry(entry.id, () => playPlaylist(entry.id), 'playlist');
                    else void playEntry(entry.id, () => playTrack(entry.id, undefined, tracks.slice(index + 1).map(({ uri }) => uri)), 'track');
                  }}
                  className={rowClass}>{label}</button>
              )}
              {entry.url && (
                <a href={entry.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${entry.name} in Spotify`}
                  className="px-2 flex items-center text-xs hover:bg-[#fec5db]/60">↗</a>
              )}
            </div>
          );
        })}
        {isSpotifyConnected && list === 'playlists' && nextOffset !== null && (
          <button type="button" disabled={loading} onClick={() => {
            if (loadError && playlistOffset === nextOffset) setRefreshCount((count) => count + 1);
            else setPlaylistOffset(nextOffset);
          }} className="w-full px-2 py-2 font-pixel text-[8px] underline">
            {loading ? 'Loading…' : loadError ? 'Retry loading playlists' : 'Load more playlists'}
          </button>
        )}
      </div>

      {isSpotifyConnected && (
        <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer"
          className="self-start px-2 py-1" title="Open Spotify">
          <img src="./spotify-logo.svg" alt="Spotify" className="w-[110px] h-auto" style={{ imageRendering: 'auto' }} />
        </a>
      )}
      {!isSpotifyConnected && (
        <button onClick={(event) => onOpenSpotifyModal(event.currentTarget)} className="m-2 px-2 py-1 bg-[#9df0cf] border border-[#191244] font-pixel text-[8px]">
          + CONNECT SPOTIFY
        </button>
      )}
    </section>
  );
}

export default RetroQueueView;
