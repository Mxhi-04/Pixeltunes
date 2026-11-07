import React from 'react';
import { THEMES, RetroTheme } from '../types/theme';
import { SCALES, PlayerScale } from '../types/scale';
import { playClickSound, setSoundEffectsEnabled } from '../services/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: RetroTheme;
  onThemeSelect: (theme: RetroTheme) => void;
  artMode: 'inspo' | 'pixelArt' | 'cassette';
  onArtModeSelect: (mode: 'inspo' | 'pixelArt' | 'cassette') => void;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  windowTitle: string;
  onWindowTitleChange: (title: string) => void;
  titleEmojis?: string;
  onTitleEmojisChange?: (emojis: string) => void;
  headerTag?: string;
  onHeaderTagChange?: (tag: string) => void;
  scale: PlayerScale;
  onScaleChange: (scale: PlayerScale) => void;
  pixelResolution?: number;
  onPixelResolutionChange?: (resolution: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeSelect,
  artMode,
  onArtModeSelect,
  crtEnabled,
  onToggleCrt,
  soundEnabled,
  onToggleSound,
  windowTitle,
  onWindowTitleChange,
  titleEmojis,
  onTitleEmojisChange,
  headerTag,
  onHeaderTagChange,
  scale,
  onScaleChange,
  pixelResolution = 180,
  onPixelResolutionChange,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs select-none app-no-drag"
      style={{ WebkitAppRegion: 'no-drag' as any }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClickSound();
          onClose();
        }
      }}
    >
      <div
        className="w-[560px] max-w-[95%] max-h-[380px] flex flex-col min-h-0 bg-[#8fa2d4] border-4 border-[#191244] shadow-pixel-lg overflow-hidden app-no-drag"
        style={{ WebkitAppRegion: 'no-drag' as any }}
      >
        {/* Fixed Title Bar */}
        <div
          className="bg-[#fec5db] border-b-4 border-[#191244] px-3 py-1.5 flex items-center justify-between shrink-0 app-no-drag"
          style={{ WebkitAppRegion: 'no-drag' as any }}
        >
          <div className="flex items-center gap-1.5 app-no-drag">
            <span className="font-pixel text-xs text-[#191244] tracking-wider font-bold">
              SETTINGS.INI
            </span>
          </div>
          <div className="flex items-center gap-2 app-no-drag">
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                playClickSound();
                onClose();
              }}
              className="px-2 py-0.5 bg-[#fffdf5] text-[#191244] border-2 border-[#191244] font-pixel text-[9px] hover:bg-[#ffe6f0] active:translate-y-0.5 cursor-pointer font-bold app-no-drag"
              style={{ WebkitAppRegion: 'no-drag' as any }}
            >
              ← BACK
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                playClickSound();
                onClose();
              }}
              title="Close Settings"
              className="w-6 h-6 flex items-center justify-center bg-[#fec5db] border-2 border-[#191244] text-xs font-bold hover:bg-[#ff7b90] active:translate-y-0.5 transition-colors cursor-pointer app-no-drag"
              style={{ WebkitAppRegion: 'no-drag' as any }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-3 overflow-y-auto min-h-0 flex-1 space-y-3 text-[#191244] font-silkscreen text-xs">
          {/* Player Layout */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-pixel text-[10px]">
                PLAYER LAYOUT:
              </label>
              <span className="text-[10px] text-[#2c2269] font-bold">
                {SCALES[scale]?.subLabel || 'Standard'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SCALES) as PlayerScale[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onScaleChange(s);
                  }}
                  className={`p-2 text-center border-2 border-[#191244] font-pixel text-[10px] transition-all cursor-pointer ${
                    scale === s
                      ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                      : 'bg-[#fffdf5] text-[#191244] hover:bg-[#ffe6f0]'
                  }`}
                >
                  <div className="font-bold">{SCALES[s].label}</div>
                  <div className="text-[8px] opacity-75 mt-0.5 font-sans">
                    {SCALES[s].width}px
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Art Display Mode */}
          <div>
            <label className="block font-pixel text-[10px] mb-1.5">
              ART DISPLAY MODE:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onArtModeSelect('inspo');
                }}
                className={`p-2 text-[10px] border-2 border-[#191244] font-pixel transition-all cursor-pointer font-bold ${
                  artMode === 'inspo'
                    ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                    : 'bg-[#fffdf5] text-[#191244] hover:bg-[#ffe6f0]'
                }`}
              >
                ✨ PIXEL ART
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  onArtModeSelect('pixelArt');
                }}
                className={`p-2 text-[10px] border-2 border-[#191244] font-pixel transition-all ${
                  artMode === 'pixelArt'
                    ? 'bg-[#191244] text-[#fec5db] shadow-pixel-sm'
                    : 'bg-[#fffdf5] text-[#191244]'
                }`}
              >
                🎨 SPOTIFY ART
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  onArtModeSelect('cassette');
                }}
                className={`p-2 text-[10px] border-2 border-[#191244] font-pixel transition-all ${
                  artMode === 'cassette'
                    ? 'bg-[#191244] text-[#fec5db] shadow-pixel-sm'
                    : 'bg-[#fffdf5] text-[#191244]'
                }`}
              >
                📼 CASSETTE
              </button>
            </div>
          </div>

          {/* Theme Palette */}
          <div>
            <label className="block font-pixel text-[10px] mb-1.5">
              COLOR PALETTE:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(THEMES).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    playClickSound();
                    onThemeSelect(theme);
                  }}
                  className={`p-2 text-[10px] border-2 border-[#191244] flex items-center justify-between font-silkscreen ${
                    currentTheme.id === theme.id
                      ? 'bg-[#191244] text-[#ffd269]'
                      : 'bg-[#fffdf5] text-[#191244]'
                  }`}
                >
                  <span>{theme.name}</span>
                  <div className="flex gap-1">
                    <div
                      className="w-3 h-3 border border-black"
                      style={{ backgroundColor: theme.titleBarBg }}
                    />
                    <div
                      className="w-3 h-3 border border-black"
                      style={{ backgroundColor: theme.windowBg }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between bg-[#fffdf5] p-2 border-2 border-[#191244] cursor-pointer">
              <span className="font-pixel text-[10px]">8-BIT AUDIO FX:</span>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => {
                  playClickSound();
                  setSoundEffectsEnabled(e.target.checked);
                  onToggleSound(e.target.checked);
                }}
                className="w-4 h-4 accent-[#191244]"
              />
            </label>

            <label className="flex items-center justify-between bg-[#fffdf5] p-2 border-2 border-[#191244] cursor-pointer">
              <span className="font-pixel text-[10px]">CRT SCANLINES:</span>
              <input
                type="checkbox"
                checked={crtEnabled}
                onChange={() => {
                  playClickSound();
                  onToggleCrt();
                }}
                className="w-4 h-4 accent-[#191244]"
              />
            </label>
          </div>

          {/* Custom Labels */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block font-pixel text-[9px] mb-1">
                WINDOW TITLE:
              </label>
              <input
                type="text"
                value={windowTitle}
                onChange={(e) => onWindowTitleChange(e.target.value)}
                maxLength={24}
                className="w-full px-2 py-1 bg-[#fffdf5] border-2 border-[#191244] text-[10px] font-pixel"
              />
            </div>
            <div>
              <label className="block font-pixel text-[9px] mb-1">
                TEXT EMOJIS:
              </label>
              <input
                type="text"
                value={titleEmojis ?? headerTag ?? ''}
                onChange={(e) => {
                  if (onTitleEmojisChange) onTitleEmojisChange(e.target.value);
                  if (onHeaderTagChange) onHeaderTagChange(e.target.value);
                }}
                maxLength={50}
                className="w-full px-2 py-1 bg-[#fffdf5] border-2 border-[#191244] text-[11px] font-sans"
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[8px] font-pixel text-[#8fa2d4] pt-0.5">
            <span>PRESET:</span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onWindowTitleChange('PIXELTUNES');
                if (onTitleEmojisChange) onTitleEmojisChange('𐙚 ⊹₊⋆☆');
                if (onHeaderTagChange) onHeaderTagChange('𐙚 ⊹₊⋆☆');
              }}
              className="text-[#191244] hover:text-[#ff7b90] underline cursor-pointer"
            >
              Reset to 𐙚 ⊹₊⋆☆
            </button>
          </div>

          {/* Live Web App & GitHub Links */}
          <div className="p-2.5 bg-[#fffdf5] border-2 border-[#191244] shadow-pixel-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] leading-none">▲</span>
                <span className="font-pixel text-[8px] font-bold text-[#191244]">
                  VERCEL LIVE WEB APP:
                </span>
              </div>
              <a
                href="https://pixeltunes.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 bg-[#9df0cf] text-[#191244] border border-[#191244] font-pixel text-[7.5px] hover:bg-white font-bold cursor-pointer"
              >
                OPEN ↗
              </a>
            </div>
            <a
              href="https://pixeltunes.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="block font-silkscreen text-[8px] text-[#2c2269] hover:underline hover:text-[#ff7b90] truncate"
            >
              https://pixeltunes.vercel.app
            </a>
          </div>

          {/* Close */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="px-4 py-2 bg-[#fec5db] text-[#191244] font-pixel text-xs border-2 border-[#191244] shadow-pixel hover:bg-[#ffe6f0]"
            >
              APPLY & CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
