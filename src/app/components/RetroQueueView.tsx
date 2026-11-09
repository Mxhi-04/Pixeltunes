import { useEffect, useState, useRef } from 'react';
import { PixelSaturnIcon } from './PixelSaturnIcon';
import { getLikedSongs, getPlaylistTracks, getQueue, getUserPlaylists, playLikedSong, playPlaylist, playTrack } from '../services/spotify';
import { BUILTIN_TRACKS } from '../../shared/services/lofiAudio';
import { playClickSound } from '../../shared/services/soundEffects';
import { getSpotifyItemUrl } from '../services/spotifyLinks';
import type { SpotifyPlaybackState, SpotifyPlaylist, SpotifyTrack } from '../../types/spotify';

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
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
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
      setSelectedPlaylist(null);
      setPlaylistTracks([]);
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
        const pagePromise = getUserPlaylists(playlistOffset);
        const likedPromise = tracks.length === 0 ? getLikedSongs(50).catch(() => []) : Promise.resolve(null);
        const [page, preloadedLiked] = await Promise.all([pagePromise, likedPromise]);
        if (cancelled) return;
        setPlaylists((previous) => {
          const combined = playlistOffset ? [...previous, ...page.playlists] : page.playlists;
          return [...new Map(combined.map((playlist) => [playlist.id, playlist])).values()];
        });
        setNextOffset(page.nextOffset);
        if (preloadedLiked && !cancelled) {
          setTracks(preloadedLiked);
        }
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

  const openPlaylist = (playlist: SpotifyPlaylist) => {
    playClickSound();
    setSelectedPlaylist(playlist);
    setPlaylistLoading(true);
    setPlaylistTracks([]);
    setStatus('');
    getPlaylistTracks(playlist.id).then((items) => {
      setPlaylistTracks(items || []);
    }).catch(() => {
      setStatus(`Could not load tracks for ${playlist.name}.`);
    }).finally(() => {
      setPlaylistLoading(false);
    });
  };

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
    setSelectedPlaylist(null);
    setPlaylistTracks([]);
    if (next === list) return;
    setPlaylistOffset(0);
    setNextOffset(null);
    setLoadError(false);
    setList(next);
    setStatus('');
  };

  const handleRefresh = () => {
    playClickSound();
    if (selectedPlaylist) {
      openPlaylist(selectedPlaylist);
    } else {
      setPlaylistOffset(0);
      setNextOffset(null);
      setRefreshCount((count) => count + 1);
    }
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
    <section aria-label={isSpotifyConnected ? (selectedPlaylist?.name || labels[list]) : 'Lo-fi library'}
      className="w-full h-full bg-[#fffdf5] flex flex-col overflow-hidden text-[#191244] select-none">
      {/* Top Header Bar */}
      <div className="h-7 bg-[#fec5db] border-b-2 border-[#191244] px-2 flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
          {selectedPlaylist ? (
            /* Selected Playlist View: Planet Icon + Name */
            <div className="flex items-center gap-1.5 min-w-0">
              <PixelSaturnIcon className="w-5 h-3.5 shrink-0" />
              <span
                className="font-pixel text-[8.5px] font-bold text-[#191244] truncate max-w-[155px]"
                title={selectedPlaylist.name}
              >
                {selectedPlaylist.name.toUpperCase()}
              </span>
            </div>
          ) : isSpotifyConnected && list === 'liked' ? (
            /* Selected Liked Songs View: Heart Icon + Name */
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[#ff7b90] text-[9px] shrink-0 font-pixel">♥</span>
              <span className="font-pixel text-[8.5px] font-bold text-[#191244] truncate max-w-[155px]">
                LIKED SONGS
              </span>
            </div>
          ) : isSpotifyConnected && list === 'queue' ? (
            /* Selected Queue View: Queue Icon + Name */
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[#191244] text-[9px] shrink-0 font-pixel">☵</span>
              <span className="font-pixel text-[8.5px] font-bold text-[#191244] truncate max-w-[155px]">
                UP NEXT
              </span>
            </div>
          ) : isSpotifyConnected ? (
            /* Root Playlists View: Clean Static Title */
            <div className="flex items-center gap-1.5 min-w-0">
              <PixelSaturnIcon className="w-5 h-3.5 shrink-0" />
              <span className="font-pixel text-[8.5px] font-bold text-[#191244] tracking-wider truncate">
                PLAYLISTS{playlists.length ? ` (${playlists.length})` : ''}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <PixelSaturnIcon className="w-5 h-3.5 shrink-0" />
              <span className="font-pixel text-[8.5px] font-bold truncate">LO-FI LIBRARY</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedPlaylist ? (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setSelectedPlaylist(null);
                setPlaylistTracks([]);
              }}
              className="w-5 h-5 flex items-center justify-center bg-[#fffdf5] border border-[#191244] text-[10px] font-pixel font-bold hover:bg-[#9df0cf] active:translate-y-0.5 transition-all cursor-pointer shadow-pixel-xs shrink-0"
              title="Back to All Playlists"
              aria-label="Back to All Playlists"
            >
              ←
            </button>
          ) : isSpotifyConnected && (list === 'liked' || list === 'queue') ? (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                selectList('playlists');
              }}
              className="w-5 h-5 flex items-center justify-center bg-[#fffdf5] border border-[#191244] text-[10px] font-pixel font-bold hover:bg-[#9df0cf] active:translate-y-0.5 transition-all cursor-pointer shadow-pixel-xs shrink-0"
              title="Back to All Playlists"
              aria-label="Back to All Playlists"
            >
              ←
            </button>
          ) : isSpotifyConnected && list === 'playlists' ? (
            <button
              type="button"
              aria-label="Refresh"
              title="Refresh"
              disabled={loading || playlistLoading}
              onClick={handleRefresh}
              className="w-5 h-5 flex items-center justify-center bg-[#fffdf5] border border-[#191244] text-[8px] font-pixel hover:bg-[#9df0cf] active:translate-y-0.5 transition-all cursor-pointer shadow-pixel-xs shrink-0"
            >
              ↻
            </button>
          ) : null}
          <button
            data-testid="toggle-cover-btn"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-5 h-5 flex items-center justify-center bg-[#fffdf5] border border-[#191244] text-[9px] font-pixel font-bold hover:bg-[#ff7b90] hover:text-[#fffdf5] active:translate-y-0.5 transition-all cursor-pointer shadow-pixel-xs shrink-0"
            title="Close Library (Return to Album Cover)"
            aria-label="Close Library"
          >
            ✕
          </button>
        </div>
      </div>

      {currentTrack && isSpotifyConnected && (
        <p className="bg-[#9df0cf] border-b-2 border-[#191244] px-2 py-1.5 font-pixel text-[8px] truncate">
          Selected in Spotify · {currentTrack.name}
        </p>
      )}
      {(status || loadError) && isSpotifyConnected && (
        <p role="status" className="bg-[#ffd269] px-2 py-1 font-pixel text-[8px]">
          {status || `Could not load ${selectedPlaylist ? selectedPlaylist.name : list === 'liked' ? 'Liked Songs' : labels[list]}. Try refreshing.`}
        </p>
      )}

      {/* Playlist Tracks Drill-Down View (When a Playlist like Bollywood is clicked) */}
      {isSpotifyConnected && selectedPlaylist ? (
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {playlistLoading && (
            <p role="status" className="p-3 font-pixel text-[8px]">Loading songs from {selectedPlaylist.name}…</p>
          )}
          {!playlistLoading && !playlistTracks.length && (
            <p className="p-3 font-pixel text-[8px]">No songs found in {selectedPlaylist.name}.</p>
          )}
            {!playlistLoading && playlistTracks.map((track, index) => {
              const isSelected = track.uri === currentTrack?.uri;
              const label = (
                <>
                  <span className="font-pixel text-[8px] text-[#4a3e77]">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-pixel text-[9px] font-bold truncate" title={track.name}>{track.name}</span>
                    <span className="block font-silkscreen text-[8px] truncate" title={track.artists?.map((a) => a.name).join(', ')}>
                      {track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                    </span>
                  </span>
                  <span className="font-silkscreen text-[8px]">
                    {track.duration_ms ? formatTime(track.duration_ms) : '▶'}
                  </span>
                </>
              );
              const rowClass = `w-full px-2 py-2 flex items-center gap-2 text-left cursor-pointer transition-colors ${
                isSelected ? 'bg-[#ffd269]' : 'hover:bg-[#fec5db]/60'
              }`;

              return (
                <div key={`${track.uri || track.id}-${index}`} className="flex border-b border-[#191244]/15">
                  <button
                    type="button"
                    aria-current={isSelected ? 'true' : undefined}
                    disabled={Boolean(pendingTrack)}
                    onClick={() => {
                      void playEntry(
                        track.uri,
                        () => playTrack(track.uri, undefined, playlistTracks.slice(index + 1).map((t) => t.uri), selectedPlaylist.uri),
                        'track'
                      );
                    }}
                    className={rowClass}
                  >
                    {label}
                  </button>
                  {track.uri && (
                    <a
                      href={getSpotifyItemUrl(track.uri)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${track.name} in Spotify`}
                      className="px-2 flex items-center text-xs hover:bg-[#fec5db]/60 cursor-pointer"
                    >
                      ↗
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
        /* Regular List View: All Playlists, Liked Songs, or Queue */
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {/* Pinned Liked Songs entry in Playlists view */}
          {isSpotifyConnected && list === 'playlists' && (
            <div className="flex border-b-2 border-[#191244]/20 bg-[#fec5db]/30 hover:bg-[#fec5db]/70 transition-colors">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  selectList('liked');
                }}
                className="w-full px-2 py-2 flex items-center gap-2 text-left cursor-pointer group"
                title="View your Liked Songs"
              >
                <span className="font-pixel text-[9px] text-[#ff7b90] group-hover:scale-110 transition-transform">♥</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-pixel text-[9px] font-bold text-[#191244] truncate">Liked Songs</span>
                  <span className="block font-silkscreen text-[7.5px] text-[#4a3e77] truncate">
                    Auto Playlist · {tracks.length ? `${tracks.length} tracks` : 'Your saved tracks'}
                  </span>
                </span>
                <span className="font-pixel text-[8px] text-[#191244] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">➔</span>
              </button>
            </div>
          )}


          {loading && !entries.length && <p role="status" className="p-3 font-pixel text-[8px]">Loading…</p>}
          {!loading && !loadError && !entries.length && (
            <p className="p-3 font-pixel text-[8px]">
              {list === 'playlists' ? 'Save or create a playlist in Spotify to see it here.'
                : list === 'liked' ? 'Like a track in Spotify to see it here.' : 'The Spotify queue is empty.'}
            </p>
          )}
          {entries.map((entry, index) => {
            const playlistObj = isSpotifyConnected && list === 'playlists' ? playlists[index] : null;
            const label = (
              <>
                <span className="font-pixel text-[8px] text-[#4a3e77]">{String(index + 1).padStart(2, '0')}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-pixel text-[9px] font-bold truncate" title={entry.name}>{entry.name}</span>
                  <span className="block font-silkscreen text-[8px] truncate" title={entry.artist}>{entry.artist}</span>
                </span>
                {list === 'playlists' ? (
                  <span className="font-pixel text-[8px] text-[#191244] opacity-50 group-hover:opacity-100 transition-opacity">➔</span>
                ) : (
                  <span className="font-silkscreen text-[8px]">{entry.duration === null ? '▶' : formatTime(entry.duration)}</span>
                )}
              </>
            );
            const rowClass = `flex-1 px-2 py-2 flex items-center gap-2 text-left ${entry.selected ? 'bg-[#ffd269]' : 'hover:bg-[#fec5db]/60'} cursor-pointer group min-w-0`;

            return (
              <div key={`${entry.id}-${index}`} className="flex border-b border-[#191244]/15">
                {isSpotifyConnected && list === 'queue' ? (
                  <div className={`w-full px-2 py-2 flex items-center gap-2 text-left ${entry.selected ? 'bg-[#ffd269]' : ''}`}>{label}</div>
                ) : (
                  <button
                    type="button"
                    aria-current={entry.selected ? 'true' : undefined}
                    disabled={Boolean(pendingTrack)}
                    aria-label={isSpotifyConnected && list === 'playlists' ? `Open ${entry.name}` : undefined}
                    onClick={() => {
                      if (!isSpotifyConnected) onBuiltinSelect(index);
                      else if (list === 'playlists' && playlistObj) openPlaylist(playlistObj);
                      else if (list === 'liked') void playEntry(entry.id, () => playLikedSong(entry.id, undefined, tracks.slice(index + 1).map(({ uri }) => uri)), 'track');
                      else void playEntry(entry.id, () => playTrack(entry.id, undefined, tracks.slice(index + 1).map(({ uri }) => uri)), 'track');
                    }}
                    className={rowClass}
                  >
                    {label}
                  </button>
                )}
                {/* Immediate Play Button for Playlist */}
                {isSpotifyConnected && list === 'playlists' && playlistObj && (
                  <button
                    type="button"
                    title={`Play ${entry.name} now`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void playEntry(playlistObj.uri, () => playPlaylist(playlistObj.uri), 'playlist');
                    }}
                    className="px-2 flex items-center text-[9px] text-[#191244] hover:bg-[#9df0cf] active:scale-95 transition-all cursor-pointer"
                  >
                    ▶
                  </button>
                )}
                {entry.url && (
                  <a href={entry.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${entry.name} in Spotify`}
                    className="px-2 flex items-center text-xs hover:bg-[#fec5db]/60 cursor-pointer">↗</a>
                )}
              </div>
            );
          })}
          {isSpotifyConnected && list === 'playlists' && nextOffset !== null && (
            <button type="button" disabled={loading} onClick={() => {
              if (loadError && playlistOffset === nextOffset) setRefreshCount((count) => count + 1);
              else setPlaylistOffset(nextOffset);
            }} className="w-full px-2 py-2 font-pixel text-[8px] underline cursor-pointer">
              {loading ? 'Loading…' : loadError ? 'Retry loading playlists' : 'Load more playlists'}
            </button>
          )}
        </div>
      )}

      {isSpotifyConnected && (
        <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer"
          className="self-start px-2 py-1 font-pixel text-[8px] text-[#191244] hover:underline opacity-70 hover:opacity-100" title="Open Spotify">
          OPEN SPOTIFY ↗
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
