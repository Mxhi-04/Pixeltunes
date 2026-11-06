import React, { useState, useEffect, useCallback } from 'react';
import { getQueue, playTrack, playPlaylist, getUserPlaylists, getPlaylistTracks } from '../services/spotify';
import { playClickSound } from '../services/soundEffects';

interface RetroQueueViewProps {
  isSpotifyConnected: boolean;
  onClose: () => void;
  onOpenSpotifyModal?: () => void;
  onTrackPlayed?: (track?: any) => void;
  currentTrackTitle?: string;
}

export const RetroQueueView: React.FC<RetroQueueViewProps> = ({
  isSpotifyConnected,
  onClose,
  onOpenSpotifyModal,
  onTrackPlayed,
  currentTrackTitle,
}) => {
  const [queueTracks, setQueueTracks] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('pixeltunes_cached_playlist');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [currentlyPlaying, setCurrentlyPlaying] = useState<any | null>(() => {
    try {
      const cached = localStorage.getItem('pixeltunes_last_spotify_track');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [activePlayingUri, setActivePlayingUri] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    if (!isSpotifyConnected) return;
    try {
      const data = await getQueue();
      if (data.currentlyPlaying) {
        setCurrentlyPlaying(data.currentlyPlaying);
        try {
          localStorage.setItem('pixeltunes_last_spotify_track', JSON.stringify(data.currentlyPlaying));
        } catch {}
      }

      if (data.queue && data.queue.length > 0) {
        setQueueTracks(data.queue);
        try {
          localStorage.setItem('pixeltunes_cached_playlist', JSON.stringify(data.queue));
        } catch {}
      } else {
        // If Spotify temporarily reports an empty queue during playback transition,
        // keep the existing/cached tracks so the UI doesn't glitch or flash "PLAYLIST IS EMPTY"
        setQueueTracks((prev) => {
          if (prev && prev.length > 0) return prev;
          try {
            const cached = localStorage.getItem('pixeltunes_cached_playlist');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
          } catch {}
          return [];
        });
      }
    } catch (e) {
      console.error('Failed to fetch Spotify queue:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isSpotifyConnected]);

  // Initial fetch & refetch on song title change
  useEffect(() => {
    setIsLoading(true);
    fetchQueue();
  }, [fetchQueue, currentTrackTitle]);

  // Fallback: if queue is empty on initial load, fetch user's first playlist
  useEffect(() => {
    if (!isSpotifyConnected) return;
    if (queueTracks.length === 0) {
      (async () => {
        try {
          const playlists = await getUserPlaylists(1);
          if (playlists && playlists.length > 0 && playlists[0]?.id) {
            const tracks = await getPlaylistTracks(playlists[0].id, 25);
            if (tracks && tracks.length > 0) {
              setQueueTracks((prev) => (prev.length === 0 ? tracks : prev));
              try {
                localStorage.setItem('pixeltunes_cached_playlist', JSON.stringify(tracks));
              } catch {}
            }
          }
        } catch {}
      })();
    }
  }, [isSpotifyConnected, queueTracks.length]);

  // Periodic polling to keep playlist in sync with Spotify
  useEffect(() => {
    if (!isSpotifyConnected) return;
    const interval = setInterval(() => {
      fetchQueue();
    }, 3500);
    return () => clearInterval(interval);
  }, [isSpotifyConnected, fetchQueue]);

  const handlePlaySong = async (track: any) => {
    playClickSound();
    setActivePlayingUri(track.uri);
    setCurrentlyPlaying(track);
    setStatusMsg(`▶ Playing: ${track.name.slice(0, 16)}...`);

    // Instantly notify parent RetroWindow to display this song on Pixeltunes
    if (onTrackPlayed) {
      onTrackPlayed(track);
    }
    try {
      localStorage.setItem('pixeltunes_last_spotify_track', JSON.stringify(track));
    } catch {}

    // Find subsequent tracks in current playlist to pass to Spotify so queue is preserved
    const trackIdx = queueTracks.findIndex(
      (t) => (t.id && t.id === track.id) || (t.uri && t.uri === track.uri)
    );
    let remainingUris: string[] = [];
    if (trackIdx !== -1) {
      remainingUris = queueTracks
        .slice(trackIdx + 1)
        .map((t) => t.uri)
        .filter(Boolean);
    }

    const success = await playTrack(track.uri, undefined, remainingUris);
    if (success) {
      setTimeout(() => {
        setStatusMsg(null);
        fetchQueue();
      }, 1500);
    } else {
      setStatusMsg('Active device needed');
      setTimeout(() => setStatusMsg(null), 2200);
    }
  };

  const handleStartPopularPlaylist = async () => {
    playClickSound();
    setStatusMsg('▶ Starting Today\'s Top Hits...');
    setIsLoading(true);
    const ok = await playPlaylist('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M');
    if (ok) {
      if (onTrackPlayed) onTrackPlayed();
      setTimeout(() => {
        setStatusMsg(null);
        fetchQueue();
      }, 1200);
    } else {
      setStatusMsg('Please open Spotify app');
      setIsLoading(false);
      setTimeout(() => setStatusMsg(null), 2500);
    }
  };

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full h-full bg-[#fffdf5] flex flex-col overflow-hidden text-[#191244] select-none">
      {/* Top Header Bar */}
      <div className="h-7 bg-[#fec5db] border-b-2 border-[#191244] px-2 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px]">♫</span>
          <span className="font-pixel text-[8px] font-bold tracking-wider text-[#191244] truncate">
            PLAYLIST {queueTracks.length > 0 ? `(${queueTracks.length})` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Refresh Playlist Button */}
          <button
            onClick={() => {
              playClickSound();
              setIsLoading(true);
              fetchQueue();
            }}
            disabled={isLoading}
            title="Refresh Playlist"
            className="w-4 h-4 bg-[#fffdf5] border border-[#191244] text-[9px] font-pixel flex items-center justify-center hover:bg-[#ffd269] active:translate-y-0.5 cursor-pointer font-bold leading-none disabled:opacity-50"
          >
            ↻
          </button>

          {/* Switch to Album Cover Button */}
          <button
            data-testid="toggle-cover-btn"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            title="Return to Album Cover"
            className="px-1.5 py-0.5 bg-[#fffdf5] border border-[#191244] text-[7px] font-pixel flex items-center gap-1 hover:bg-[#ff7b90] active:translate-y-0.5 cursor-pointer font-bold leading-none"
          >
            <span>🖼</span>
            <span>COVER</span>
          </button>
        </div>
      </div>

      {/* Mini Status Toast */}
      {statusMsg && (
        <div className="bg-[#ffd269] px-2 py-0.5 text-[7px] font-pixel text-center border-b border-[#191244] truncate animate-pulse shrink-0">
          {statusMsg}
        </div>
      )}

      {/* Main Content Area */}
      {isSpotifyConnected ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Currently Playing Pinned Row */}
          {currentlyPlaying && (
            <div className="bg-[#9df0cf] border-b-2 border-[#191244] px-2 py-1.5 shrink-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-pixel text-[6.5px] font-bold text-[#191244] tracking-wider">
                  ▶ NOW PLAYING:
                </span>
                {currentlyPlaying.duration_ms && (
                  <span className="font-silkscreen text-[6.5px] font-bold text-[#191244]/80">
                    {formatMs(currentlyPlaying.duration_ms)}
                  </span>
                )}
              </div>
              <div className="font-pixel text-[8px] font-bold truncate text-[#191244]">
                {currentlyPlaying.name}
              </div>
              <div className="font-silkscreen text-[7px] text-[#191244]/80 truncate">
                {currentlyPlaying.artists?.map((a: any) => a.name).join(', ')}
              </div>
            </div>
          )}

          {/* Scrollable Tracks List */}
          <div
            className="flex-1 overflow-y-auto min-h-0 divide-y divide-[#191244]/15 bg-[#fffdf5]"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#191244 #ffe6f0',
            }}
          >
            {isLoading && queueTracks.length === 0 ? (
              <div className="flex items-center justify-center h-full py-12 text-center">
                <span className="font-pixel text-[8px] text-[#191244]/70 animate-pulse">
                  LOADING PLAYLIST...
                </span>
              </div>
            ) : queueTracks.length > 0 ? (
              queueTracks.map((track, i) => {
                const isSelected =
                  activePlayingUri === track.uri ||
                  currentlyPlaying?.uri === track.uri ||
                  (currentlyPlaying?.name && currentlyPlaying?.name === track.name);
                return (
                  <div
                    key={`${track.id || track.uri}-${i}`}
                    onClick={() => handlePlaySong(track)}
                    className={`px-2 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-[#ffd269]'
                        : 'hover:bg-[#fec5db]/45 bg-[#fffdf5]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="font-pixel text-[7px] text-[#8fa2d4] w-3.5 shrink-0 text-left">
                        {i + 1 < 10 ? `0${i + 1}` : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-pixel text-[7.5px] font-bold truncate text-[#191244] group-hover:text-[#ff7b90] transition-colors">
                          {track.name}
                        </div>
                        <div className="font-silkscreen text-[6.5px] text-[#191244]/70 truncate">
                          {track.artists?.map((a: any) => a.name).join(', ')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-silkscreen text-[6.5px] text-[#191244]/60">
                        {track.duration_ms ? formatMs(track.duration_ms) : ''}
                      </span>
                      <span className="font-pixel text-[7px] text-[#191244] opacity-0 group-hover:opacity-100 transition-opacity">
                        ▶
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center space-y-2 py-10">
                <div className="font-pixel text-[8px] text-[#191244] font-bold">
                  PLAYLIST IS EMPTY
                </div>
                <div className="font-silkscreen text-[7px] text-[#191244]/75 leading-relaxed">
                  Play a playlist or album in Spotify to view songs here!
                </div>
                <div className="pt-2 flex flex-col items-center gap-1.5">
                  <button
                    onClick={handleStartPopularPlaylist}
                    className="px-2.5 py-1 bg-[#9df0cf] text-[#191244] border-2 border-[#191244] font-pixel text-[7.5px] hover:bg-white active:translate-y-0.5 font-bold cursor-pointer shadow-pixel-sm"
                  >
                    ▶ PLAY POPULAR HITS
                  </button>
                  <button
                    onClick={() => {
                      playClickSound();
                      onClose();
                    }}
                    className="px-2 py-0.5 bg-[#fffdf5] border border-[#191244] font-pixel text-[7px] hover:bg-[#fec5db] cursor-pointer"
                  >
                    🖼 VIEW COVER
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Disconnected State */
        <div className="flex-1 flex flex-col items-center justify-center p-3 text-center space-y-2.5">
          <div className="font-pixel text-[8px] text-[#191244] font-bold">
            SPOTIFY OFFLINE
          </div>
          <p className="font-silkscreen text-[7px] text-[#191244]/75 leading-relaxed">
            Connect Spotify to view and control your playlist.
          </p>
          {onOpenSpotifyModal && (
            <button
              onClick={() => {
                playClickSound();
                onOpenSpotifyModal();
              }}
              className="px-2 py-1 bg-[#9df0cf] text-[#191244] border-2 border-[#191244] font-pixel text-[7.5px] hover:bg-white active:translate-y-0.5 font-bold cursor-pointer shadow-pixel-sm"
            >
              + CONNECT SPOTIFY
            </button>
          )}
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="px-2 py-0.5 bg-[#fffdf5] border border-[#191244] font-pixel text-[7px] hover:bg-[#fec5db] cursor-pointer"
          >
            🖼 RETURN TO COVER
          </button>
        </div>
      )}
    </div>
  );
};

export default RetroQueueView;
