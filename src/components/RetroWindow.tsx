import React, { useState, useEffect, useRef } from 'react';
import { PixelCanvas } from './PixelCanvas';
import { RetroQueueView } from './RetroQueueView';
import { PixelVisualizer } from './PixelVisualizer';
import { PixelSpeakerIcon } from './PixelSpeakerIcon';
import { PixelShuffleIcon, PixelRepeatIcon } from './PixelControlIcons';
import { PixelMenuButton } from './PixelMenuButton';
import { RetroTheme } from '../types/theme';
import { SCALES, PlayerScale } from '../types/scale';
import { SpotifyPlaybackState, SpotifyDevice } from '../types/spotify';
import {
  playSpotify,
  pauseSpotify,
  nextTrackSpotify,
  previousTrackSpotify,
  seekSpotify,
  setVolumeSpotify,
  toggleShuffleSpotify,
  setRepeatModeSpotify,
  getQueue as getQueueSpotify,
  getLikedSongs as getLikedSongsSpotify,
} from '../services/spotify';
import { lofiEngine, BuiltinTrack } from '../services/lofiAudio';
import {
  playClickSound,
  playPlaySound,
  playPauseSound,
  playSkipSound,
  playBlipSound,
} from '../services/soundEffects';

interface RetroWindowProps {
  theme: RetroTheme;
  artMode: 'inspo' | 'pixelArt' | 'cassette';
  onCycleArtMode: () => void;
  pixelResolution?: number;
  windowTitle: string;
  titleEmojis?: string;
  headerTag?: string;
  scale: PlayerScale;
  onScaleChange: (scale: PlayerScale) => void;
  isSpotifyConnected: boolean;
  spotifyPlayback: SpotifyPlaybackState | null;
  initialLikedTrack?: any;
  initialLikedList?: any[];
  onPollSpotify?: () => Promise<void>;
  onOpenSpotifyModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenPlaylistModal?: () => void;
  isModalOpen?: boolean;
}

function getFormattedDigitalTime(): { time: string } {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const hStr = hours < 10 ? `0${hours}` : `${hours}`;
  const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return { time: `${hStr}:${mStr}` };
}

