import React, { useState, useEffect } from 'react';
import { BUILTIN_TRACKS } from '../../shared/services/lofiAudio';
import { searchTracks, getQueue, playTrack } from '../services/spotify';
import { playClickSound } from '../../shared/services/soundEffects';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSpotifyConnected: boolean;
  currentTrackTitle?: string;
  onSelectBuiltinTrack: (index: number) => void;
  builtinCurrentIndex: number;
  onOpenSpotifyModal: () => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  isSpotifyConnected,
  currentTrackTitle = '',
  onSelectBuiltinTrack,
  builtinCurrentIndex,
  onOpenSpotifyModal,
}) => {
  const [activeTab, setActiveTab] = useState<'spotify' | 'queue' | 'builtin'>(
    isSpotifyConnected ? 'spotify' : 'builtin'
  );
  
  // Spotify Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Spotify Queue State
  const [queueTracks, setQueueTracks] = useState<any[]>([]);
  const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState<any | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  // Status message for feedback
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Sync tab on Spotify connection change
  useEffect(() => {
    if (isSpotifyConnected && activeTab === 'builtin') {
      setActiveTab('spotify');
    } else if (!isSpotifyConnected) {
      setActiveTab('builtin');
    }
  }, [isSpotifyConnected]);

  // Initial popular search when Spotify is connected
  useEffect(() => {
    if (isOpen && isSpotifyConnected && searchResults.length === 0 && !searchQuery) {
      executeSearch('lofi jazz chill');
    }
  }, [isOpen, isSpotifyConnected]);

  // Load Queue when Queue tab selected
  useEffect(() => {
    if (isOpen && activeTab === 'queue' && isSpotifyConnected) {
      loadQueue();
    }
  }, [isOpen, activeTab, isSpotifyConnected]);

  const loadQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const q = await getQueue();
      setCurrentlyPlayingTrack(q.currentlyPlaying);
      setQueueTracks(q.queue);
    } catch (e) {
      // ignore
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const executeSearch = async (term: string) => {
    if (!term.trim()) return;
    setIsSearching(true);
    try {
      const tracks = await searchTracks(term, 20);
      setSearchResults(tracks);
    } catch (e) {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  const handlePlaySpotifySong = async (track: any) => {
    playClickSound();
    setStatusMsg(`Playing: ${track.name}...`);
    const ok = await playTrack(track.uri);
    if (ok) {
      setTimeout(() => {
        setStatusMsg(null);
        onClose();
      }, 600);
    } else {
      setStatusMsg('Playback started or active device needed');
      setTimeout(() => setStatusMsg(null), 2500);
    }
  };

  const handleSelectBuiltin = (index: number) => {
    playClickSound();
    onSelectBuiltinTrack(index);
    setStatusMsg(`Selected: ${BUILTIN_TRACKS[index].name}`);
    setTimeout(() => {
      setStatusMsg(null);
      onClose();
    }, 400);
  };

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
      <div className="w-[460px] max-h-[360px] bg-[#fffdf5] border-4 border-[#191244] shadow-pixel flex flex-col overflow-hidden text-[#191244]">
        
        {/* Modal Title Bar */}
        <div className="h-7 bg-[#fec5db] border-b-2 border-[#191244] px-2.5 flex items-center justify-between select-none shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">♫</span>
            <span className="font-pixel text-[10px] font-bold tracking-wider text-[#191244]">
              PLAYLIST & TRACK SELECTOR
            </span>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-4 h-4 bg-[#fffdf5] border border-[#191244] text-[9px] font-pixel flex items-center justify-center hover:bg-[#ff7b90] active:translate-y-0.5 cursor-pointer font-bold leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center border-b-2 border-[#191244] bg-[#ffe6f0] shrink-0 font-pixel text-[8px]">
          {isSpotifyConnected && (
            <>
              <button
                onClick={() => {
                  playClickSound();
                  setActiveTab('spotify');
                }}
                className={`flex-1 py-1.5 text-center border-r border-[#191244] transition-colors cursor-pointer ${
                  activeTab === 'spotify'
                    ? 'bg-[#fffdf5] font-bold text-[#191244]'
                    : 'text-[#191244]/70 hover:bg-white/50'
                }`}
              >
                🔍 SPOTIFY SEARCH
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  setActiveTab('queue');
                }}
                className={`flex-1 py-1.5 text-center border-r border-[#191244] transition-colors cursor-pointer ${
                  activeTab === 'queue'
                    ? 'bg-[#fffdf5] font-bold text-[#191244]'
                    : 'text-[#191244]/70 hover:bg-white/50'
                }`}
              >
                ≡ QUEUE
              </button>
            </>
          )}

          <button
            onClick={() => {
              playClickSound();
              setActiveTab('builtin');
            }}
            className={`flex-1 py-1.5 text-center transition-colors cursor-pointer ${
              activeTab === 'builtin'
                ? 'bg-[#fffdf5] font-bold text-[#191244]'
                : 'text-[#191244]/70 hover:bg-white/50'
            }`}
          >
            💾 8-BIT LO-FI
          </button>
        </div>

        {/* Status toast message */}
        {statusMsg && (
          <div className="bg-[#9df0cf] px-2 py-1 text-[8px] font-pixel text-center border-b border-[#191244] animate-pulse">
            {statusMsg}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-2.5 min-h-0 space-y-2">
          
          {/* TAB 1: SPOTIFY SEARCH & SONGS */}
          {activeTab === 'spotify' && isSpotifyConnected && (
            <div className="space-y-2">
              {/* Search input form */}
              <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search songs, artists, lofi..."
                  className="flex-1 px-2 py-1 bg-white border-2 border-[#191244] text-[9px] font-silkscreen focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-2.5 py-1 bg-[#ffd269] text-[#191244] border-2 border-[#191244] font-pixel text-[8px] hover:bg-[#ffe399] active:translate-y-0.5 cursor-pointer font-bold"
                >
                  {isSearching ? '...' : 'FIND'}
                </button>
              </form>

              {/* Quick genre search tags */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                <span className="font-pixel text-[7px] text-[#8fa2d4] shrink-0">QUICK:</span>
                {['Lofi Beats', 'Pixel Art', 'Synthwave', 'Chill Jazz', 'Pop Hits'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSearchQuery(tag);
                      executeSearch(tag);
                    }}
                    className="px-1.5 py-0.5 bg-[#fec5db] text-[#191244] border border-[#191244] text-[7px] font-pixel hover:bg-[#ffd269] shrink-0 cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Song list */}
              <div className="space-y-1">
                {searchResults.map((track) => {
                  const isCurrent = currentTrackTitle && track.name.toLowerCase() === currentTrackTitle.toLowerCase();
                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlaySpotifySong(track)}
                      className={`p-1.5 border border-[#191244] flex items-center justify-between gap-2 hover:bg-[#fec5db]/40 transition-colors cursor-pointer ${
                        isCurrent ? 'bg-[#9df0cf]/40 border-2' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {track.album?.images?.[2]?.url ? (
                          <img
                            src={track.album.images[2].url}
                            alt=""
                            className="w-7 h-7 border border-[#191244] object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 bg-[#8fa2d4] border border-[#191244] flex items-center justify-center text-[8px] shrink-0">
                            ♫
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-pixel text-[9px] font-bold truncate text-[#191244]">
                            {track.name}
                          </div>
                          <div className="font-silkscreen text-[8px] text-[#191244]/75 truncate">
                            {track.artists?.map((a: any) => a.name).join(', ')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-silkscreen text-[8px] text-[#191244]/60">
                          {formatMs(track.duration_ms)}
                        </span>
                        <button
                          type="button"
                          className="px-1.5 py-0.5 bg-[#9df0cf] text-[#191244] border border-[#191244] font-pixel text-[7px] hover:bg-white font-bold"
                        >
                          {isCurrent ? '▶ PLAYING' : '▶ PLAY'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-6 font-silkscreen text-[9px] text-[#191244]/60">
                    Type a song name above and hit FIND to search Spotify!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SPOTIFY QUEUE */}
          {activeTab === 'queue' && isSpotifyConnected && (
            <div className="space-y-2">
              {currentlyPlayingTrack && (
                <div className="p-2 bg-[#9df0cf]/40 border-2 border-[#191244]">
                  <div className="font-pixel text-[7px] text-[#191244] font-bold mb-1">
                    NOW PLAYING:
                  </div>
                  <div className="font-pixel text-[9px] truncate font-bold">
                    {currentlyPlayingTrack.name}
                  </div>
                  <div className="font-silkscreen text-[8px] text-[#191244]/70">
                    {currentlyPlayingTrack.artists?.map((a: any) => a.name).join(', ')}
                  </div>
                </div>
              )}

              <div className="font-pixel text-[8px] text-[#191244] font-bold pt-1">
                UPCOMING QUEUE ({queueTracks.length}):
              </div>

              <div className="space-y-1">
                {queueTracks.map((track, i) => (
                  <div
                    key={`${track.id}-${i}`}
                    onClick={() => handlePlaySpotifySong(track)}
                    className="p-1.5 bg-white border border-[#191244] flex items-center justify-between gap-2 hover:bg-[#fec5db]/40 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-pixel text-[8px] text-[#8fa2d4] w-4 shrink-0">
                        {i + 1 < 10 ? `0${i + 1}` : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-pixel text-[9px] font-bold truncate">
                          {track.name}
                        </div>
                        <div className="font-silkscreen text-[8px] text-[#191244]/75 truncate">
                          {track.artists?.map((a: any) => a.name).join(', ')}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-1.5 py-0.5 bg-[#ffd269] text-[#191244] border border-[#191244] font-pixel text-[7px] hover:bg-white font-bold shrink-0"
                    >
                      ▶ JUMP
                    </button>
                  </div>
                ))}

                {queueTracks.length === 0 && !isLoadingQueue && (
                  <div className="text-center py-6 font-silkscreen text-[9px] text-[#191244]/60">
                    Queue is currently empty. Play a song from Spotify to load queue!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: BUILT-IN 8-BIT LO-FI TRACKS */}
          {activeTab === 'builtin' && (
            <div className="space-y-1.5">
              <div className="text-[8px] font-pixel text-[#8fa2d4] mb-1">
                RETRO 8-BIT SYNTHESIZER PLAYLIST:
              </div>
              {BUILTIN_TRACKS.map((track, idx) => {
                const isActive = !isSpotifyConnected && builtinCurrentIndex === idx;
                return (
                  <div
                    key={track.id}
                    onClick={() => handleSelectBuiltin(idx)}
                    className={`p-2 border-2 border-[#191244] flex items-center justify-between gap-2 hover:bg-[#fec5db] transition-colors cursor-pointer ${
                      isActive ? 'bg-[#9df0cf] shadow-pixel-sm' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-6 h-6 bg-[#191244] text-[#ffd269] font-pixel text-[9px] flex items-center justify-center shrink-0">
                        {isActive ? '▶' : `0${idx + 1}`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-pixel text-[10px] font-bold truncate text-[#191244]">
                          {track.name}
                        </div>
                        <div className="font-silkscreen text-[9px] text-[#191244]/75 truncate">
                          {track.artist} • {track.album}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-silkscreen text-[9px] font-bold text-[#191244]">
                        {formatSec(track.duration)}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-0.5 bg-[#fffdf5] text-[#191244] border border-[#191244] font-pixel text-[8px] hover:bg-white font-bold"
                      >
                        {isActive ? 'CURRENT' : 'SELECT'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {!isSpotifyConnected && (
                <div className="mt-3 p-2 bg-[#ffe6f0] border-2 border-[#191244] text-center">
                  <div className="font-pixel text-[8px] text-[#191244] mb-1">
                    WANT MILLIONS OF SONGS & PLAYLISTS?
                  </div>
                  <button
                    onClick={() => {
                      playClickSound();
                      onClose();
                      onOpenSpotifyModal();
                    }}
                    className="px-3 py-1 bg-[#9df0cf] text-[#191244] border-2 border-[#191244] font-pixel text-[8px] hover:bg-white font-bold shadow-pixel-sm cursor-pointer"
                  >
                    + CONNECT SPOTIFY ACCOUNT
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-2 border-t-2 border-[#191244] bg-[#ffe6f0] flex justify-between items-center text-[8px] font-pixel shrink-0">
          <span className="text-[#191244]/70">
            {isSpotifyConnected ? 'SPOTIFY SYNCED' : 'BUILT-IN SYNTH MODE'}
          </span>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="px-3 py-1 bg-[#fffdf5] text-[#191244] border border-[#191244] hover:bg-white font-bold cursor-pointer"
          >
            CLOSE
          </button>
        </div>

      </div>
    </div>
  );
};

