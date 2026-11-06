import React, { useState, useEffect, useCallback } from 'react';
import { PixelSaturnIcon } from './PixelSaturnIcon';
import {
  getCurrentlyPlaying,
  playTrack,
  getLikedSongs,
} from '../services/spotify';
import { playClickSound } from '../services/soundEffects';

interface RetroQueueViewProps {
  isSpotifyConnected: boolean;
  onClose: () => void;
  onOpenSpotifyModal?: () => void;
  onTrackPlayed?: (track?: any) => void;
  currentTrackTitle?: string;
  initialLikedTrack?: any;
  initialLikedList?: any[];
}

export const RetroQueueView: React.FC<RetroQueueViewProps> = ({
  isSpotifyConnected,
  onClose,
  onOpenSpotifyModal,
  onTrackPlayed,
  currentTrackTitle,
  initialLikedTrack,
  initialLikedList,
}) => {
  // Master list of user's Liked Songs - playlist is strictly limited to Liked Songs
  const [allLikedTracks, setAllLikedTracks] = useState<any[]>(() => {
    if (initialLikedList && initialLikedList.length > 0) {
      return initialLikedList;
    }
    try {
      const cached = localStorage.getItem('pixeltunes_liked_songs_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    return [];
  });

  const [queueTracks, setQueueTracks] = useState<any[]>(() => {
    if (initialLikedList && initialLikedList.length > 0) {
      return initialLikedList;
    }
    try {
      const cached = localStorage.getItem('pixeltunes_liked_songs_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    return [];
  });

  const [currentlyPlaying, setCurrentlyPlaying] = useState<any | null>(() => {
    if (initialLikedTrack) return initialLikedTrack;
    if (initialLikedList && initialLikedList.length > 0) return initialLikedList[0];
    try {
      const stored = localStorage.getItem('pixeltunes_last_spotify_track');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [activePlayingUri, setActivePlayingUri] = useState<string | null>(null);

  // Sync when initialLikedList updates
  useEffect(() => {
    if (initialLikedList && initialLikedList.length > 0) {
      setAllLikedTracks(initialLikedList);
      setQueueTracks(initialLikedList);
      if (initialLikedTrack) {
        setCurrentlyPlaying(initialLikedTrack);
      } else {
        setCurrentlyPlaying(initialLikedList[0]);
      }
    }
  }, [initialLikedList, initialLikedTrack]);

  // Fetch strictly and ONLY Liked Songs - never switch to song author or album!
  const fetchQueue = useCallback(async () => {
    if (!isSpotifyConnected) return;
    try {
      // 1. Sync currently playing track
      const current = await getCurrentlyPlaying().catch(() => null);
      if (current?.item) {
        setCurrentlyPlaying(current.item);
        try {
          localStorage.setItem('pixeltunes_last_spotify_track', JSON.stringify(current.item));
        } catch {}
      }

      // 2. Fetch authoritative Liked Songs playlist
      const liked = await getLikedSongs(50);
      if (liked && liked.length > 0) {
        setAllLikedTracks(liked);
        setQueueTracks(liked);
        try {
          localStorage.setItem('pixeltunes_liked_songs_cache', JSON.stringify(liked));
        } catch {}
        return;
      }

      // 3. Fallback to cache if network is slow/offline
      try {
        const cached = localStorage.getItem('pixeltunes_liked_songs_cache');
        if (cached) {
          const list = JSON.parse(cached);
          if (list.length > 0) {
            setAllLikedTracks(list);
            setQueueTracks(list);
            return;
          }
        }
      } catch {}
    } catch (e) {
      console.error('Failed to fetch Liked Songs queue:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isSpotifyConnected]);

  // Initial fetch & refetch on song title change
  useEffect(() => {
    setIsLoading(true);
    fetchQueue();
  }, [fetchQueue, currentTrackTitle]);

  // Periodic polling to keep Liked Songs list fresh
  useEffect(() => {
    if (!isSpotifyConnected) return;
    const interval = setInterval(() => {
      fetchQueue();
    }, 4000);
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

    // Find subsequent tracks in Liked Songs to queue up
    const trackList = allLikedTracks.length > 0 ? allLikedTracks : queueTracks;
    const trackIdx = trackList.findIndex(
      (t) => (t.id && t.id === track.id) || (t.uri && t.uri === track.uri)
    );
    const subsequentTracks = trackIdx !== -1
      ? trackList.slice(trackIdx + 1)
      : trackList.filter((t) => t.uri !== track.uri);
    const remainingUris = subsequentTracks.map((t) => t.uri).filter(Boolean);

    // Play silently via Web API (never pop up Spotify window)
    const success = await playTrack(track.uri, undefined, remainingUris);
    if (success) {
      setTimeout(() => {
        setStatusMsg(null);
      }, 1500);
    } else {
      setStatusMsg('Starting playback...');
      setTimeout(() => {
        setStatusMsg(null);
      }, 2000);
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
          <PixelSaturnIcon className="w-5 h-3.5 shrink-0" fill="#191244" />
          <span className="font-pixel text-[8px] font-bold tracking-wider text-[#191244] truncate">
            LIKED SONGS {allLikedTracks.length > 0 ? `(${allLikedTracks.length})` : queueTracks.length > 0 ? `(${queueTracks.length})` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
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
                  NO LIKED SONGS FOUND
                </div>
                <div className="font-silkscreen text-[7px] text-[#191244]/75 leading-relaxed">
                  Like songs in Spotify to see and control them here!
                </div>
                <div className="pt-2 flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => {
                      playClickSound();
                      setIsLoading(true);
                      fetchQueue();
                    }}
                    className="px-2.5 py-1 bg-[#9df0cf] text-[#191244] border-2 border-[#191244] font-pixel text-[7.5px] hover:bg-white active:translate-y-0.5 font-bold cursor-pointer shadow-pixel-sm"
                  >
                    ↻ RELOAD LIKED SONGS
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
