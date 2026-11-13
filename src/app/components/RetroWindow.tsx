import React, { useState, useEffect, useRef } from 'react';
import { PixelCanvas } from './PixelCanvas';
import { RetroQueueView } from './RetroQueueView';
import { RetroIpodView } from './RetroIpodView';
import { RetroCapsuleWidget } from './RetroCapsuleWidget';
import { PixelVisualizer } from './PixelVisualizer';
import { PixelSpeakerIcon } from './PixelSpeakerIcon';
import { PixelShuffleIcon, PixelRepeatIcon } from './PixelControlIcons';
import { PixelMenuButton } from './PixelMenuButton';
import { getSpotifyItemUrl } from '../services/spotifyLinks';
import { RetroTheme } from '../../types/theme';
import { PlayerScale, PlayerLayoutMode } from '../../types/scale';
import { SpotifyPlaybackState } from '../../types/spotify';
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
import { lofiEngine, BuiltinTrack } from '../../shared/services/lofiAudio';
import {
  playClickSound,
  playPlaySound,
  playPauseSound,
  playSkipSound,
  playBlipSound,
} from '../../shared/services/soundEffects';

interface RetroWindowProps {
  theme: RetroTheme;
  artMode: 'pixelCovers' | 'pixelArt' | 'cassette' | 'saturn' | 'inspo';
  pixelResolution?: number;
  reducedMotion: boolean;
  crtEnabled: boolean;
  windowTitle: string;
  titleEmojis?: string;
  headerTag?: string;
  scale: PlayerScale;
  onScaleChange: (scale: PlayerScale) => void;
  layoutMode?: PlayerLayoutMode;
  onLayoutModeChange?: (mode: PlayerLayoutMode) => void;
  isSpotifyConnected: boolean;
  spotifyPlayback: SpotifyPlaybackState | null;
  onPollSpotify?: () => Promise<void>;
  onOpenSpotifyModal: (opener?: HTMLElement) => void;
  onOpenSettingsModal: (opener: HTMLElement) => void;
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
  pixelResolution = 180,
  reducedMotion,
  crtEnabled,
  windowTitle,
  titleEmojis = '𐙚 ⊹₊⋆☆',
  headerTag,
  scale,
  onScaleChange,
  layoutMode = 'classic',
  onLayoutModeChange,
  isSpotifyConnected,
  spotifyPlayback,
  onPollSpotify,
  onOpenSpotifyModal,
  onOpenSettingsModal,
  isModalOpen = false,
}) => {

  // Local state for built-in audio fallback
  const [builtinTrack, setBuiltinTrack] = useState<BuiltinTrack>(lofiEngine.getTrack());
  const [builtinPlaying, setBuiltinPlaying] = useState(false);
  const [builtinPosition, setBuiltinPosition] = useState(0);
  const [showQueue, setShowQueue] = useState(false);

  const isCompactScale = scale === 'mini' || scale === 'tiny';
  const isMiniMode = layoutMode === 'card'
    ? (isCompactScale || (typeof window !== 'undefined' && window.innerWidth <= 280))
    : isCompactScale;

  // 7-Segment Digital Clock State (updates every second)
  const [digitalTime, setDigitalTime] = useState(getFormattedDigitalTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setDigitalTime(getFormattedDigitalTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Each path plays exactly one sound: the web fallbacks (stop / toggle mini) play their own.
  const handleCloseWindow = () => {
    if (window.electronAPI?.close) {
      playClickSound();
      window.electronAPI.close();
    } else {
      handleStop();
    }
  };

  const handleMinimizeWindow = () => {
    if (window.electronAPI?.minimize) {
      playClickSound();
      window.electronAPI.minimize();
    } else {
      handleToggleMini();
    }
  };

  const handleToggleMini = () => {
    playClickSound();
    // Collapse always goes to the smallest size so it never enlarges the window.
    const nextScale: PlayerScale = isMiniMode ? 'standard' : 'tiny';
    onScaleChange(nextScale);
  };

  // Draggable Corner Resize Handle with aspect ratio lock (screen coordinates prevent feedback jitter)
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playClickSound();

    const startX = e.screenX;
    const startY = e.screenY;
    const startW = window.innerWidth;
    const isCard = layoutMode === 'card';
    const aspectHOverW = isCard ? (460 / 320) : (410 / 720);
    const minW = isCard ? 220 : 360;
    const maxW = isCard ? 640 : 1440;

    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'se-resize';
    document.body.style.userSelect = 'none';

    let rafId: number | null = null;
    let pendingW = startW;
    let pendingH = Math.round(startW * aspectHOverW);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.screenX - startX;
      const deltaY = moveEvent.screenY - startY;
      // Single continuous projection along the resize diagonal: smooth, jitter-free
      const effectiveDelta = (deltaX + deltaY / aspectHOverW) / 2;

      pendingW = Math.max(minW, Math.min(maxW, Math.round(startW + effectiveDelta)));
      pendingH = Math.round(pendingW * aspectHOverW);

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (window.electronAPI?.setSize) {
            window.electronAPI.setSize(pendingW, pendingH);
          }
        });
      }
    };

    const handleMouseUp = () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (window.electronAPI?.setSize) {
        window.electronAPI.setSize(pendingW, pendingH);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const [builtinStarted, setBuiltinStarted] = useState(false);
  const [builtinVolume, setBuiltinVolume] = useState(() => Math.round(lofiEngine.getVolume() * 100));
  const [localShuffle, setLocalShuffle] = useState(() => lofiEngine.getShuffle());
  const [localRepeat, setLocalRepeat] = useState<'off' | 'track' | 'context'>(() => lofiEngine.getRepeat());
  const localRestoreVolume = useRef(Math.round(lofiEngine.getVolume() * 100) || 80);
  const spotifyRestoreVolume = useRef(80);
  const commandPending = useRef(false);
  const [status, setStatus] = useState('');
  const [seekDraft, setSeekDraft] = useState<number | null>(null);

  useEffect(() => {
    lofiEngine.setOnStateChange(() => {
      setBuiltinTrack(lofiEngine.getTrack());
      setBuiltinPlaying(lofiEngine.getIsPlaying());
      setBuiltinPosition(lofiEngine.getPosition());
    });
    return () => lofiEngine.setOnStateChange(null);
  }, []);

  useEffect(() => {
    if (isSpotifyConnected) lofiEngine.pause();
    setStatus('');
  }, [isSpotifyConnected]);

  // Optimistic volume state for zero-latency slider feedback
  const [optimisticVolume, setOptimisticVolume] = useState<number | null>(null);

  useEffect(() => {
    setOptimisticVolume(null);
  }, [spotifyPlayback?.device?.volume_percent]);

  const activeSpotifyItem = isSpotifyConnected ? spotifyPlayback?.item : null;
  const isPlaying = isSpotifyConnected ? Boolean(spotifyPlayback?.is_playing) : builtinPlaying;
  const localTrack = !isSpotifyConnected && builtinStarted ? builtinTrack : null;
  const currentTitle = activeSpotifyItem?.name ?? localTrack?.name ?? 'NOTHING PLAYING';
  const currentArtist = activeSpotifyItem?.artists?.map((artist) => artist.name).join(', ') ||
    activeSpotifyItem?.show?.name || localTrack?.artist ||
    (isSpotifyConnected ? 'PRESS PLAY OR SELECT A SONG' : 'PRESS PLAY TO START');
  const currentAlbum = activeSpotifyItem?.album?.name ?? localTrack?.album;
  const albumArtUrl = activeSpotifyItem?.album?.images?.[0]?.url ?? activeSpotifyItem?.images?.[0]?.url;
  const currentSpotifyUrl = activeSpotifyItem?.uri ? getSpotifyItemUrl(activeSpotifyItem.uri) : undefined;
  const durationMs = activeSpotifyItem?.duration_ms ?? (localTrack ? localTrack.duration * 1000 : 0);
  const progressMs = seekDraft ?? (isSpotifyConnected ? spotifyPlayback?.progress_ms ?? 0 : builtinPosition * 1000);
  const shuffleState = isSpotifyConnected ? spotifyPlayback?.shuffle_state ?? false : localShuffle;
  const repeatState = isSpotifyConnected ? spotifyPlayback?.repeat_state ?? 'off' : localRepeat;
  const remoteVolume = spotifyPlayback?.device?.volume_percent;
  const canSetVolume = !isSpotifyConnected || (
    typeof remoteVolume === 'number' && !spotifyPlayback?.device?.is_restricted &&
    spotifyPlayback?.device?.supports_volume !== false
  );
  const volume = isSpotifyConnected
    ? (optimisticVolume !== null ? optimisticVolume : remoteVolume ?? 0)
    : builtinVolume;
  const isMuted = canSetVolume && volume === 0;
  const activeVolumeBlocks = Math.ceil(volume / 20);

  const formatTime = (ms: number) => {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const runSpotifyCommand = async (command: () => Promise<boolean>, onFail?: () => void) => {
    if (commandPending.current) return;
    commandPending.current = true;
    setStatus('');
    try {
      const ok = await command();
      if (!ok) {
        setStatus('Spotify could not complete this action. Check your Premium account and playback device.');
        onFail?.();
      } else {
        setTimeout(() => { void onPollSpotify?.(); }, 200);
      }
    } catch {
      onFail?.();
    } finally {
      commandPending.current = false;
    }
  };

  const handleTogglePlay = () => {
    const nextPlaying = !isPlaying;
    if (!nextPlaying) playPauseSound();
    else playPlaySound();

    if (isSpotifyConnected) {
      return runSpotifyCommand(
        () => nextPlaying ? playSpotify() : pauseSpotify()
      );
    }
    setBuiltinStarted(true);
    lofiEngine.togglePlay();
  };

  const handleNext = () => {
    playSkipSound();
    if (isSpotifyConnected) return runSpotifyCommand(() => nextTrackSpotify());
    setBuiltinStarted(true);
    lofiEngine.nextTrack();
  };

  const handlePrev = () => {
    playSkipSound();
    if (isSpotifyConnected) return runSpotifyCommand(() => previousTrackSpotify());
    setBuiltinStarted(true);
    lofiEngine.previousTrack();
  };

  const handleStop = () => {
    playPauseSound();
    if (isSpotifyConnected) {
      setSeekDraft(0);
      if (isPlaying) {
        return runSpotifyCommand(
          async () => await pauseSpotify() && await seekSpotify(0),
          () => { setSeekDraft(null); }
        );
      }
      if (activeSpotifyItem) return runSpotifyCommand(() => seekSpotify(0), () => setSeekDraft(null));
      return;
    }
    lofiEngine.pause();
    lofiEngine.seek(0);
    setBuiltinStarted(false);
  };

  const seekTo = async (positionMs: number) => {
    if (!durationMs) return;
    const target = Math.max(0, Math.min(durationMs, positionMs));
    if (isSpotifyConnected) {
      setSeekDraft(target);
      await runSpotifyCommand(() => seekSpotify(target));
      setSeekDraft(null);
    } else {
      lofiEngine.seek(target / 1000);
      setSeekDraft(null);
    }
  };

  const handleVolumeChange = (value: number) => {
    playBlipSound();
    if (isSpotifyConnected) {
      setOptimisticVolume(value);
      return runSpotifyCommand(
        () => setVolumeSpotify(value),
        () => setOptimisticVolume(null)
      );
    }
    setBuiltinVolume(value);
    lofiEngine.setVolume(value / 100);
  };

  const handleToggleMute = () => {
    if (!canSetVolume) return;
    const restore = isSpotifyConnected ? spotifyRestoreVolume : localRestoreVolume;
    if (volume > 0) restore.current = volume;
    const target = volume === 0 ? restore.current : 0;
    void handleVolumeChange(target);
  };

  const handleToggleShuffle = () => {
    playClickSound();
    if (isSpotifyConnected) return runSpotifyCommand(() => toggleShuffleSpotify(!shuffleState));
    lofiEngine.setShuffle(!localShuffle);
    setLocalShuffle(!localShuffle);
  };

  const handleCycleRepeat = () => {
    playClickSound();
    const next = repeatState === 'off' ? 'context' : repeatState === 'context' ? 'track' : 'off';
    if (isSpotifyConnected) return runSpotifyCommand(() => setRepeatModeSpotify(next));
    lofiEngine.setRepeat(next);
    setLocalRepeat(next);
  };

  const handleTrackPlayed = () => {
    void onPollSpotify?.();
    setTimeout(() => { void onPollSpotify?.(); }, 400);
    setTimeout(() => { void onPollSpotify?.(); }, 1000);
    setTimeout(() => { void onPollSpotify?.(); }, 1800);
  };

  const keyHandler = useRef<(event: KeyboardEvent) => void>(() => {});
  keyHandler.current = (event) => {
    if (isModalOpen || event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable]')) return;
    if (event.code === 'Space' && target instanceof HTMLElement && target.closest('button, a')) return;
    switch (event.code) {
      case 'Space': handleTogglePlay(); break;
      case 'ArrowRight': handleNext(); break;
      case 'ArrowLeft': handlePrev(); break;
      case 'KeyM': handleToggleMute(); break;
      case 'KeyS': onOpenSpotifyModal(); break;
      default: return;
    }
    event.preventDefault();
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => keyHandler.current(event);
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  // Synchronize playback info with macOS menu bar tray item & MenuBar popover
  useEffect(() => {
    const cleanTitle = currentTitle === 'NOTHING PLAYING' ? '' : currentTitle;
    const cleanArtist = currentArtist.startsWith('PRESS PLAY') ? '' : currentArtist;

    if (window.electronAPI?.setPlaybackInfo) {
      window.electronAPI.setPlaybackInfo({
        title: cleanTitle,
        artist: cleanArtist,
        isPlaying,
      });
    }

    if (window.electronAPI?.broadcastPlaybackState) {
      window.electronAPI.broadcastPlaybackState({
        title: cleanTitle || 'PixelTunes',
        artist: cleanArtist || 'Ready to Play',
        album: currentAlbum || '',
        artworkUrl: albumArtUrl || '',
        durationMs,
        progressMs,
        isPlaying,
        volumePercent: volume,
        shuffleState,
        repeatState,
        isSpotifyConnected,
      });
    }
  }, [currentTitle, currentArtist, currentAlbum, albumArtUrl, durationMs, progressMs, isPlaying, volume, shuffleState, repeatState, isSpotifyConnected]);

  // Handle media actions triggered from macOS menu bar popover or tray context menu
  useEffect(() => {
    return window.electronAPI?.onPlaybackAction?.((action, payload) => {
      if (action === 'toggle') handleTogglePlay();
      else if (action === 'next') handleNext();
      else if (action === 'previous') handlePrev();
      else if (action === 'seek' && typeof payload?.positionMs === 'number') void seekTo(payload.positionMs);
      else if (action === 'volume' && typeof payload?.volumePercent === 'number') {
        void handleVolumeChange(payload.volumePercent);
      } else if (action === 'open-settings') {
        onOpenSettingsModal(null as any);
      }
    });
  }, [handleTogglePlay, handleNext, handlePrev, seekTo, handleVolumeChange, onOpenSettingsModal]);

  // Calculate progress percent
  const progressPercent = durationMs > 0 ? Math.max(0, Math.min(100, (progressMs / durationMs) * 100)) : 0;

  // Split title if it contains spaces to get the iconic stacked aesthetic from inspo
  const renderStackedTitle = (title: string) => {
    const words = title.split(' ');
    if (words.length <= 2) {
      return (
        <div className="font-pixel text-2xl font-bold tracking-wider leading-snug">
          <div className="truncate">{words[0]}</div>
          {words[1] && <div className="truncate">{words[1]}</div>}
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

  if (layoutMode === 'capsule') {
    return (
      <div
        className="w-full h-full relative select-none flex items-center justify-center overflow-hidden bg-transparent"
        style={{ fontFamily: '"Press Start 2P", monospace' }}
      >
        {crtEnabled && <div aria-hidden="true" className="absolute inset-0 crt-overlay z-40 pointer-events-none" />}
        <RetroCapsuleWidget
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onNext={handleNext}
          onPrevious={handlePrev}
          onOpenSettings={() => onOpenSettingsModal(null as any)}
          progressMs={progressMs}
          durationMs={durationMs}
          seekTo={seekTo}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          currentTitle={currentTitle}
          currentArtist={currentArtist}
          onCloseWindow={handleCloseWindow}
          onExpand={() => onLayoutModeChange?.('classic')}
        />
      </div>
    );
  }

  if (layoutMode === 'ipod') {
    return (
      <div
        className="w-full h-full relative select-none flex items-center justify-center overflow-hidden bg-transparent"
        style={{ fontFamily: '"Press Start 2P", monospace' }}
      >
        {crtEnabled && <div aria-hidden="true" className="absolute inset-0 crt-overlay z-40 pointer-events-none" />}
        <RetroIpodView
          layoutMode={layoutMode}
          onLayoutModeChange={onLayoutModeChange}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onNext={handleNext}
          onPrevious={handlePrev}
          onOpenSettings={() => onOpenSettingsModal(null as any)}
          progressMs={progressMs}
          durationMs={durationMs}
          seekTo={seekTo}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          currentTitle={currentTitle}
          currentArtist={currentArtist}
          currentAlbum={currentAlbum}
          albumArtUrl={albumArtUrl}
          currentSpotifyUrl={currentSpotifyUrl}
          isSpotifyConnected={isSpotifyConnected}
          onOpenSpotifyModal={onOpenSpotifyModal}
          shuffleState={shuffleState}
          onToggleShuffle={handleToggleShuffle}
          repeatState={repeatState}
          onCycleRepeat={handleCycleRepeat}
          onCloseWindow={handleCloseWindow}
          onMinimizeWindow={handleMinimizeWindow}
          artMode={artMode}
          pixelResolution={pixelResolution}
          theme={theme}
          reducedMotion={reducedMotion}
          showQueue={showQueue}
          onToggleQueue={() => setShowQueue(!showQueue)}
          activeSpotifyItem={activeSpotifyItem}
          localTrack={localTrack}
          onTrackPlayed={handleTrackPlayed}
          onBuiltinSelect={(index) => {
            setBuiltinStarted(true);
            lofiEngine.selectTrack(index);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="relative isolate w-full h-full border-4 shadow-pixel-lg select-none flex flex-col overflow-hidden shrink-0"
      style={{
        borderColor: theme.primaryBorder,
        backgroundColor: theme.windowBg,
        boxShadow: window.electronAPI?.isElectron ? 'none' : `6px 6px 0px 0px ${theme.primaryBorder}`,
      }}
    >
      {crtEnabled && <div aria-hidden="true" className="absolute inset-0 crt-overlay z-40 pointer-events-none" />}
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
        <div className="flex items-center gap-2 min-w-0">
          {/* 3 Retro Glossy Candy Buttons - NO DRAG */}
          <div className="flex items-center gap-1.5 mr-2 shrink-0 app-no-drag" style={{ WebkitAppRegion: 'no-drag' as any }}>
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

          {/* Title and Text Emojis - DRAGGABLE */}
          <div className="player-heading flex items-center gap-2 min-w-0 select-none pointer-events-none">
            <span className="font-pixel text-xs font-bold tracking-widest text-[#191244] truncate">
              {windowTitle}
            </span>
            {titleEmojis && (
              <span
                className="title-emojis max-w-[190px] truncate text-xs font-semibold tracking-wide leading-none text-[#191244]"
                style={{
                  fontFamily: '"Apple Symbols", "Noto Sans Linear A", "Segoe UI Emoji", -apple-system, sans-serif',
                }}
              >
                {titleEmojis}
              </span>
            )}
          </div>
        </div>

        {/* Center Draggable Spacer */}
        <div className="flex-1 h-full min-w-4 pointer-events-none" />

        {/* Right Header: 7-Segment Digital Clock (24h) & Actions */}
        <div className="flex items-center gap-2">
          {/* Digital Clock - DRAGGABLE */}
          <div
            className={`text-sm font-bold text-[#191244] select-none items-center pointer-events-none mr-1 ${
              layoutMode === 'card' && isCompactScale ? 'hidden' : 'flex'
            }`}
            title="Local Time (24h)"
          >
            <span
              className="italic tracking-wider"
              style={{ fontFamily: '"DSEG7Classic", monospace' }}
            >
              {digitalTime.time}
            </span>
          </div>

          {/* Interactive Action Buttons - NO DRAG */}
          <div className="flex items-center gap-1.5 app-no-drag" style={{ WebkitAppRegion: 'no-drag' as any }}>
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
              onClick={(event) => {
                playClickSound();
                onOpenSettingsModal(event.currentTarget);
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Player Body: Conditional on Layout Mode */}
      {layoutMode === 'card' ? (
        /* Music Card (Portrait) Layout matching user's Polaroid/Music Card reference */
        <div className="player-card flex-1 min-h-0 flex flex-col items-center justify-between p-3.5 overflow-hidden w-full h-full select-none">
          {/* Framed Artwork Window / Queue Screen */}
          <div
            className="w-[230px] h-[230px] border-4 p-1.5 shadow-pixel-sm shrink-0 relative overflow-hidden"
            style={{ borderColor: theme.primaryBorder, backgroundColor: theme.accentPeriwinkle }}
          >
            <div className="w-full h-full border-2 border-[#191244] relative group overflow-hidden bg-[#191244]">
              {showQueue ? (
                <div className="w-full h-full bg-[#fffdf5] flex flex-col overflow-hidden">
                  <RetroQueueView
                    isSpotifyConnected={isSpotifyConnected}
                    onClose={() => setShowQueue(false)}
                    onOpenSpotifyModal={onOpenSpotifyModal}
                    currentTrack={activeSpotifyItem}
                    onTrackPlayed={handleTrackPlayed}
                    currentBuiltinId={localTrack?.id}
                    onBuiltinSelect={(index) => {
                      setBuiltinStarted(true);
                      lofiEngine.selectTrack(index);
                    }}
                  />
                </div>
              ) : (
                <>
                  <PixelCanvas
                    isPlaying={isPlaying}
                    reducedMotion={reducedMotion}
                    albumArtUrl={albumArtUrl}
                    albumArtLink={currentSpotifyUrl}
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
                  {/* Subtle View Playlist Pill on Hover */}
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowQueue(true);
                    }}
                    className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-[#fffdf5]/90 hover:bg-[#fffdf5] text-[#191244] border border-[#191244] font-pixel text-[6.5px] font-bold shadow-pixel-xs transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="View Playlist Queue"
                  >
                    ♫ PLAYLIST
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Song Title & Artist Display */}
          <div className="text-center w-full px-2 mt-1 min-w-0">
            <div
              className="font-pixel text-[9.5px] font-bold truncate tracking-wider"
              style={{ color: theme.textColor }}
              title={currentTitle}
            >
              {currentTitle}
            </div>
            <div
              className="font-silkscreen text-[7.5px] font-bold tracking-wider truncate opacity-75 mt-0.5"
              style={{ color: theme.textColor }}
              title={currentArtist}
            >
              {currentArtist}
            </div>
          </div>

          {/* Centered Playback Controls: Previous, Play/Pause, Next */}
          <div className="flex items-center justify-center gap-7 my-1 shrink-0">
            {/* Previous Track Button */}
            <button
              type="button"
              onClick={handlePrev}
              title="Previous Track"
              className="hover:scale-110 active:translate-y-0.5 transition-transform cursor-pointer p-1"
              style={{ color: theme.primaryBorder }}
            >
              <svg width="22" height="18" viewBox="0 0 22 18" fill="currentColor">
                <rect x="0" y="1" width="3.5" height="16" />
                <polygon points="11,1 3,9 11,17" />
                <polygon points="19,1 11,9 19,17" />
              </svg>
            </button>

            {/* Play / Pause Button */}
            <button
              type="button"
              onClick={handleTogglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              className="hover:scale-110 active:translate-y-0.5 transition-transform cursor-pointer p-1"
              style={{ color: theme.primaryBorder }}
            >
              {isPlaying ? (
                /* Dual Chunky Pause Bars matching user's image */
                <svg width="22" height="20" viewBox="0 0 22 20" fill="currentColor">
                  <rect x="4" y="1" width="5" height="18" />
                  <rect x="13" y="1" width="5" height="18" />
                </svg>
              ) : (
                /* Chunky Play Triangle */
                <svg width="22" height="20" viewBox="0 0 22 20" fill="currentColor">
                  <polygon points="5,1 19,10 5,19" />
                </svg>
              )}
            </button>

            {/* Next Track Button */}
            <button
              type="button"
              onClick={handleNext}
              title="Next Track"
              className="hover:scale-110 active:translate-y-0.5 transition-transform cursor-pointer p-1"
              style={{ color: theme.primaryBorder }}
            >
              <svg width="22" height="18" viewBox="0 0 22 18" fill="currentColor">
                <polygon points="3,1 11,9 3,17" />
                <polygon points="11,1 19,9 11,17" />
                <rect x="18.5" y="1" width="3.5" height="16" />
              </svg>
            </button>
          </div>

          {/* Retro Horizontal Scrubber Bar */}
          <div className="w-full px-4 shrink-0">
            <input
              type="range"
              aria-label="Playback position"
              aria-valuetext={formatTime(progressMs)}
              className="pixel-scrubber w-full"
              style={{
                '--progress': `${progressPercent}%`,
                '--fill': theme.accentPink,
                '--edge': theme.primaryBorder,
              } as React.CSSProperties}
              min={0}
              max={durationMs || 1}
              step={1}
              value={Math.min(progressMs, durationMs)}
              disabled={!durationMs}
              onChange={(e) => {
                setSeekDraft(Number(e.target.value));
              }}
              onPointerUp={(e) => {
                void seekTo(Number(e.currentTarget.value));
              }}
              onKeyUp={(e) => {
                void seekTo(Number(e.currentTarget.value));
              }}
            />
            <div className="flex justify-between font-silkscreen text-[7px] mt-0.5 opacity-70 px-0.5 font-bold" style={{ color: theme.textColor }}>
              <span>{formatTime(progressMs)}</span>
              <span>{formatTime(durationMs)}</span>
            </div>
          </div>

          {/* Bottom Card Utility Row: Playlist View Button & Quick Actions */}
          <div className="flex items-center justify-between w-full px-4 pt-1 border-t border-[#191244]/15 shrink-0 text-[8px]">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowQueue((prev) => !prev);
              }}
              className="px-2 py-0.5 bg-[#fffdf5] text-[#191244] border border-[#191244] shadow-pixel-xs font-pixel text-[7px] font-bold hover:bg-[#9df0cf] active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>♫</span>
              <span>{showQueue ? 'COVER' : 'PLAYLIST'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleShuffle}
                className={`p-1 font-pixel text-[7.5px] cursor-pointer hover:scale-110 transition-transform ${
                  shuffleState ? 'text-[#ff7b90] font-bold' : 'opacity-60'
                }`}
                title={`Shuffle: ${shuffleState ? 'ON' : 'OFF'}`}
                style={{ color: shuffleState ? (theme.accentPink || '#ffd269') : theme.textColor }}
              >
                🔀
              </button>
              <button
                type="button"
                onClick={handleCycleRepeat}
                className={`p-1 font-pixel text-[7.5px] cursor-pointer hover:scale-110 transition-transform ${
                  repeatState !== 'off' ? 'text-[#ff7b90] font-bold' : 'opacity-60'
                }`}
                title={`Repeat: ${repeatState.toUpperCase()}`}
                style={{ color: repeatState !== 'off' ? (theme.accentPink || '#ffd269') : theme.textColor }}
              >
                🔁
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Main Player Body: Permanent 2-Column Split (Classic Layout) */
        <div className="player-body flex-1 min-h-0 flex items-center overflow-hidden w-full h-full">
        {/* Left Column: Playlist Screen OR Album Cover */}
        {showQueue ? (
          /* Full-Height Playlist Screen fitted directly to borders with NO space up and down */
          <div className="player-library w-[240px] h-full border-r-4 border-[#191244] bg-[#fffdf5] shrink-0 flex flex-col overflow-hidden">
            <RetroQueueView
              isSpotifyConnected={isSpotifyConnected}
              onClose={() => setShowQueue(false)}
              onOpenSpotifyModal={onOpenSpotifyModal}
              currentTrack={activeSpotifyItem}
              onTrackPlayed={handleTrackPlayed}
              currentBuiltinId={localTrack?.id}
              onBuiltinSelect={(index) => {
                setBuiltinStarted(true);
                lofiEngine.selectTrack(index);
              }}
            />
          </div>
        ) : (
          /* Album Cover View */
          <div className="player-cover w-[240px] h-full flex flex-col items-center justify-center p-4 pr-1 shrink-0">
            {/* Pixel Card Container with Double Border */}
            <div
              className="w-[210px] h-[210px] border-4 p-1.5 bg-[#8fa2d4] shadow-pixel-sm shrink-0"
              style={{ borderColor: theme.primaryBorder, backgroundColor: theme.accentPeriwinkle }}
            >
              <div className="w-full h-full border-2 border-[#191244] relative group overflow-hidden">
                <PixelCanvas
                  isPlaying={isPlaying}
                  reducedMotion={reducedMotion}
                  albumArtUrl={albumArtUrl}
                  albumArtLink={currentSpotifyUrl}
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
        <div className="player-controls flex-1 min-w-0 p-4 flex flex-col justify-center h-full">
          <div className="flex flex-col justify-between py-0.5 h-[245px]">
            {/* Song Title & Artist Display */}
            <div className="text-left space-y-0.5">
              <div
                className="select-text" title={currentTitle}
                style={{ color: theme.textColor }}
              >
                {renderStackedTitle(currentTitle)}
              </div>
              <div className="font-silkscreen text-xs font-bold tracking-wider truncate" title={currentArtist} style={{ color: theme.textColor }}>
                {currentArtist}
              </div>
              {currentAlbum && (
                <div className="font-silkscreen text-[10px] truncate" title={currentAlbum} style={{ color: theme.textColor }}>
                  {currentAlbum}
                </div>
              )}
            </div>

            <div className="sr-only" role="status" aria-live="polite">{status}</div>
            {status && <p aria-hidden="true" className="text-[10px] font-bold" style={{ color: theme.textColor }}>{status}</p>}

            {/* Scrubber & Playback Controls Grouped Together (Shifted Upwards) */}
            <div className="space-y-1.5 -mt-1">
              {/* Retro Progress Bar & Scrubber */}
              <div className="space-y-0.5">
                <input
                  type="range"
                  aria-label="Playback position"
                  aria-valuetext={formatTime(progressMs)}
                  className="pixel-scrubber"
                  style={{ '--progress': `${progressPercent}%`, '--fill': theme.accentPink,
                    '--edge': theme.primaryBorder } as React.CSSProperties}
                  min={0}
                  max={durationMs || 1}
                  step={1}
                  value={Math.min(progressMs, durationMs)}
                  disabled={!durationMs}
                  onChange={(event) => setSeekDraft(Number(event.target.value))}
                  onPointerUp={(event) => { void seekTo(Number(event.currentTarget.value)); }}
                  onPointerCancel={() => setSeekDraft(null)}
                  onKeyUp={(event) => {
                    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
                      void seekTo(Number(event.currentTarget.value));
                    }
                  }}
                  onKeyDown={(event) => {
                    const direction = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1
                      : ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : 0;
                    if (!direction) return;
                    event.preventDefault();
                    setSeekDraft((current) => Math.min(durationMs, Math.max(0, (current ?? progressMs) + direction * 5000)));
                  }}
                />

                {/* Time Indicators */}
                <div className="flex justify-between font-silkscreen text-[10px] tracking-widest" style={{ color: theme.textColor }}>
                  <span>{formatTime(progressMs)}</span>
                  <span>{formatTime(durationMs)}</span>
                </div>
              </div>

              {/* EXACT Playback Controls Row: [⏪] [⏮] ( [❚❚] ) [⏭] [⏩] (Enlarged Size) */}
              <div className="flex items-center justify-center gap-2.5 pt-0.5 pb-0.5 select-none">
                {/* Rewind 10s (⏪) */}
                <button
                  onClick={() => { void seekTo(progressMs - 10000); }}
                  disabled={!durationMs}
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
                  onClick={() => { void seekTo(progressMs + 10000); }}
                  disabled={!durationMs}
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
                  disabled={!canSetVolume}
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
                        onClick={() => { void handleVolumeChange((idx + 1) * 20); }}
                        disabled={!canSetVolume}
                        aria-pressed={volume === (idx + 1) * 20}
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
                  {canSetVolume ? `${volume}%` : '—'}
                </span>

                <div className="ml-auto flex items-center gap-1.5">
                  {/* Pixel Shuffle Button */}
                  <button
                    type="button"
                    onClick={handleToggleShuffle}
                    aria-pressed={shuffleState}
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
                    onClick={(event) => {
                      playClickSound();
                      onOpenSpotifyModal(event.currentTarget);
                    }}
                    className="font-pixel text-[8px] px-2 h-[20px] bg-[#fffdf5] border-2 rounded-[2px] hover:bg-[#9df0cf] transition-all cursor-pointer whitespace-nowrap active:translate-y-0.5 flex items-center"
                    style={{
                      borderColor: theme.primaryBorder,
                      boxShadow: `1px 1px 0px ${theme.primaryBorder}`,
                      color: theme.controlBtnText,
                    }}
                  >
                    {isSpotifyConnected ? 'SPOTIFY' : '+ SPOTIFY'}
                  </button>
                </div>
              </div>

              {/* Pixel Equalizer Visualizer */}
              <div className="pt-0.5">
                <PixelVisualizer isPlaying={isPlaying} reducedMotion={reducedMotion} barCount={18} />
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Interactive Draggable Corner Resize Handle (Retro ◢ Grip) */}
      {window.electronAPI?.isElectron && <div
        onMouseDown={handleResizeMouseDown}
        title="Click and drag corner to resize player"
        className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize flex flex-col justify-end items-end p-0.5 opacity-60 hover:opacity-100 select-none z-20 group app-no-drag"
        style={{ WebkitAppRegion: 'no-drag' as any }}
      >
        <div className="w-1 h-1 bg-[#191244] mb-0.5 mr-0.5 group-hover:bg-[#fec5db]" />
        <div className="flex gap-0.5">
          <div className="w-1 h-1 bg-[#191244] group-hover:bg-[#fec5db]" />
          <div className="w-1 h-1 bg-[#191244] group-hover:bg-[#fec5db]" />
        </div>
      </div>}
    </div>
  );
};

