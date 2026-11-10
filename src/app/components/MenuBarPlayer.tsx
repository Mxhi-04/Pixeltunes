import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  ChevronDown,
  ChevronUp,
  Music,
} from 'lucide-react';
import { getQueue, playTrack } from '../services/spotify';
import { BUILTIN_TRACKS } from '../../shared/services/lofiAudio';
import type { SpotifyTrack } from '../../types/spotify';

export interface SharedPlaybackState {
  title: string;
  artist: string;
  album: string;
  artworkUrl?: string;
  durationMs: number;
  progressMs: number;
  isPlaying: boolean;
  volumePercent: number;
  shuffleState: boolean;
  repeatState: 'off' | 'track' | 'context';
  isSpotifyConnected: boolean;
}

function formatTime(ms: number): string {
  if (!ms || isNaN(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function MenuBarPlayer() {
  const [state, setState] = useState<SharedPlaybackState>({
    title: 'PixelTunes',
    artist: 'Ready to Play',
    album: 'Lo-Fi Moonlight',
    artworkUrl: '',
    durationMs: 184000,
    progressMs: 0,
    isPlaying: false,
    volumePercent: 80,
    shuffleState: false,
    repeatState: 'off',
    isSpotifyConnected: false,
  });

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [queueTracks, setQueueTracks] = useState<SpotifyTrack[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  // Synchronize state via Electron IPC bridge
  useEffect(() => {
    const unsubSync = window.electronAPI?.onPlaybackStateSync?.((freshState) => {
      setState((prev) => ({
        ...prev,
        ...freshState,
      }));
    });

    return () => {
      unsubSync?.();
    };
  }, []);

  // Update window height when queue expands/collapses
  useEffect(() => {
    const targetHeight = isQueueOpen ? 460 : 210;
    window.electronAPI?.setPopoverHeight?.(targetHeight);
  }, [isQueueOpen]);

  // Load upcoming queue when drawer is opened
  useEffect(() => {
    if (!isQueueOpen) return;

    if (state.isSpotifyConnected) {
      setIsLoadingQueue(true);
      getQueue()
        .then((data) => {
          if (data?.queue && data.queue.length > 0) {
            const tracksOnly = (data.queue || []).filter((item): item is SpotifyTrack => Boolean(item && 'artists' in item && item.artists));
            setQueueTracks(tracksOnly.slice(0, 8));
          } else {
            setQueueTracks([]);
          }
        })
        .catch(() => {
          setQueueTracks([]);
        })
        .finally(() => {
          setIsLoadingQueue(false);
        });
    }
  }, [isQueueOpen, state.isSpotifyConnected, state.title]);

  // Progress interpolation when playing
  useEffect(() => {
    if (!state.isPlaying || isScrubbing) return;
    const interval = window.setInterval(() => {
      setState((prev) => {
        if (!prev.isPlaying || prev.progressMs >= prev.durationMs) return prev;
        return { ...prev, progressMs: Math.min(prev.durationMs, prev.progressMs + 500) };
      });
    }, 500);
    return () => clearInterval(interval);
  }, [state.isPlaying, isScrubbing]);

  const handleTogglePlay = () => {
    window.electronAPI?.sendPlaybackAction?.('toggle');
    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleNext = () => {
    window.electronAPI?.sendPlaybackAction?.('next');
  };

  const handlePrev = () => {
    window.electronAPI?.sendPlaybackAction?.('previous');
  };

  const handleSeekCommit = (posMs: number) => {
    setIsScrubbing(false);
    setState((prev) => ({ ...prev, progressMs: posMs }));
    window.electronAPI?.sendPlaybackAction?.('seek', { positionMs: posMs });
  };

  const handleVolumeChange = (volPercent: number) => {
    setState((prev) => ({ ...prev, volumePercent: volPercent }));
    window.electronAPI?.sendPlaybackAction?.('volume', { volumePercent: volPercent });
  };

  const handleToggleShuffle = () => {
    const next = !state.shuffleState;
    setState((prev) => ({ ...prev, shuffleState: next }));
    window.electronAPI?.sendPlaybackAction?.('shuffle', { state: next });
  };

  const handleCycleRepeat = () => {
    const next = state.repeatState === 'off' ? 'context' : state.repeatState === 'context' ? 'track' : 'off';
    setState((prev) => ({ ...prev, repeatState: next }));
    window.electronAPI?.sendPlaybackAction?.('repeat', { state: next });
  };

  const handlePlayQueueTrack = (uri?: string) => {
    if (uri) {
      void playTrack(uri);
    }
  };

  const currentProgress = isScrubbing ? scrubValue : state.progressMs;
  const progressPercent = state.durationMs > 0 ? Math.min(100, Math.max(0, (currentProgress / state.durationMs) * 100)) : 0;

  return (
    <div
      className="w-full h-full select-none overflow-hidden font-sans text-white relative flex flex-col justify-between p-3.5 box-border"
      style={{
        WebkitAppRegion: 'drag',
        background: 'linear-gradient(135deg, rgba(20, 16, 42, 0.88) 0%, rgba(13, 10, 28, 0.94) 100%)',
        backdropFilter: 'blur(36px) saturate(190%)',
        borderRadius: '18px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      }}
    >
      {/* Dynamic Ambient Artwork Bloom Tint */}
      {state.artworkUrl && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000 opacity-25"
          style={{
            backgroundImage: `url(${state.artworkUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(45px) saturate(220%)',
          }}
        />
      )}

      {/* Main Track Card Area */}
      <div className="relative z-10 flex items-center gap-3.5" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Album Artwork */}
        <div className="relative w-[64px] h-[64px] shrink-0 rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/40 flex items-center justify-center">
          {state.artworkUrl ? (
            <img
              src={state.artworkUrl}
              alt={state.title}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#ff7b90] bg-[#22174d]">
              <Music className="w-6 h-6 animate-pulse" />
            </div>
          )}
        </div>

        {/* Title, Artist & Album */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <h1
              className="font-bold text-[14px] leading-tight truncate text-white tracking-wide"
              title={state.title}
            >
              {state.title || 'PixelTunes'}
            </h1>
            {state.isSpotifyConnected && (
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-[#1db954]/20 text-[#1db954] font-medium border border-[#1db954]/30">
                Spotify
              </span>
            )}
          </div>
          <p
            className="text-[12px] text-white/70 truncate mt-0.5 font-medium leading-snug"
            title={state.artist}
          >
            {state.artist || 'Lo-Fi Chill'}
          </p>
          {state.album && (
            <p
              className="text-[10px] text-white/45 truncate mt-0.5 font-normal"
              title={state.album}
            >
              {state.album}
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar & Durations */}
      <div className="relative z-10 mt-2.5 px-0.5" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="relative flex items-center group">
          <input
            type="range"
            min={0}
            max={state.durationMs || 100}
            value={currentProgress}
            onChange={(e) => {
              setIsScrubbing(true);
              setScrubValue(Number(e.target.value));
            }}
            onMouseUp={(e) => handleSeekCommit(Number(e.currentTarget.value))}
            onTouchEnd={(e) => handleSeekCommit(Number(e.currentTarget.value))}
            className="w-full h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer outline-none accent-[#ff7b90] hover:h-2 transition-all"
            style={{
              background: `linear-gradient(to right, #ff7b90 ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%)`,
            }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-white/50 mt-1 font-mono tracking-wider">
          <span>{formatTime(currentProgress)}</span>
          <span>-{formatTime(Math.max(0, state.durationMs - currentProgress))}</span>
        </div>
      </div>

      {/* Controls Bar: Shuffle, Prev, Play/Pause, Next, Repeat */}
      <div className="relative z-10 flex items-center justify-between mt-1 px-1" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Shuffle */}
        <button
          onClick={handleToggleShuffle}
          className={`p-1.5 rounded-lg transition-colors hover:bg-white/10 ${
            state.shuffleState ? 'text-[#ff7b90]' : 'text-white/45'
          }`}
          title={`Shuffle: ${state.shuffleState ? 'ON' : 'OFF'}`}
        >
          <Shuffle className="w-3.5 h-3.5" />
        </button>

        {/* Previous */}
        <button
          onClick={handlePrev}
          className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          title="Previous Track"
        >
          <SkipBack className="w-4 h-4 fill-current" />
        </button>

        {/* Play / Pause Primary Button */}
        <button
          onClick={handleTogglePlay}
          className="w-9 h-9 rounded-full bg-white text-[#120e29] flex items-center justify-center hover:scale-105 active:scale-95 shadow-md hover:bg-white/95 transition-all"
          title={state.isPlaying ? 'Pause' : 'Play'}
        >
          {state.isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Next */}
        <button
          onClick={handleNext}
          className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          title="Next Track"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>

        {/* Repeat */}
        <button
          onClick={handleCycleRepeat}
          className={`p-1.5 rounded-lg transition-colors hover:bg-white/10 ${
            state.repeatState !== 'off' ? 'text-[#ff7b90]' : 'text-white/45'
          }`}
          title={`Repeat: ${state.repeatState.toUpperCase()}`}
        >
          {state.repeatState === 'track' ? (
            <Repeat1 className="w-3.5 h-3.5" />
          ) : (
            <Repeat className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Volume & Queue Bar */}
      <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10 mt-2 text-[11px]" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Volume Slider */}
        <div className="flex items-center gap-1.5 w-32 group">
          <button
            onClick={() => handleVolumeChange(state.volumePercent > 0 ? 0 : 75)}
            className="text-white/60 hover:text-white transition-colors"
            title="Mute / Unmute"
          >
            {state.volumePercent === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-white/40" />
            ) : state.volumePercent < 50 ? (
              <Volume1 className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={state.volumePercent}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer outline-none accent-[#ff7b90] hover:h-1.5 transition-all"
            style={{
              background: `linear-gradient(to right, #ffffff ${state.volumePercent}%, rgba(255,255,255,0.2) ${state.volumePercent}%)`,
            }}
          />
        </div>

        {/* Expandable Queue Toggle Button */}
        <button
          onClick={() => setIsQueueOpen(!isQueueOpen)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-[11px] font-medium"
        >
          <ListMusic className="w-3.5 h-3.5 text-[#ff7b90]" />
          <span>Queue</span>
          {isQueueOpen ? (
            <ChevronUp className="w-3 h-3 text-white/50" />
          ) : (
            <ChevronDown className="w-3 h-3 text-white/50" />
          )}
        </button>
      </div>

      {/* Expandable Upcoming Queue Section */}
      {isQueueOpen && (
        <div
          className="relative z-10 mt-3 pt-2 border-t border-white/10 flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar"
          style={{ WebkitAppRegion: 'no-drag', maxHeight: '230px' }}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1 px-1">
            Up Next
          </div>

          {state.isSpotifyConnected ? (
            isLoadingQueue ? (
              <div className="text-center py-4 text-xs text-white/40 animate-pulse">Loading upcoming tracks...</div>
            ) : queueTracks.length > 0 ? (
              queueTracks.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => handlePlayQueueTrack(item.uri)}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-[10px] text-white/35 font-mono w-3.5">{idx + 1}</span>
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-medium text-white/90 group-hover:text-white truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-white/50 truncate">
                        {item.artists?.map((a) => a.name).join(', ')}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-white/40 font-mono shrink-0">
                    {formatTime(item.duration_ms)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-3 text-xs text-white/40">No upcoming tracks in queue</div>
            )
          ) : (
            BUILTIN_TRACKS.map((track, idx) => (
              <div
                key={track.id}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                onClick={() => {
                  window.electronAPI?.sendPlaybackAction?.('next');
                }}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-[10px] text-white/35 font-mono w-3.5">{idx + 1}</span>
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-medium text-white/90 group-hover:text-white truncate">
                      {track.name}
                    </div>
                    <div className="text-[10px] text-white/50 truncate">{track.artist}</div>
                  </div>
                </div>
                <span className="text-[10px] text-white/40 font-mono shrink-0">
                  {formatTime(track.duration * 1000)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default MenuBarPlayer;
