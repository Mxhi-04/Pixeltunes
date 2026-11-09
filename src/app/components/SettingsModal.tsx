import React, { useState, useEffect } from 'react';
import { THEMES, RetroTheme } from '../../types/theme';
import { PLAYER_SCALES, SCALES, PlayerScale, PlayerLayoutMode } from '../../types/scale';
import { playClickSound, setSoundEffectsEnabled } from '../../shared/services/soundEffects';
import {
  isAutoLaunchEnabled,
  setAutoLaunchPermission,
  launchSpotifyInBackground,
} from '../services/spotifyAutoLaunch';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: RetroTheme;
  onThemeSelect: (theme: RetroTheme) => void;
  artMode: 'pixelCovers' | 'pixelArt' | 'cassette' | 'inspo' | 'saturn';
  onArtModeSelect: (mode: 'pixelCovers' | 'pixelArt' | 'cassette') => void;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  motion?: 'system' | 'on' | 'off';
  onMotionChange?: (motion: 'system' | 'on' | 'off') => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  windowTitle?: string;
  onWindowTitleChange?: (title: string) => void;
  titleEmojis?: string;
  onTitleEmojisChange?: (emojis: string) => void;
  headerTag?: string;
  onHeaderTagChange?: (tag: string) => void;
  scale: PlayerScale;
  onScaleChange: (scale: PlayerScale) => void;
  layoutMode?: PlayerLayoutMode;
  onLayoutModeChange?: (mode: PlayerLayoutMode) => void;
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
  scale,
  onScaleChange,
  layoutMode = 'classic',
  onLayoutModeChange,
  pixelResolution = 180,
  onPixelResolutionChange,
}) => {
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAutoLaunchEnabled(isAutoLaunchEnabled());
    }
  }, [isOpen]);

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
        className="w-[560px] max-w-[95%] max-h-[380px] flex flex-col min-h-0 border-4 shadow-pixel-lg overflow-hidden app-no-drag"
        style={{ backgroundColor: currentTheme.windowBg, borderColor: currentTheme.primaryBorder, WebkitAppRegion: 'no-drag' as any }}
      >
        {/* Fixed Title Bar */}
        <div
          className="border-b-4 px-3 py-1.5 flex items-center justify-between shrink-0 app-no-drag"
          style={{ backgroundColor: currentTheme.titleBarBg, borderColor: currentTheme.primaryBorder, color: currentTheme.controlBtnText, WebkitAppRegion: 'no-drag' as any }}
        >
          <div className="flex items-center gap-1.5 app-no-drag">
            <span className="font-pixel text-xs tracking-wider font-bold">
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
        <div className="p-3 overflow-y-auto overflow-x-hidden min-h-0 flex-1 space-y-3 font-silkscreen text-xs" style={{ color: currentTheme.textColor }}>
          {/* Player Layout */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-pixel text-[10px]">
                PLAYER LAYOUT:
              </label>
            </div>
            {/* Layout Style Choice */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <button
                type="button"
                aria-pressed={layoutMode === 'classic'}
                onClick={() => {
                  playClickSound();
                  onLayoutModeChange?.('classic');
                }}
                className={`py-2 px-1 text-center border-2 border-[#191244] font-pixel text-[8px] transition-all cursor-pointer font-bold flex flex-col items-center justify-center leading-tight ${
                  layoutMode === 'classic'
                    ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                    : 'bg-[#fffdf5] text-[#191244] hover:bg-[#ffe6f0]'
                }`}
              >
                <div>◫ CLASSIC</div>
                <div className="text-[7px] opacity-75 mt-0.5 font-sans">Wide Window</div>
              </button>
              <button
                type="button"
                aria-pressed={layoutMode === 'card'}
                onClick={() => {
                  playClickSound();
                  onLayoutModeChange?.('card');
                }}
                className={`py-2 px-1 text-center border-2 border-[#191244] font-pixel text-[8px] transition-all cursor-pointer font-bold flex flex-col items-center justify-center leading-tight ${
                  layoutMode === 'card'
                    ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                    : 'bg-[#fffdf5] text-[#191244] hover:bg-[#ffe6f0]'
                }`}
              >
                <div>▯ CARD</div>
                <div className="text-[7px] opacity-75 mt-0.5 font-sans">Polaroid Art</div>
              </button>
              <button
                type="button"
                aria-pressed={layoutMode === 'ipod'}
                onClick={() => {
                  playClickSound();
                  onLayoutModeChange?.('ipod');
                }}
                className={`py-2 px-1 text-center border-2 border-[#191244] font-pixel text-[8px] transition-all cursor-pointer font-bold flex flex-col items-center justify-center leading-tight ${
                  layoutMode === 'ipod'
                    ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                    : 'bg-[#fffdf5] text-[#191244] hover:bg-[#ffe6f0]'
                }`}
              >
                <div>📟 IPOD MINI</div>
                <div className="text-[7px] opacity-75 mt-0.5 font-sans">Click Wheel</div>
              </button>
              <button
                type="button"
                aria-pressed={layoutMode === 'capsule'}
                onClick={() => {
                  playClickSound();
                  onLayoutModeChange?.('capsule');
                }}
                className={`py-2 px-1 text-center border-2 border-[#191244] font-pixel text-[8px] transition-all cursor-pointer font-bold flex flex-col items-center justify-center leading-tight ${
                  layoutMode === 'capsule'
                    ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                    : 'bg-[#fffdf5] text-[#191244] hover:bg-[#ffe6f0]'
                }`}
              >
                <div>💊 CAPSULE</div>
                <div className="text-[7px] opacity-75 mt-0.5 font-sans">Menu Bar</div>
              </button>
            </div>

            {/* Window Size Scale (for Classic layout only) */}
            {layoutMode === 'classic' && (
              <div>
                <div className="flex justify-between items-center mb-1 text-[8.5px] opacity-80 font-pixel">
                  <span>WINDOW SIZE:</span>
                  <span>{SCALES[scale].width} × {SCALES[scale].height}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {PLAYER_SCALES.map((s) => (
                    <button
                      key={s}
                      aria-pressed={scale === s}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onScaleChange(s);
                      }}
                      className={`p-1.5 text-center border-2 border-[#191244] font-pixel text-[9px] transition-all cursor-pointer ${
                        scale === s
                          ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm font-bold'
                          : 'bg-[#fffdf5] text-[#191244] hover:bg-[#ffe6f0]'
                      }`}
                    >
                      <div>{SCALES[s].label}</div>
                      <div className="text-[7.5px] opacity-75 font-sans">
                        {SCALES[s].width}px
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Art Display Mode */}
          <div>
            <label className="block font-pixel text-[10px] mb-1.5">
              ART DISPLAY MODE:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                aria-pressed={artMode === 'pixelCovers'}
                onClick={() => {
                  playClickSound();
                  onArtModeSelect('pixelCovers');
                }}
                className={`py-2 px-1 text-[8px] border-2 border-[#191244] font-pixel transition-all cursor-pointer font-bold flex flex-col items-center justify-center text-center min-h-[52px] leading-tight ${
                  artMode === 'pixelCovers' || artMode === 'inspo' || artMode === 'saturn'
                    ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                    : 'bg-[#fffdf5] text-[#191244] hover:bg-[#ffe6f0]'
                }`}
              >
                <span className="text-[11px] leading-none mb-1">✨</span>
                <span>PIXEL COVERS</span>
              </button>
              <button
                type="button"
                aria-pressed={artMode === 'pixelArt'}
                onClick={() => {
                  playClickSound();
                  onArtModeSelect('pixelArt');
                }}
                className={`py-2 px-1 text-[8px] border-2 border-[#191244] font-pixel transition-all cursor-pointer font-bold flex flex-col items-center justify-center text-center min-h-[52px] leading-tight ${
                  artMode === 'pixelArt'
                    ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                    : 'bg-[#fffdf5] text-[#191244] hover:bg-[#ffe6f0]'
                }`}
              >
                <span className="text-[11px] leading-none mb-1">🎨</span>
                <span>SPOTIFY ART</span>
              </button>
              <button
                type="button"
                aria-pressed={artMode === 'cassette'}
                onClick={() => {
                  playClickSound();
                  onArtModeSelect('cassette');
                }}
                className={`py-2 px-1 text-[8px] border-2 border-[#191244] font-pixel transition-all cursor-pointer font-bold flex flex-col items-center justify-center text-center min-h-[52px] leading-tight ${
                  artMode === 'cassette'
                    ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                    : 'bg-[#fffdf5] text-[#191244] hover:bg-[#ffe6f0]'
                }`}
              >
                <span className="text-[11px] leading-none mb-1">📼</span>
                <span>CASSETTE</span>
              </button>
            </div>
          </div>

          {/* Retro Pixel Cover Toggle (180px or OFF) */}
          <div className="flex items-center justify-between bg-[#fffdf5] text-[#191244] p-2 border-2 border-[#191244]">
            <div>
              <span className="font-pixel text-[10px] font-bold block">RETRO COVER:</span>
              <span className="font-pixel text-[8px] text-[#191244]/70">
                {pixelResolution > 0 ? '180px Pixel Art' : 'Original Cover (Off)'}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onPixelResolutionChange?.(180);
                }}
                className={`px-3 py-1 text-[9px] font-pixel border-2 border-[#191244] font-bold cursor-pointer transition-all ${
                  pixelResolution > 0
                    ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                    : 'bg-white text-[#191244] hover:bg-[#ffe6f0]'
                }`}
              >
                ON
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onPixelResolutionChange?.(0);
                }}
                className={`px-3 py-1 text-[9px] font-pixel border-2 border-[#191244] font-bold cursor-pointer transition-all ${
                  pixelResolution === 0
                    ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                    : 'bg-white text-[#191244] hover:bg-[#ffe6f0]'
                }`}
              >
                OFF
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
                  aria-pressed={currentTheme.id === theme.id}
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
          <div className="space-y-2 pt-1 text-[#191244]">
            {/* Auto-Launch Spotify in Background */}
            {window.electronAPI?.isElectron && <div className="bg-[#fffdf5] p-2 border-2 border-[#191244]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-pixel text-[10px] font-bold">AUTO-LAUNCH SPOTIFY APP:</span>
                <span className={`font-pixel text-[8px] font-bold ${autoLaunchEnabled ? 'text-[#0d8253]' : 'text-[#888]'}`}>
                  {autoLaunchEnabled ? '[AUTO-MINIMIZED]' : '[OFF]'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setAutoLaunchPermission('allowed');
                    setAutoLaunchEnabled(true);
                    launchSpotifyInBackground().catch(() => {});
                  }}
                  className={`p-1.5 text-[9px] border-2 border-[#191244] font-pixel transition-all cursor-pointer font-bold ${
                    autoLaunchEnabled
                      ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                      : 'bg-[#fffdf5] text-[#191244] hover:bg-[#ffe6f0]'
                  }`}
                >
                  ✓ ENABLED
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setAutoLaunchPermission('denied');
                    setAutoLaunchEnabled(false);
                  }}
                  className={`p-1.5 text-[9px] border-2 border-[#191244] font-pixel transition-all cursor-pointer font-bold ${
                    !autoLaunchEnabled
                      ? 'bg-[#191244] text-[#9df0cf] shadow-pixel-sm'
                      : 'bg-[#fffdf5] text-[#191244] hover:bg-[#ffe6f0]'
                  }`}
                >
                  ✕ DISABLED
                </button>
              </div>
              <p className="font-pixel text-[7.5px] text-[#191244]/70 mt-1">
                Opens Spotify in background &amp; minimizes it to prevent playback errors
              </p>
            </div>}

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