export const RetroWindow: React.FC<RetroWindowProps> = ({
  theme,
  artMode,
  onCycleArtMode,
  pixelResolution = 180,
  windowTitle,
  titleEmojis = '𐙚 ⊹₊⋆☆',
  headerTag,
  scale,
  onScaleChange,
  isSpotifyConnected,
  spotifyPlayback,
  initialLikedTrack,
  initialLikedList,
  onPollSpotify,
  onOpenSpotifyModal,
  onOpenSettingsModal,
  onOpenPlaylistModal,
  isModalOpen = false,
}) => {
  const windowRef = useRef<HTMLDivElement | null>(null);

  // Local state for built-in audio fallback
  const [builtinTrack, setBuiltinTrack] = useState<BuiltinTrack>(lofiEngine.getTrack());
  const [builtinPlaying, setBuiltinPlaying] = useState(false);
  const [builtinPosition, setBuiltinPosition] = useState(0);
  const [volume, setVolume] = useState(80); // 0 - 100
  const [isMuted, setIsMuted] = useState(false);
  const [isHoveringScrubber, setIsHoveringScrubber] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);
  const [showQueue, setShowQueue] = useState(false);

  const isMiniMode = scale === 'mini';

  // 7-Segment Digital Clock State (updates every second)
  const [digitalTime, setDigitalTime] = useState(getFormattedDigitalTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setDigitalTime(getFormattedDigitalTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check initial Electron Always-on-top state
  useEffect(() => {
    if (window.electronAPI?.getAlwaysOnTop) {
      window.electronAPI.getAlwaysOnTop().then((val) => {
        setIsAlwaysOnTop(val);
      });
    }
  }, []);

  const handleToggleAlwaysOnTop = async () => {
    playClickSound();
    if (window.electronAPI?.toggleAlwaysOnTop) {
      const newState = await window.electronAPI.toggleAlwaysOnTop();
      setIsAlwaysOnTop(newState);
    } else {
      setIsAlwaysOnTop(!isAlwaysOnTop);
    }
  };

  const handleCloseWindow = () => {
    playClickSound();
    if (window.electronAPI?.close) {
      window.electronAPI.close();
    } else {
      handleStop();
    }
  };

  const handleMinimizeWindow = () => {
    playClickSound();
    if (window.electronAPI?.minimize) {
      window.electronAPI.minimize();
    } else {
      handleToggleMini();
    }
  };

  const handleToggleMini = () => {
    playClickSound();
    const nextScale: PlayerScale = scale === 'mini' ? 'standard' : 'mini';
    onScaleChange(nextScale);
    const dims = SCALES[nextScale];
    if (window.electronAPI?.setSize) {
      window.electronAPI.setSize(dims.width, dims.height);
    }
  };

  const cycleScale = () => {
    playClickSound();
    const scalesList: PlayerScale[] = ['standard', 'large', 'mini'];
    const currentIndex = scalesList.indexOf(scale);
    const nextScale = scalesList[(currentIndex + 1) % scalesList.length];
    onScaleChange(nextScale);
    const dims = SCALES[nextScale];
    if (window.electronAPI?.setSize) {
      window.electronAPI.setSize(dims.width, dims.height);
    }
  };

  // Draggable Corner Resize Handle with aspect ratio lock
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playClickSound();

    const startX = e.clientX;
    const startW = window.innerWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newW = Math.max(480, Math.min(1440, Math.round(startW + deltaX)));
      const newH = Math.round(newW * (410 / 720));

      if (window.electronAPI?.setSize) {
        window.electronAPI.setSize(newW, newH);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Sync with lofiEngine
  useEffect(() => {
    lofiEngine.setOnStateChange(() => {
      setBuiltinTrack(lofiEngine.getTrack());
      setBuiltinPlaying(lofiEngine.getIsPlaying());
      setBuiltinPosition(lofiEngine.getPosition());
    });
  }, []);

  // Optimistic playback state for instant zero-lag response
  const [optimisticPlaying, setOptimisticPlaying] = useState<boolean | null>(null);

  // User manually clicked/selected track with 5-second priority lock over stale poll responses
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number>(0);

  // Saved last played Spotify track from localStorage
  const [savedSpotifyTrack, setSavedSpotifyTrack] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('pixeltunes_last_spotify_track');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // When initialLikedTrack is loaded on startup or connect, pause on it immediately!
  useEffect(() => {
    if (initialLikedTrack) {
      setSavedSpotifyTrack(initialLikedTrack);
      setOptimisticPlaying(false);
      try {
        localStorage.setItem('pixeltunes_last_spotify_track', JSON.stringify(initialLikedTrack));
      } catch {}
    }
  }, [initialLikedTrack]);

  // Whenever authoritative Spotify item is active, update saved track unless user just clicked another track
  useEffect(() => {
    if (spotifyPlayback?.item) {
      if (selectedTrack && Date.now() - selectedTimestamp < 5000) {
        if (spotifyPlayback.item.id === selectedTrack.id || spotifyPlayback.item.name === selectedTrack.name) {
          setSelectedTrack(null);
          setSavedSpotifyTrack(spotifyPlayback.item);
          try {
            localStorage.setItem('pixeltunes_last_spotify_track', JSON.stringify(spotifyPlayback.item));
          } catch {}
        }
        return;
      }

      setSavedSpotifyTrack(spotifyPlayback.item);
      try {
        localStorage.setItem('pixeltunes_last_spotify_track', JSON.stringify(spotifyPlayback.item));
      } catch {}
    }
  }, [spotifyPlayback?.item, selectedTrack, selectedTimestamp]);

  // Whenever Pixeltunes is opened: pause on the first song of user's Liked Songs playlist
  useEffect(() => {
    if (isSpotifyConnected && !spotifyPlayback?.is_playing && !initialLikedTrack) {
      getLikedSongsSpotify(1).then((liked) => {
        if (liked && liked.length > 0) {
          const firstLiked = liked[0];
          setSavedSpotifyTrack(firstLiked);
          setOptimisticPlaying(false); // Paused on that very song
          try {
            localStorage.setItem('pixeltunes_last_spotify_track', JSON.stringify(firstLiked));
          } catch {}
        } else {
          // Fallback if liked songs empty or scope pending
          getQueueSpotify().then((q) => {
            const tr = q.currentlyPlaying || (q.queue && q.queue.length > 0 ? q.queue[0] : null);
            if (tr) {
              setSavedSpotifyTrack(tr);
              setOptimisticPlaying(false);
              try {
                localStorage.setItem('pixeltunes_last_spotify_track', JSON.stringify(tr));
              } catch {}
            }
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [isSpotifyConnected, initialLikedTrack]);

  // Sync and clear optimistic state whenever authoritative Spotify data arrives matching the active track
  useEffect(() => {
    if (
      spotifyPlayback?.item?.id &&
      savedSpotifyTrack?.id &&
      (spotifyPlayback.item.id === savedSpotifyTrack.id || spotifyPlayback.item.name === savedSpotifyTrack.name)
    ) {
      setOptimisticPlaying(null);
    }
  }, [spotifyPlayback?.is_playing, spotifyPlayback?.item?.id, spotifyPlayback?.item?.name, savedSpotifyTrack?.id, savedSpotifyTrack?.name]);

  // Determine active playback source:
  // 1. User's recent selection (within 5s)
  // 2. Authoritative live Spotify playback item
  // 3. Saved / First Liked track
  const isRecentSelection = selectedTrack && Date.now() - selectedTimestamp < 5000;
  const activeSpotifyItem =
    (isRecentSelection ? selectedTrack : null) ||
    spotifyPlayback?.item ||
    (isSpotifyConnected ? savedSpotifyTrack : null);
  const hasActiveSpotifyPlayback = isSpotifyConnected && activeSpotifyItem !== null;
  const isPlaying = optimisticPlaying !== null
    ? optimisticPlaying
    : (hasActiveSpotifyPlayback ? (spotifyPlayback?.is_playing ?? false) : builtinPlaying);

  const currentTitle = hasActiveSpotifyPlayback
    ? activeSpotifyItem?.name || 'UNKNOWN TRACK'
    : builtinTrack.name;

  const currentArtist = hasActiveSpotifyPlayback
    ? activeSpotifyItem?.artists.map((a: any) => a.name).join(', ') || 'UNKNOWN ARTIST'
    : builtinTrack.artist;

  const currentAlbum = hasActiveSpotifyPlayback
    ? activeSpotifyItem?.album?.name || ''
    : builtinTrack.album;

  const albumArtUrl = hasActiveSpotifyPlayback
    ? activeSpotifyItem?.album?.images[0]?.url || null
    : null;

  const durationMs = hasActiveSpotifyPlayback
    ? activeSpotifyItem?.duration_ms || 180000
    : builtinTrack.duration * 1000;

  const progressMs = hasActiveSpotifyPlayback
    ? spotifyPlayback?.progress_ms || 0
    : builtinPosition * 1000;

  const shuffleState = hasActiveSpotifyPlayback
    ? (spotifyPlayback?.shuffle_state ?? false)
    : false;

  const repeatState = hasActiveSpotifyPlayback
    ? (spotifyPlayback?.repeat_state ?? 'off')
    : 'off';

  // Format milliseconds into MM:SS
  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Playback Controls Handlers (Zero-Lag Optimistic Execution)
  const handleTogglePlay = async () => {
    const nextPlaying = !isPlaying;
    setOptimisticPlaying(nextPlaying);

    if (nextPlaying) {
      playPlaySound();
    } else {
      playPauseSound();
    }

    if (hasActiveSpotifyPlayback || isSpotifyConnected) {
      try {
        if (nextPlaying) {
          await playSpotify();
        } else {
          await pauseSpotify();
        }
        // Rapid re-poll to confirm authoritative server state
        setTimeout(() => { if (onPollSpotify) onPollSpotify(); }, 200);
        setTimeout(() => { if (onPollSpotify) onPollSpotify(); }, 600);
        setTimeout(() => { if (onPollSpotify) onPollSpotify(); }, 1200);
      } catch (err) {
        console.error('Spotify play toggle failed:', err);
        setOptimisticPlaying(null);
      }
    } else {
      lofiEngine.togglePlay();
    }
  };

  const handleNext = async () => {
    playSkipSound();
    if (hasActiveSpotifyPlayback || isSpotifyConnected) {
      await nextTrackSpotify();
      setTimeout(() => { if (onPollSpotify) onPollSpotify(); }, 150);
      setTimeout(() => { if (onPollSpotify) onPollSpotify(); }, 500);
    } else {
      lofiEngine.nextTrack();
    }
  };

  const handlePrev = async () => {
    playSkipSound();
    if (hasActiveSpotifyPlayback || isSpotifyConnected) {
      await previousTrackSpotify();
      setTimeout(() => { if (onPollSpotify) onPollSpotify(); }, 150);
      setTimeout(() => { if (onPollSpotify) onPollSpotify(); }, 500);
    } else {
      lofiEngine.previousTrack();
    }
  };

  const handleRewind = async () => {
    playSkipSound();
    const targetMs = Math.max(0, progressMs - 10000);
    if (hasActiveSpotifyPlayback || isSpotifyConnected) {
      await seekSpotify(targetMs);
      setTimeout(() => { if (onPollSpotify) onPollSpotify(); }, 150);
    } else {
      lofiEngine.seek(targetMs / 1000);
    }
  };

  const handleFastForward = async () => {
    playSkipSound();
    const targetMs = Math.min(durationMs, progressMs + 10000);
    if (hasActiveSpotifyPlayback || isSpotifyConnected) {
      await seekSpotify(targetMs);
      setTimeout(() => { if (onPollSpotify) onPollSpotify(); }, 150);
    } else {
      lofiEngine.seek(targetMs / 1000);
    }
  };

  const handleStop = async () => {
    setOptimisticPlaying(false);
    playPauseSound();
    if (hasActiveSpotifyPlayback || isSpotifyConnected) {
      try {
        await pauseSpotify();
        await seekSpotify(0);
        setTimeout(() => { if (onPollSpotify) onPollSpotify(); }, 120);
        setTimeout(() => { if (onPollSpotify) onPollSpotify(); }, 400);
      } catch (err) {
        setOptimisticPlaying(null);
      }
    } else {
      lofiEngine.pause();
      lofiEngine.seek(0);
    }
  };

  const handleSeek = async (e: React.MouseEvent<HTMLDivElement>) => {
    playClickSound();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetMs = ratio * durationMs;

    if (hasActiveSpotifyPlayback || isSpotifyConnected) {
      await seekSpotify(targetMs);
    } else {
      lofiEngine.seek(targetMs / 1000);
    }
  };

  const handleVolumeChange = async (newVol: number) => {
    playBlipSound();
    setVolume(newVol);
    setIsMuted(newVol === 0);

    if (hasActiveSpotifyPlayback || isSpotifyConnected) {
      await setVolumeSpotify(newVol);
    } else {
      lofiEngine.setVolume(newVol / 100);
    }
  };

  const handleToggleMute = () => {
    playBlipSound();
    if (isMuted) {
      setIsMuted(false);
      handleVolumeChange(volume || 80);
    } else {
      setIsMuted(true);
      if (hasActiveSpotifyPlayback || isSpotifyConnected) {
        setVolumeSpotify(0);
      } else {
        lofiEngine.setVolume(0);
      }
    }
  };

  const activeVolumeBlocks = isMuted || volume === 0
    ? 0
    : Math.max(1, Math.min(5, Math.ceil(volume / 20)));

  const handleSetVolumeBlock = (index: number) => {
    playBlipSound();
    const targetLevel = index + 1;
    if (!isMuted && activeVolumeBlocks === 1 && targetLevel === 1) {
      handleToggleMute();
      return;
    }
    setIsMuted(false);
    const newVol = targetLevel * 20;
    handleVolumeChange(newVol);
  };

  const handleToggleShuffle = async () => {
    playClickSound();
    if (hasActiveSpotifyPlayback || isSpotifyConnected) {
      await toggleShuffleSpotify(!shuffleState);
    }
  };

  const handleCycleRepeat = async () => {
    playClickSound();
    if (hasActiveSpotifyPlayback || isSpotifyConnected) {
      const nextMode = repeatState === 'off' ? 'context' : repeatState === 'context' ? 'track' : 'off';
      await setRepeatModeSpotify(nextMode);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        onOpenSpotifyModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, hasActiveSpotifyPlayback, isSpotifyConnected, volume, isMuted]);

  // Calculate progress percent
  const progressPercent = durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0;

  // Split title if it contains spaces to get the iconic stacked aesthetic from inspo
  const renderStackedTitle = (title: string) => {
    const words = title.split(' ');
    if (words.length <= 2) {
      return (
        <div className="font-pixel text-2xl font-bold tracking-wider leading-snug">
          <div>{words[0]}</div>
          {words[1] && <div>{words[1]}</div>}
        </div>
      );
    }

    // Split in half
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');

    return (
      <div className="font-pixel text-xl font-bold tracking-wider leading-snug break-words">
        <div className="truncate">{line1}</div>
        <div className="truncate">{line2}</div>
      </div>
    );
  };

  return (
    <div
      ref={windowRef}
      className="relative w-[720px] h-[410px] border-4 shadow-pixel-lg select-none flex flex-col overflow-hidden shrink-0"
      style={{
        borderColor: theme.primaryBorder,
        backgroundColor: theme.windowBg,
        boxShadow: `6px 6px 0px 0px ${theme.primaryBorder}`,
      }}
    >
      {/* Window Title Bar */}
      <div
        className={`h-10 px-3 py-2 flex items-center justify-between border-b-4 border-solid ${
          isModalOpen ? 'app-no-drag' : 'app-drag'
        } select-none shrink-0`}
        style={{
          backgroundColor: theme.titleBarBg,
          borderColor: theme.primaryBorder,
          color: theme.textColor,
          WebkitAppRegion: isModalOpen ? 'no-drag' : 'drag',
        } as any}
      >
        {/* Candy Buttons & Window Title */}
        <div className="flex items-center gap-2 app-no-drag">
          {/* 3 Retro Glossy Candy Buttons */}
          <div className="flex items-center gap-1.5 mr-2">
            <button
              onClick={handleCloseWindow}
              title={window.electronAPI?.isElectron ? "Close Window" : "Stop"}
              className="w-3.5 h-3.5 rounded-full border-2 border-[#191244] bg-[#ff7b90] relative overflow-hidden group cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-80" />
            </button>
            <button
              onClick={handleMinimizeWindow}
              title={window.electronAPI?.isElectron ? "Minimize Window" : "Mini Mode"}
              className="w-3.5 h-3.5 rounded-full border-2 border-[#191244] bg-[#ffd269] relative overflow-hidden group cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-80" />
            </button>
            <button
              onClick={handleToggleMini}
              title={isMiniMode ? "Expand to Standard (1x)" : "Collapse to Mini Widget"}
              className="w-3.5 h-3.5 rounded-full border-2 border-[#191244] bg-[#9df0cf] relative overflow-hidden group cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-80" />
            </button>
          </div>

          {/* Title and Text Emojis in dark navy color */}
          <div className="flex items-center gap-2 select-none">
            <span className="font-pixel text-xs font-bold tracking-widest text-[#191244]">
              {windowTitle}
            </span>
            {titleEmojis && (
              <span
                className="text-xs font-semibold tracking-wide leading-none inline-flex items-center text-[#191244]"
                style={{
                  fontFamily: '"Apple Symbols", "Noto Sans Linear A", "Segoe UI Emoji", -apple-system, sans-serif',
                }}
              >
                {titleEmojis}
              </span>
            )}
          </div>
        </div>

        {/* Right Header: 7-Segment Digital Clock (24h) & Actions */}
        <div className="flex items-center gap-2 app-no-drag">
          <div
            className="text-sm font-bold text-[#191244] select-none flex items-center"
            title="Local Time (24h)"
          >
            <span
              className="italic tracking-wider"
              style={{ fontFamily: '"DSEG7Classic", monospace' }}
            >
              {digitalTime.time}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Vercel Web Link Button */}
            <a
              href="https://pixeltunes.vercel.app"
              target="_blank"
              rel="noreferrer"
              title="Open Live Web Version on Vercel (https://pixeltunes.vercel.app)"
              className="px-1.5 py-0.5 bg-[#fffdf5] border border-[#191244] text-[#191244] font-pixel text-[7px] font-bold hover:bg-[#9df0cf] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1 leading-none shadow-pixel-xs"
            >
              <span className="text-[7px]">▲</span>
              <span>WEB</span>
            </a>

            {/* Retro Pixel Menu Button */}
            <PixelMenuButton
              onClick={() => {
                playClickSound();
                onOpenSettingsModal();
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Player Body: Permanent 2-Column Split (Layout NEVER Changes) */}
      <div className="flex-1 min-h-0 flex flex-row items-center overflow-hidden w-full h-full">
        {/* Left Column: Playlist Screen OR Album Cover */}
        {showQueue ? (
          /* Full-Height Playlist Screen fitted directly to borders with NO space up and down */
          <div className="w-[240px] h-full border-r-4 border-[#191244] bg-[#fffdf5] shrink-0 flex flex-col overflow-hidden">
            <RetroQueueView
              isSpotifyConnected={isSpotifyConnected}
              onClose={() => setShowQueue(false)}
              onOpenSpotifyModal={onOpenSpotifyModal}
              currentTrackTitle={currentTitle}
              initialLikedTrack={initialLikedTrack}
              initialLikedList={initialLikedList}
              onTrackPlayed={(playedTrack) => {
                if (playedTrack) {
                  setSelectedTrack(playedTrack);
                  setSelectedTimestamp(Date.now());
                  setSavedSpotifyTrack(playedTrack);
                  setOptimisticPlaying(true);
                  try {
                    localStorage.setItem('pixeltunes_last_spotify_track', JSON.stringify(playedTrack));
                  } catch {}
                }
                if (onPollSpotify) {
                  setTimeout(onPollSpotify, 400);
                  setTimeout(onPollSpotify, 1000);
                  setTimeout(onPollSpotify, 1800);
                }
              }}
            />
          </div>
        ) : (
          /* Album Cover View */
          <div className="w-[240px] h-full flex flex-col items-center justify-center p-4 pr-1 shrink-0">
            {/* Pixel Card Container with Double Border */}
            <div
              className="w-[210px] h-[210px] border-4 p-1.5 bg-[#8fa2d4] shadow-pixel-sm shrink-0"
              style={{ borderColor: theme.primaryBorder }}
            >
              <div className="w-full h-full border-2 border-[#191244] relative group overflow-hidden">
                <PixelCanvas
                  isPlaying={isPlaying}
                  albumArtUrl={albumArtUrl}
                  mode={artMode}
                  pixelResolution={pixelResolution}
                  trackTitle={currentTitle}
                  artistName={currentArtist}
                  themeColors={{
                    navy: theme.accentNavy,
                    pink: theme.accentPink,
                    periwinkle: theme.accentPeriwinkle,
                    cream: '#fffdf5',
                  }}
                />
              </div>
            </div>

            {/* View Playlist & Select Songs Button (Shifted into spot below album cover) */}
            <div className="mt-2.5 text-center">
              <button
                data-testid="toggle-playlist-btn"
                onClick={() => {
                  playClickSound();
                  setShowQueue(true);
                }}
                title="View Queued Playlist"
                className="px-3 py-1 bg-[#fffdf5] text-[#191244] border-2 border-[#191244] shadow-pixel-sm font-pixel text-[8px] hover:bg-[#fec5db] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer font-bold tracking-wider"
              >
                <span className="text-[10px]">♫</span>
                <span>VIEW PLAYLIST</span>
                <span className="text-[7px] text-[#ff7b90]">▼</span>
              </button>
            </div>
          </div>
        )}

        {/* Right Column: Track Info & Controls (Always Right) */}
        <div className="flex-1 min-w-0 p-4 pl-4 flex flex-col justify-center h-full">
          <div className="flex flex-col justify-between py-0.5 h-[245px]">
            {/* Song Title & Artist Display */}
            <div className="text-left space-y-0.5">
              <div
                className="text-[#191244] uppercase select-text"
                style={{ color: theme.textColor }}
              >
                {renderStackedTitle(currentTitle)}
              </div>
              <div className="font-silkscreen text-xs text-[#191244]/90 font-bold tracking-wider truncate">
                {currentArtist}
              </div>
              {currentAlbum && (
                <div className="font-silkscreen text-[10px] text-[#191244]/70 truncate">
                  {currentAlbum}
                </div>
              )}
            </div>

            {/* Scrubber & Playback Controls Grouped Together (Shifted Upwards) */}
            <div className="space-y-1.5 -mt-1">
              {/* Retro Progress Bar & Scrubber */}
              <div className="space-y-0.5">
                <div
                  onClick={handleSeek}
                  onMouseEnter={() => setIsHoveringScrubber(true)}
                  onMouseLeave={() => setIsHoveringScrubber(false)}
                  className="relative w-full h-4 flex items-center cursor-pointer group"
                >
                  {/* Background line (Dark Navy) */}
                  <div
                    className="w-full h-1 bg-[#191244] rounded-none relative"
                    style={{ backgroundColor: theme.primaryBorder }}
                  >
                    {/* Filled progress */}
                    <div
                      className="h-full bg-[#fec5db]"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: theme.accentPink,
                      }}
                    />
                  </div>

                  {/* Pixel Scrubber Block / Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#fec5db] border-2 border-[#191244] shadow-pixel-sm transition-transform group-hover:scale-110"
                    style={{
                      left: `calc(${progressPercent}% - 7px)`,
                      backgroundColor: theme.accentPink,
                      borderColor: theme.primaryBorder,
                    }}
                  />
                </div>

                {/* Time Indicators */}
                <div className="flex justify-between font-silkscreen text-[10px] text-[#191244] tracking-widest">
                  <span>{formatTime(progressMs)}</span>
                  <span>{formatTime(durationMs)}</span>
                </div>
              </div>

              {/* EXACT Playback Controls Row: [⏪] [⏮] ( [❚❚] ) [⏭] [⏩] (Enlarged Size) */}
              <div className="flex items-center justify-center gap-2.5 pt-0.5 pb-0.5 select-none">
                {/* Rewind 10s (⏪) */}
                <button
                  onClick={handleRewind}
                  title="Rewind 10s"
                  className="px-1 py-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer text-[#191244] outline-none focus:outline-none focus:ring-0"
                  style={{ color: theme.textColor }}
                >
                  <svg width="26" height="19" viewBox="0 0 22 16" fill="currentColor" style={{ shapeRendering: 'crispEdges' }}>
                    <rect x="0" y="7" width="2" height="2" />
                    <rect x="2" y="6" width="2" height="4" />
                    <rect x="4" y="5" width="2" height="6" />
                    <rect x="6" y="4" width="2" height="8" />
                    <rect x="8" y="3" width="2" height="10" />
                    <rect x="10" y="2" width="2" height="12" />
                    <rect x="10" y="7" width="2" height="2" />
                    <rect x="12" y="6" width="2" height="4" />
                    <rect x="14" y="5" width="2" height="6" />
                    <rect x="16" y="4" width="2" height="8" />
                    <rect x="18" y="3" width="2" height="10" />
                    <rect x="20" y="2" width="2" height="12" />
                  </svg>
                </button>

                {/* Previous Track (⏮) */}
                <button
                  onClick={handlePrev}
                  title="Previous Track"
                  className="px-1 py-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer text-[#191244] outline-none focus:outline-none focus:ring-0"
                  style={{ color: theme.textColor }}
                >
                  <svg width="24" height="19" viewBox="0 0 20 16" fill="currentColor" style={{ shapeRendering: 'crispEdges' }}>
                    <rect x="1" y="2" width="3" height="12" />
                    <rect x="6" y="7" width="2" height="2" />
                    <rect x="8" y="6" width="2" height="4" />
                    <rect x="10" y="5" width="2" height="6" />
                    <rect x="12" y="4" width="2" height="8" />
                    <rect x="14" y="3" width="2" height="10" />
                    <rect x="16" y="2" width="2" height="12" />
                  </svg>
                </button>

                {/* Center Play / Pause in Pixel Circle (❚❚) / (▶) */}
                <button
                  data-testid="main-play-btn"
                  onClick={handleTogglePlay}
                  title={isPlaying ? "Pause" : "Play"}
                  className="px-1 py-1 hover:scale-105 active:scale-95 transition-transform cursor-pointer text-[#191244] outline-none focus:outline-none focus:ring-0"
                  style={{ color: theme.textColor }}
                >
                  <svg width="44" height="44" viewBox="0 0 34 34" fill="currentColor" style={{ shapeRendering: 'crispEdges' }}>
                    {/* Circle Outline */}
                    <rect x="10" y="1" width="14" height="2" />
                    <rect x="6" y="3" width="4" height="2" />
                    <rect x="24" y="3" width="4" height="2" />
                    <rect x="3" y="5" width="3" height="3" />
                    <rect x="28" y="5" width="3" height="3" />
                    <rect x="1" y="8" width="2" height="5" />
                    <rect x="31" y="8" width="2" height="5" />
                    <rect x="0" y="13" width="2" height="8" />
                    <rect x="32" y="13" width="2" height="8" />
                    <rect x="1" y="21" width="2" height="5" />
                    <rect x="31" y="21" width="2" height="5" />
                    <rect x="3" y="26" width="3" height="3" />
                    <rect x="28" y="26" width="3" height="3" />
                    <rect x="6" y="29" width="4" height="2" />
                    <rect x="24" y="29" width="4" height="2" />
                    <rect x="10" y="31" width="14" height="2" />

                    {isPlaying ? (
                      <>
                        <rect x="11" y="10" width="4" height="14" />
                        <rect x="19" y="10" width="4" height="14" />
                      </>
                    ) : (
                      <>
                        <rect x="13" y="9" width="2" height="16" />
                        <rect x="15" y="10" width="2" height="14" />
                        <rect x="17" y="11" width="2" height="12" />
                        <rect x="19" y="12" width="2" height="10" />
                        <rect x="21" y="13" width="2" height="8" />
                        <rect x="23" y="15" width="2" height="4" />
                      </>
                    )}
                  </svg>
                </button>

                {/* Next Track (⏭) */}
                <button
                  onClick={handleNext}
                  title="Next Track"
                  className="px-1 py-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer text-[#191244] outline-none focus:outline-none focus:ring-0"
                  style={{ color: theme.textColor }}
                >
                  <svg width="24" height="19" viewBox="0 0 20 16" fill="currentColor" style={{ shapeRendering: 'crispEdges' }}>
                    <rect x="2" y="2" width="2" height="12" />
                    <rect x="4" y="3" width="2" height="10" />
                    <rect x="6" y="4" width="2" height="8" />
                    <rect x="8" y="5" width="2" height="6" />
                    <rect x="10" y="6" width="2" height="4" />
                    <rect x="12" y="7" width="2" height="2" />
                    <rect x="16" y="2" width="3" height="12" />
                  </svg>
                </button>

                {/* Fast Forward 10s (⏩) */}
                <button
                  onClick={handleFastForward}
                  title="Fast Forward 10s"
                  className="px-1 py-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer text-[#191244] outline-none focus:outline-none focus:ring-0"
                  style={{ color: theme.textColor }}
                >
                  <svg width="26" height="19" viewBox="0 0 22 16" fill="currentColor" style={{ shapeRendering: 'crispEdges' }}>
                    <rect x="0" y="2" width="2" height="12" />
                    <rect x="2" y="3" width="2" height="10" />
                    <rect x="4" y="4" width="2" height="8" />
                    <rect x="6" y="5" width="2" height="6" />
                    <rect x="8" y="6" width="2" height="4" />
                    <rect x="10" y="7" width="2" height="2" />
                    <rect x="10" y="2" width="2" height="12" />
                    <rect x="12" y="3" width="2" height="10" />
                    <rect x="14" y="4" width="2" height="8" />
                    <rect x="16" y="5" width="2" height="6" />
                    <rect x="18" y="6" width="2" height="4" />
                    <rect x="20" y="7" width="2" height="2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Volume & Equalizer Spectrum */}
            <div className="space-y-1.5 pt-1 border-t border-[#191244]/20">
              {/* 5-Discrete Pixel Volume Controls & Auxiliary Buttons */}
              <div className="flex items-center gap-2">
                {/* Pixel Speaker Icon Button */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  title={isMuted || volume === 0 ? "Unmute" : "Mute"}
                  className="hover:scale-105 active:scale-95 transition-transform cursor-pointer flex items-center justify-center p-0.5 outline-none focus:outline-none"
                >
                  <PixelSpeakerIcon
                    level={activeVolumeBlocks}
                    isMuted={isMuted || volume === 0}
                    rimColor={theme.accentPink}
                    outlineColor={theme.primaryBorder}
                  />
                </button>

                {/* 5-Segment Pixel Volume Block Bar */}
                <div
                  className="flex items-center gap-[3px] p-[2.5px] rounded-[3px] border-2 shadow-[1px_1px_0px_#191244]"
                  style={{
                    backgroundColor: '#fffdf5',
                    borderColor: theme.primaryBorder,
                  }}
                  role="group"
                  aria-label="Volume level (5 options)"
                >
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const isFilled = idx < activeVolumeBlocks;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSetVolumeBlock(idx)}
                        title={`Volume ${(idx + 1) * 20}%`}
                        className="w-[14px] h-[10px] rounded-[1.5px] transition-all cursor-pointer hover:brightness-105 active:scale-95 outline-none focus:outline-none"
                        style={{
                          backgroundColor: isFilled ? theme.accentPink : '#ffffff',
                          borderColor: isFilled ? theme.primaryBorder : `${theme.primaryBorder}44`,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          boxShadow: isFilled
                            ? 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,0,0,0.15)'
                            : 'inset 0 1px 1px rgba(0,0,0,0.06)',
                        }}
                      />
                    );
                  })}
                </div>

                <span
                  className="font-silkscreen text-[9px] w-7 select-none"
                  style={{ color: theme.textColor }}
                >
                  {isMuted || volume === 0 ? '0%' : `${activeVolumeBlocks * 20}%`}
                </span>

                <div className="ml-auto flex items-center gap-1.5">
                  {/* Pixel Shuffle Button */}
                  <button
                    type="button"
                    onClick={handleToggleShuffle}
                    title={`Shuffle: ${shuffleState ? 'ON' : 'OFF'}`}
                    className="w-[22px] h-[20px] rounded-[2px] border-2 flex items-center justify-center cursor-pointer transition-all active:translate-y-0.5 outline-none focus:outline-none"
                    style={{
                      backgroundColor: shuffleState ? (theme.accentPink || '#ffd269') : '#fffdf5',
                      borderColor: theme.primaryBorder,
                      boxShadow: shuffleState
                        ? `inset 0 1px 0 rgba(255,255,255,0.7), 1px 1px 0px ${theme.primaryBorder}`
                        : `1px 1px 0px ${theme.primaryBorder}`,
                    }}
                  >
                    <PixelShuffleIcon
                      active={shuffleState}
                      color={shuffleState ? theme.primaryBorder : `${theme.primaryBorder}77`}
                    />
                  </button>

                  {/* Pixel Repeat Button */}
                  <button
                    type="button"
                    onClick={handleCycleRepeat}
                    title={`Repeat: ${repeatState.toUpperCase()}`}
                    className="w-[22px] h-[20px] rounded-[2px] border-2 flex items-center justify-center cursor-pointer transition-all active:translate-y-0.5 outline-none focus:outline-none"
                    style={{
                      backgroundColor:
                        repeatState === 'track'
                          ? theme.accentPink
                          : repeatState === 'context'
                          ? '#9df0cf'
                          : '#fffdf5',
                      borderColor: theme.primaryBorder,
                      boxShadow:
                        repeatState !== 'off'
                          ? `inset 0 1px 0 rgba(255,255,255,0.7), 1px 1px 0px ${theme.primaryBorder}`
                          : `1px 1px 0px ${theme.primaryBorder}`,
                    }}
                  >
                    <PixelRepeatIcon
                      mode={repeatState}
                      color={repeatState !== 'off' ? theme.primaryBorder : `${theme.primaryBorder}77`}
                    />
                  </button>

                  {/* Spotify Quick Pill */}
                  <button
                    onClick={() => {
                      playClickSound();
                      onOpenSpotifyModal();
                    }}
                    className="font-pixel text-[8px] px-2 h-[20px] bg-[#fffdf5] border-2 rounded-[2px] hover:bg-[#9df0cf] transition-all cursor-pointer whitespace-nowrap active:translate-y-0.5 flex items-center"
                    style={{
                      borderColor: theme.primaryBorder,
                      boxShadow: `1px 1px 0px ${theme.primaryBorder}`,
                      color: theme.textColor,
                    }}
                  >
                    {isSpotifyConnected ? 'SPOTIFY' : '+ SPOTIFY'}
                  </button>
                </div>
              </div>

              {/* Pixel Equalizer Visualizer */}
              <div className="pt-0.5">
                <PixelVisualizer
                  isPlaying={isPlaying}
                  isSpotifyActive={hasActiveSpotifyPlayback || false}
                  barCount={18}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Draggable Corner Resize Handle (Retro ◢ Grip) */}
      <div
        onMouseDown={handleResizeMouseDown}
        title="Click and drag corner to resize player"
        className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize flex flex-col justify-end items-end p-0.5 opacity-60 hover:opacity-100 select-none z-20 group"
      >
        <div className="w-1 h-1 bg-[#191244] mb-0.5 mr-0.5 group-hover:bg-[#fec5db]" />
        <div className="flex gap-0.5">
          <div className="w-1 h-1 bg-[#191244] group-hover:bg-[#fec5db]" />
          <div className="w-1 h-1 bg-[#191244] group-hover:bg-[#fec5db]" />
        </div>
      </div>
    </div>
  );
};

