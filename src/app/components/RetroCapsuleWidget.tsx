import React, { useState } from 'react';
import { playClickSound } from '../../shared/services/soundEffects';

interface RetroCapsuleWidgetProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onOpenSettings?: (opener?: HTMLElement | null) => void;
  progressMs: number;
  durationMs: number;
  seekTo?: (ms: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  currentTitle: string;
  currentArtist: string;
  onCloseWindow?: () => void;
  /** Tooltip/accessible name for the ✕ button; defaults to what it does on this platform. */
  closeLabel?: string;
  onExpand?: () => void;
}

function formatTime(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export const RetroCapsuleWidget: React.FC<RetroCapsuleWidgetProps> = ({
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
  onCloseWindow,
  closeLabel,
  onExpand,
}) => {
  const resolvedCloseLabel = closeLabel
    ?? (typeof window !== 'undefined' && window.electronAPI ? 'Close Window' : 'Stop Playback');
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const displayArtist = currentArtist.startsWith('PRESS PLAY') ? 'PixelTunes' : currentArtist;
  const displayTitle = currentTitle === 'NOTHING PLAYING' ? 'Lo-Fi Chill Radio' : currentTitle;

  return (
    <div className="w-full h-full flex items-center justify-center select-none overflow-hidden" style={{ WebkitAppRegion: 'no-drag' as any }}>
      {/* Horizontal Pill / Capsule Container matching reference */}
      <div
        className="relative w-[380px] h-[90px] rounded-full border-3 border-[#191244] shadow-none flex items-center px-3.5 gap-3.5 overflow-hidden select-none"
        style={{
          backgroundColor: '#f2b7c6',
          backgroundImage: 'linear-gradient(180deg, #f7c3d1 0%, #f2b7c6 50%, #f0a8b9 100%)',
          WebkitAppRegion: 'no-drag' as any,
        }}
      >
        {/* Top Floating Mini Actions: Settings, Expand to Full Window, Close */}
        <div
          className="absolute top-1.5 right-4 flex items-center gap-1.5 z-20 opacity-70 hover:opacity-100 transition-opacity"
          style={{ WebkitAppRegion: 'no-drag' as any }}
        >
          {onOpenSettings && (
            <button
              type="button"
              onClick={(e) => {
                playClickSound();
                onOpenSettings(e.currentTarget);
              }}
              className="w-4 h-4 rounded-full bg-[#191244]/15 hover:bg-[#191244] hover:text-white flex items-center justify-center text-[7.5px] text-[#191244] cursor-pointer transition-colors"
              title="Settings"
            >
              ⚙
            </button>
          )}
          {onExpand && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onExpand();
              }}
              className="w-4 h-4 rounded-full bg-[#191244]/15 hover:bg-[#191244] hover:text-white flex items-center justify-center text-[8px] text-[#191244] cursor-pointer transition-colors"
              title="Expand to Full Player Window"
            >
              ⤢
            </button>
          )}
          {onCloseWindow && (
            <button
              type="button"
              onClick={onCloseWindow}
              className="w-4 h-4 rounded-full bg-[#191244]/15 hover:bg-[#d81e35] hover:text-white flex items-center justify-center text-[7.5px] text-[#191244] cursor-pointer transition-colors"
              title={resolvedCloseLabel}
              aria-label={resolvedCloseLabel}
            >
              ✕
            </button>
          )}
        </div>

        {/* Left: Spinning Vinyl Turntable */}
        <div className="relative shrink-0 flex items-center justify-center">
          {/* Vinyl Record */}
          <div
            className={`w-[68px] h-[68px] rounded-full bg-[#161619] border-2 border-[#191244] shadow-none flex items-center justify-center relative overflow-hidden ${
              isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
            }`}
          >
            {/* Vinyl Groove Rings */}
            <div className="absolute inset-1.5 rounded-full border border-white/10" />
            <div className="absolute inset-3 rounded-full border border-white/10" />
            <div className="absolute inset-4.5 rounded-full border border-white/10" />

            {/* Center Cherry Red Label */}
            <div className="w-[24px] h-[24px] rounded-full bg-[#d81e35] border border-[#191244] flex items-center justify-center shadow-inner relative z-10">
              {/* Spindle hole */}
              <div className="w-[6px] h-[6px] rounded-full bg-[#f2b7c6] border border-[#191244]" />
            </div>

            {/* Vinyl Sheen Overlay */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none opacity-25"
              style={{
                background: 'conic-gradient(from 45deg, transparent 0deg, white 45deg, transparent 90deg, transparent 180deg, white 225deg, transparent 270deg)',
              }}
            />
          </div>

          {/* Tonearm */}
          <div
            className={`absolute -top-1.5 right-0 pointer-events-none transition-transform duration-300 origin-top-right ${
              isPlaying ? 'rotate-[18deg]' : 'rotate-0'
            }`}
          >
            {/* Tonearm base pivot */}
            <div className="w-2.5 h-2.5 rounded-full bg-[#d2d6dc] border border-[#191244] shadow-xs" />
            {/* Arm rod */}
            <div className="w-[2.5px] h-9 bg-[#b0b6bf] border-x border-[#191244] ml-1 -mt-0.5" />
            {/* Stylus cartridge head */}
            <div className="w-2 h-2.5 bg-[#40454d] border border-[#191244] rounded-[1px] ml-0.5 -mt-0.5" />
          </div>
        </div>

        {/* Center / Right Content: Metadata, Controls, Time & Volume */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 pr-2">
          {/* Top Row: Artist / Title and Cursor */}
          <div className="flex items-center min-w-0 pr-8">
            <span
              className="font-pixel text-[9.5px] font-bold text-[#191244] truncate tracking-tight"
              title={`${displayTitle} / ${displayArtist}`}
            >
              {displayTitle} / {displayArtist}
            </span>
            <span className="font-pixel text-[9.5px] font-bold text-[#191244]/80 ml-1 animate-pulse">|</span>
          </div>

          {/* Bottom Row: Controls, Time & Speaker */}
          <div className="flex items-center justify-between gap-2">
            {/* Three Circular Playback Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Previous Button (Rewind) */}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onPrevious();
                }}
                className="w-6 h-6 rounded-full bg-[#9aa0a6] hover:bg-[#868c92] border-2 border-[#191244] text-[#191244] flex items-center justify-center font-pixel text-[7.5px] active:scale-95 transition-transform shadow-xs cursor-pointer"
                title="Previous Track"
              >
                ◀◀
              </button>

              {/* Play / Pause Button (Cherry Red) */}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onTogglePlay();
                }}
                className="w-7 h-7 rounded-full bg-[#d81e35] hover:bg-[#b81424] text-white border-2 border-[#191244] flex items-center justify-center font-pixel text-[8.5px] active:scale-95 transition-transform shadow-sm cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>

              {/* Next Button (Fast Forward) */}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onNext();
                }}
                className="w-6 h-6 rounded-full bg-[#9aa0a6] hover:bg-[#868c92] border-2 border-[#191244] text-[#191244] flex items-center justify-center font-pixel text-[7.5px] active:scale-95 transition-transform shadow-xs cursor-pointer"
                title="Next Track"
              >
                ▶▶
              </button>
            </div>

            {/* Timestamps */}
            <div
              className="font-pixel text-[8.5px] font-bold text-[#191244] tracking-tight cursor-pointer hover:underline"
              onClick={() => {
                if (durationMs > 0 && seekTo) {
                  seekTo(Math.floor((progressMs + 10000) % durationMs));
                }
              }}
              title="Click to skip 10s"
            >
              {formatTime(progressMs)} / {formatTime(durationMs)}
            </div>

            {/* Volume Icon & Popover */}
            <div className="relative shrink-0 flex items-center">
              <button
                type="button"
                onClick={() => setShowVolumeSlider((prev) => !prev)}
                className="text-[#191244] text-[11px] hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                title={`Volume: ${volume}%`}
              >
                {volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
              </button>

              {/* Floating Volume Slider on Click */}
              {showVolumeSlider && (
                <div
                  className="absolute bottom-7 right-0 bg-[#fffdf5] border-2 border-[#191244] rounded-md p-1.5 shadow-pixel-sm z-30 flex items-center gap-1.5"
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className="w-16 h-1.5 accent-[#d81e35] cursor-pointer"
                  />
                  <span className="font-pixel text-[6.5px] font-bold text-[#191244] min-w-[20px]">
                    {volume}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetroCapsuleWidget;
