import React, { useState, useEffect, useRef } from 'react';
import { PixelCanvas } from './PixelCanvas';
import { RetroQueueView } from './RetroQueueView';
import { playClickSound, playBlipSound } from '../../shared/services/soundEffects';
import { RetroTheme } from '../../types/theme';
import { PlayerLayoutMode } from '../../types/scale';
import type { SpotifyPlaybackState, SpotifyTrack } from '../../types/spotify';

interface RetroIpodViewProps {
  layoutMode?: PlayerLayoutMode;
  onLayoutModeChange?: (mode: PlayerLayoutMode) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onOpenSettings: () => void;
  progressMs: number;
  durationMs: number;
  seekTo: (ms: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  currentTitle: string;
  currentArtist: string;
  currentAlbum?: string;
  albumArtUrl?: string;
  currentSpotifyUrl?: string;
  isSpotifyConnected: boolean;
  onOpenSpotifyModal: (opener: HTMLElement) => void;
  shuffleState: boolean;
  onToggleShuffle: () => void;
  repeatState: 'off' | 'context' | 'track';
  onCycleRepeat: () => void;
  onCloseWindow?: () => void;
  onMinimizeWindow?: () => void;
  artMode: 'pixelCovers' | 'pixelArt' | 'cassette' | 'inspo' | 'saturn';
  pixelResolution: number;
  theme: RetroTheme;
  reducedMotion?: boolean;
  showQueue: boolean;
  onToggleQueue: () => void;
  activeSpotifyItem?: SpotifyPlaybackState['item'];
  localTrack?: { id: string; name: string; artist: string; album?: string; duration: number } | null;
  onTrackPlayed?: () => void;
  onBuiltinSelect?: (index: number) => void;
}

function formatTime(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export const RetroIpodView: React.FC<RetroIpodViewProps> = ({
  layoutMode,
  onLayoutModeChange,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrevious,
  onOpenSettings,
  progressMs,
  durationMs,
  seekTo,
  volume,
  onVolumeChange,
  currentTitle,
  currentArtist,
  currentAlbum,
  albumArtUrl,
  currentSpotifyUrl,
  isSpotifyConnected,
  onOpenSpotifyModal,
  shuffleState,
  onToggleShuffle,
  onCloseWindow,
  onMinimizeWindow,
  artMode,
  pixelResolution,
  theme,
  reducedMotion,
  showQueue,
  onToggleQueue,
  activeSpotifyItem,
  localTrack,
  onTrackPlayed,
  onBuiltinSelect,
}) => {
  // Screen mode: 'menu' (classic iPod list) or 'nowPlaying' (classic color Now Playing) or 'queue'
  const [screenMode, setScreenMode] = useState<'menu' | 'nowPlaying' | 'queue'>('nowPlaying');
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);
  const [backlightMode, setBacklightMode] = useState<'grayWhite' | 'cyan' | 'pink'>('grayWhite');

  useEffect(() => {
    if (isPlaying) {
      setScreenMode('nowPlaying');
    }
  }, [isPlaying, currentTitle]);

  // Menu items exactly like reference image + interactive options
  const menuItems = [
    { label: 'Now Playing', hasArrow: true, action: () => setScreenMode('nowPlaying') },
    { label: isSpotifyConnected ? 'Playlists' : 'Lo-Fi Library', hasArrow: true, action: () => setScreenMode('queue') },
    { label: 'Settings', hasArrow: true, action: onOpenSettings },
    {
      label: `Shuffle: ${shuffleState ? 'ON' : 'OFF'}`,
      hasArrow: false,
      action: () => {
        playClickSound();
        onToggleShuffle();
      },
    },
    {
      label: `Backlight: ${backlightMode === 'grayWhite' ? 'OFF' : backlightMode.toUpperCase()}`,
      hasArrow: false,
      action: () => {
        playClickSound();
        setBacklightMode((prev) => (prev === 'grayWhite' ? 'cyan' : prev === 'cyan' ? 'pink' : 'grayWhite'));
      },
    },
    {
      label: 'Layout: Classic ◫',
      hasArrow: true,
      action: () => {
        playClickSound();
        onLayoutModeChange?.('classic');
      },
    },
  ];

  const handleMenuClick = () => {
    playClickSound();
    if (screenMode === 'queue') {
      setScreenMode('menu');
    } else if (screenMode === 'nowPlaying') {
      setScreenMode('menu');
    } else {
      // Toggle to Now Playing or open Settings
      setScreenMode('nowPlaying');
    }
  };

  const handleCenterClick = () => {
    playClickSound();
    if (screenMode === 'menu') {
      menuItems[selectedMenuIndex].action();
    } else if (screenMode === 'nowPlaying') {
      onTogglePlay();
    }
  };

  // Scroll wheel navigation on click wheel
  const handleWheelNav = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      // Scroll down
      playBlipSound();
      if (screenMode === 'menu') {
        setSelectedMenuIndex((prev) => (prev + 1) % menuItems.length);
      } else {
        onVolumeChange(Math.max(0, volume - 5));
      }
    } else if (e.deltaY < 0) {
      // Scroll up
      playBlipSound();
      if (screenMode === 'menu') {
        setSelectedMenuIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      } else {
        onVolumeChange(Math.min(100, volume + 5));
      }
    }
  };

  // LCD Backlight colors
  const lcdBg =
    backlightMode === 'grayWhite'
      ? 'bg-[#e2e6eb]'
      : backlightMode === 'cyan'
      ? 'bg-[#b6d4e2]'
      : 'bg-[#ead0db]';

  const lcdText = '#121e2d';

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none overflow-hidden p-2">
      {/* Outer iPod mini Body */}
      <div
        className="relative w-[260px] h-[460px] rounded-[30px] border-4 border-[#191244] shadow-pixel-lg flex flex-col items-center justify-between overflow-hidden"
        style={{
          backgroundColor: '#e6739f',
          backgroundImage:
            'linear-gradient(90deg, #ffa8c8 0%, #ff8db7 4%, #e6739f 12%, #e6739f 88%, #c94c7b 96%, #9c2854 100%)',
        }}
      >
        {/* Left specular highlight dither stripe */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-white/35 to-transparent pointer-events-none" />
        {/* Right shadow dither stripe */}
        <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-gradient-to-l from-black/25 to-transparent pointer-events-none" />

        {/* Top Metallic Cap with Hold Switch & Headphone Jack (Draggable Area) */}
        <div
          className="w-full h-7 bg-[#d2d6dc] border-b-2 border-[#191244] flex items-center justify-between px-3.5 shrink-0 relative z-30 cursor-grab active:cursor-grabbing app-drag"
          style={{ WebkitAppRegion: 'drag' as any }}
        >
          {/* Hold Switch (Left) */}
          <div
            className="flex items-center gap-1.5 cursor-pointer app-no-drag"
            onClick={onMinimizeWindow}
            title="Minimize Window (Hold Switch)"
            style={{ WebkitAppRegion: 'no-drag' as any }}
          >
            <div className="w-5 h-2.5 bg-[#40454d] border border-[#191244] rounded-sm p-[1px] flex items-center">
              <div className="w-2 h-full bg-[#ff7b90] rounded-[1px] shadow-sm" />
            </div>
            <span className="font-pixel text-[6.5px] font-bold text-[#40454d] tracking-wider">HOLD</span>
          </div>

          {/* Center Apple Logo / iPod Mini branding */}
          <div className="flex items-center gap-1 opacity-70">
            <span className="font-pixel text-[7.5px] font-bold text-[#20252b] tracking-widest">iPod</span>
          </div>

          {/* Controls: Settings, Layout, Close (Right) */}
          <div
            className="flex items-center gap-1.5 app-no-drag"
            style={{ WebkitAppRegion: 'no-drag' as any }}
          >
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-1 py-0.5 bg-[#fffdf5] border border-[#191244] font-pixel text-[6.5px] font-bold text-[#191244] hover:bg-[#ffe6f0] active:translate-y-0.5 transition-all cursor-pointer shadow-pixel-xs"
              title="Open Settings"
            >
              ⚙
            </button>
            <button
              type="button"
              onClick={() => onLayoutModeChange?.('classic')}
              className="px-1 py-0.5 bg-[#fffdf5] border border-[#191244] font-pixel text-[6.5px] font-bold text-[#191244] hover:bg-[#9df0cf] active:translate-y-0.5 transition-all cursor-pointer shadow-pixel-xs"
              title="Switch to Classic Layout"
            >
              ◫
            </button>
            <button
              type="button"
              onClick={onCloseWindow}
              className="w-3.5 h-3.5 rounded-full bg-[#191244] border border-[#fffdf5]/50 flex items-center justify-center text-[7px] text-white hover:bg-[#ff7b90] transition-colors cursor-pointer"
              title="Close Player"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Inset LCD Screen Bezel */}
        <div className="w-[220px] h-[175px] mt-2 border-3 border-[#191244] rounded-[6px] shadow-inner p-1.5 bg-[#b8bec5] flex flex-col shrink-0 relative overflow-hidden">
          {/* LCD Screen Display */}
          <div
            className={`w-full h-full border border-[#191244]/40 rounded-[3px] flex flex-col overflow-hidden relative ${
              screenMode === 'nowPlaying' ? 'bg-[#ebedef] text-[#111]' : `${lcdBg} text-[#121e2d]`
            }`}
            style={{ color: screenMode === 'nowPlaying' ? '#111' : lcdText }}
          >
            {/* LCD Screen Header Bar */}
            {screenMode === 'nowPlaying' ? (
              <div className="h-[21px] px-2 bg-gradient-to-b from-[#eaebee] via-[#dfe2e6] to-[#cbcfd4] border-b border-[#adb1b7] flex items-center justify-between shrink-0 select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                {/* Left: "Now Playing" */}
                <span className="font-sans font-bold text-[10px] text-[#222] tracking-tight">
                  Now Playing
                </span>

                {/* Right: "100%" + Battery */}
                <div className="flex items-center gap-1">
                  <span className="font-sans font-semibold text-[9px] text-[#333]">100%</span>
                  <div className="flex items-center">
                    <div className="w-[16px] h-[8px] border border-[#555] rounded-[1.5px] p-[1px] bg-white flex items-center">
                      <div className="w-full h-full bg-[#5fc73b] rounded-[0.5px]" />
                    </div>
                    <div className="w-[1.5px] h-[3.5px] bg-[#555] rounded-r-[0.5px] -ml-[0.5px]" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-5 px-2 border-b border-[#121e2d]/30 flex items-center justify-between shrink-0 font-pixel text-[8.5px] font-bold bg-[#121e2d]/10">
                {/* Play / Pause indicator */}
                <div className="flex items-center gap-1 w-6">
                  <span>{isPlaying ? '▶' : '❚❚'}</span>
                </div>

                {/* Title */}
                <div className="truncate text-center flex-1 font-pixel tracking-wide text-[8.5px]">
                  {screenMode === 'menu' ? 'iPod mini' : 'Playlists'}
                </div>

                {/* Battery Indicator */}
                <div className="w-5 flex items-center justify-end">
                  <div className="w-3.5 h-2 border border-[#121e2d] rounded-[1px] p-[1px] flex gap-[1px]">
                    <div className="w-1 h-full bg-[#121e2d]" />
                    <div className="w-1 h-full bg-[#121e2d]" />
                  </div>
                  <div className="w-[1px] h-1 bg-[#121e2d]" />
                </div>
              </div>
            )}

            {/* LCD Screen Content Area */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              {screenMode === 'menu' ? (
                /* Classic iPod Menu List View */
                <div className="flex-1 flex flex-col justify-start py-1 px-0.5 overflow-hidden font-pixel">
                  {menuItems.map((item, idx) => {
                    const isSelected = selectedMenuIndex === idx;
                    return (
                      <div
                        key={item.label}
                        onClick={() => {
                          setSelectedMenuIndex(idx);
                          item.action();
                        }}
                        className={`h-5 px-2 flex items-center justify-between cursor-pointer font-bold text-[8.5px] transition-colors ${
                          isSelected
                            ? 'bg-[#1b3560] text-white'
                            : 'hover:bg-[#121e2d]/10 text-[#121e2d]'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.hasArrow && <span className="font-silkscreen text-[8px] pl-1">›</span>}
                      </div>
                    );
                  })}
                </div>
              ) : screenMode === 'nowPlaying' ? (
                /* iPod Color Now Playing Screen */
                <div
                  className="flex-1 flex flex-col justify-between px-2.5 pt-2 pb-1.5 cursor-pointer bg-[#ebedef] select-none"
                  onClick={() => setScreenMode('menu')}
                  title="Click to view Menu"
                >
                  {/* Middle content: Track metadata & Album Art */}
                  <div className="flex items-start justify-between gap-2 flex-1 min-h-0 pt-1">
                    {/* Left: Metadata */}
                    <div className="flex-1 min-w-0 pr-1 flex flex-col justify-start">
                      <div
                        className="font-sans font-extrabold text-[13px] text-[#111] leading-[1.18] line-clamp-2 break-words"
                        title={currentTitle}
                      >
                        {currentTitle || 'No Track Playing'}
                      </div>
                      <div
                        className="font-sans font-semibold text-[10px] text-[#333] mt-1.5 line-clamp-1 truncate"
                        title={currentArtist}
                      >
                        {currentArtist || 'Unknown Artist'}
                      </div>
                      {currentAlbum && (
                        <div
                          className="font-sans text-[8.5px] text-[#666] mt-0.5 line-clamp-1 truncate"
                          title={currentAlbum}
                        >
                          {currentAlbum}
                        </div>
                      )}
                    </div>

                    {/* Right: Square Album Artwork */}
                    <div className="w-[90px] h-[90px] shrink-0 rounded-[5px] border border-black/25 shadow-[0_2px_5px_rgba(0,0,0,0.3)] overflow-hidden bg-[#191244] relative">
                      {albumArtUrl ? (
                        <img
                          src={albumArtUrl}
                          alt={currentTitle}
                          className="w-full h-full object-cover select-none pointer-events-none"
                        />
                      ) : (
                        <PixelCanvas
                          isPlaying={isPlaying}
                          reducedMotion={reducedMotion ?? false}
                          mode={artMode}
                          pixelResolution={pixelResolution}
                          trackTitle={currentTitle}
                          artistName={currentArtist}
                          themeColors={{
                            navy: '#121e2d',
                            pink: '#d8a8be',
                            periwinkle: '#8fa7b6',
                            cream: '#fffdf5',
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Bottom: Progress Bar & Timestamps */}
                  <div className="w-full flex items-center gap-2 pt-1 pb-0.5 shrink-0 select-none">
                    <span className="font-sans text-[8.5px] font-semibold text-[#444] min-w-[24px] text-left">
                      {formatTime(progressMs)}
                    </span>

                    <div
                      className="flex-1 h-[6px] bg-[#cbced4] rounded-full border border-[#b8bac0] relative overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (durationMs > 0 && seekTo) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickPos = (e.clientX - rect.left) / rect.width;
                          seekTo(Math.floor(clickPos * durationMs));
                        }
                      }}
                      title="Seek position"
                    >
                      <div
                        className="h-full bg-gradient-to-r from-[#2f669f] to-[#4279b3] rounded-full transition-all duration-150"
                        style={{
                          width: `${durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0}%`,
                        }}
                      />
                    </div>

                    <span className="font-sans text-[8.5px] font-semibold text-[#444] min-w-[28px] text-right">
                      -{formatTime(Math.max(0, durationMs - progressMs))}
                    </span>
                  </div>
                </div>
              ) : (
                /* Embedded Playlists / Library Queue View inside LCD Screen */
                <div className="flex-1 w-full h-full bg-[#fffdf5] overflow-hidden flex flex-col">
                  <RetroQueueView
                    isSpotifyConnected={isSpotifyConnected}
                    onClose={() => setScreenMode('menu')}
                    onOpenSpotifyModal={onOpenSpotifyModal}
                    currentTrack={activeSpotifyItem}
                    onTrackPlayed={onTrackPlayed || (() => {})}
                    currentBuiltinId={localTrack?.id}
                    onBuiltinSelect={onBuiltinSelect || (() => {})}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Click Wheel Area */}
        <div
          className="w-full flex-1 flex items-center justify-center pb-3 pt-1 select-none"
          onWheel={handleWheelNav}
        >
          {/* The Classic White Click Wheel Disc */}
          <div className="relative w-[138px] h-[138px] rounded-full bg-[#fbfbfa] border-3 border-[#191244] shadow-pixel-md flex items-center justify-center">
            {/* Top Quadrant: MENU */}
            <button
              type="button"
              onClick={handleMenuClick}
              className="absolute top-2 inset-x-0 mx-auto font-pixel text-[8.5px] font-bold text-[#b43c6d] hover:text-[#8d2853] active:scale-95 transition-transform cursor-pointer tracking-wider"
              title="Menu / Back"
            >
              MENU
            </button>

            {/* Bottom Quadrant: PLAY / PAUSE (▶||) */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onTogglePlay();
              }}
              className="absolute bottom-2.5 inset-x-0 mx-auto font-pixel text-[9px] font-bold text-[#b43c6d] hover:text-[#8d2853] active:scale-95 transition-transform cursor-pointer tracking-tighter"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              ▶❚❚
            </button>

            {/* Left Quadrant: PREVIOUS (|◀◀) */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onPrevious();
              }}
              className="absolute left-2.5 inset-y-0 my-auto h-5 font-pixel text-[9px] font-bold text-[#b43c6d] hover:text-[#8d2853] active:scale-95 transition-transform cursor-pointer flex items-center tracking-tighter"
              title="Previous Track"
            >
              ❚◀◀
            </button>

            {/* Right Quadrant: NEXT (▶▶|) */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onNext();
              }}
              className="absolute right-2.5 inset-y-0 my-auto h-5 font-pixel text-[9px] font-bold text-[#b43c6d] hover:text-[#8d2853] active:scale-95 transition-transform cursor-pointer flex items-center tracking-tighter"
              title="Next Track"
            >
              ▶▶❚
            </button>

            {/* Center Action Button */}
            <button
              type="button"
              onClick={handleCenterClick}
              className="w-[46px] h-[46px] rounded-full bg-[#d6d8db] border-2 border-[#191244] shadow-inner hover:bg-[#e4e6e9] active:scale-90 transition-all cursor-pointer flex items-center justify-center"
              title="Select / Confirm"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#191244]/20" />
            </button>
          </div>
        </div>

        {/* Bottom Dock Connector outline & rim */}
        <div className="w-full h-3 bg-[#d2d6dc] border-t-2 border-[#191244] flex items-center justify-center shrink-0">
          <div className="w-10 h-1 bg-[#191244]/50 rounded-[1px]" />
        </div>
      </div>
    </div>
  );
};

export default RetroIpodView;
