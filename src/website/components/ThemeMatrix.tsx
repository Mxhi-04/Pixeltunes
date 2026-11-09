import React, { useState } from 'react';
import { THEMES, RetroTheme } from '../../types/theme';
import { Palette, Check, Sparkles } from 'lucide-react';
import { playClickSound } from '../../shared/services/soundEffects';

export const ThemeMatrix: React.FC = () => {
  const [selectedThemeKey, setSelectedThemeKey] = useState<string>('vaporwave');
  const selectedTheme: RetroTheme = THEMES[selectedThemeKey] || THEMES.inspo || Object.values(THEMES)[0];

  return (
    <section id="themes" className="py-24 px-4 sm:px-6 bg-[#0a071c] relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Stamped Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#191244] border border-white/20 text-[#fffdf5] font-silkscreen text-[9.5px] tracking-[0.2em] shadow-pixel-sm mb-4">
            <span className="text-[#ffd269]">[ 04 // 7 AUTHENTIC RETRO PALETTES ]</span>
            <span className="text-white/30">|</span>
            <span className="text-[#9df0cf]">CALIBRATED COLOR SCIENCE</span>
          </div>

          <h2 className="font-pixel text-[20px] sm:text-[32px] md:text-[38px] text-[#fffdf5] leading-tight">
            DESIGNED FOR EVERY VIBE.
          </h2>
          <p className="mt-3 text-sm sm:text-base font-sans text-[#cbd5e1] max-w-xl">
            Click any palette below to preview how PixelTunes adapts its windows, cassette tapes,
            and interface chrome to match your aesthetic.
          </p>
        </div>

        {/* Theme Showcase Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-10">
          {Object.entries(THEMES).map(([key, theme]) => {
            const isSelected = selectedThemeKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  try { playClickSound(); } catch {}
                  setSelectedThemeKey(key);
                }}
                className={`p-3 border-3 text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#ffd269] scale-105 shadow-pixel-lg z-20'
                    : 'border-[#191244] bg-[#120d2b] hover:border-white/30'
                }`}
                style={{
                  backgroundColor: isSelected ? theme.windowBg : '#120d2b',
                  borderColor: isSelected ? theme.accentPink : '#191244',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="w-3.5 h-3.5 border border-black/40"
                    style={{ backgroundColor: theme.accentPink }}
                  />
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#191244]" />}
                </div>

                <div>
                  <p
                    className="font-pixel text-[9px] font-bold truncate"
                    style={{ color: isSelected ? theme.textColor : '#fffdf5' }}
                  >
                    {theme.name}
                  </p>
                  <p className="font-silkscreen text-[7.5px] text-[#cbd5e1]/60 truncate mt-0.5">
                    {theme.id.toUpperCase()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Theme Deep-Dive Spotlight Card */}
        <div
          className="p-6 sm:p-8 border-4 shadow-pixel-lg transition-all duration-300"
          style={{
            backgroundColor: selectedTheme.windowBg,
            borderColor: selectedTheme.primaryBorder,
            color: selectedTheme.textColor,
            boxShadow: `8px 8px 0px 0px ${selectedTheme.primaryBorder}`,
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b-2 border-black/20">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 border text-[8px] font-pixel uppercase font-bold"
                  style={{
                    backgroundColor: selectedTheme.titleBarBg,
                    color: selectedTheme.textColor,
                    borderColor: selectedTheme.primaryBorder,
                  }}
                >
                  ACTIVE PALETTE
                </span>
                <span className="font-silkscreen text-[9px] uppercase tracking-wider opacity-70">
                  HEX COLOR TOKENS
                </span>
              </div>
              <h3 className="font-pixel text-[18px] sm:text-[24px] font-bold mt-2">
                {selectedTheme.name.toUpperCase()} RETRO PALETTE
              </h3>
            </div>

            {/* Color Swatch Strips */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { name: 'Pink Accent', hex: selectedTheme.accentPink },
                { name: 'Periwinkle', hex: selectedTheme.accentPeriwinkle },
                { name: 'Window Bg', hex: selectedTheme.windowBg },
                { name: 'Border', hex: selectedTheme.primaryBorder },
                { name: 'Button Bg', hex: selectedTheme.controlBtnBg },
              ].map((swatch, idx) => (
                <div
                  key={idx}
                  className="p-1.5 bg-black/10 border-2 border-black/30 font-silkscreen text-[8px] flex items-center gap-1.5"
                >
                  <span
                    className="w-4 h-4 border border-black/40 block"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <div className="flex flex-col">
                    <span className="font-bold leading-none">{swatch.name}</span>
                    <span className="opacity-70 text-[7px]">{swatch.hex}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6 font-sans text-xs sm:text-sm">
            <div>
              <p className="font-pixel text-[9.5px] uppercase font-bold mb-1">ATMOSPHERE</p>
              <p className="opacity-80 leading-relaxed">
                {selectedTheme.id === 'gameboy' &&
                  'Classic 1989 pea-soup LCD contrast. Authentic nostalgic green tints that make any desktop feel like a handheld console.'}
                {selectedTheme.id === 'vaporwave' &&
                  'Electric high-contrast neon cyan and magenta glow. Designed for late night coding and synthwave sessions.'}
                {selectedTheme.id === 'bubblegum' &&
                  'Sweet pastel pink and soft mint tones for a cozy, upbeat workspace atmosphere.'}
                {selectedTheme.id === 'moonlight' &&
                  'Deep nocturnal blue and silver twilight arcade hues, easy on the eyes during dark mode listening.'}
                {selectedTheme.id === 'mint' &&
                  'Refreshing emerald frost and cool mint green highlights for a clean, focus-first aesthetic.'}
                {selectedTheme.id === 'amber' &&
                  'Warm vintage CRT phosphor amber terminal tones inspired by classic 80s computer monitors.'}
                {selectedTheme.id === 'inspo' &&
                  'The signature original PixelTunes palette: bubblegum pink titlebar, soft periwinkle, and creamy window body.'}
              </p>
            </div>

            <div>
              <p className="font-pixel text-[9.5px] uppercase font-bold mb-1">CRT SCANLINE HARMONY</p>
              <p className="opacity-80 leading-relaxed">
                Every palette calculates its own custom contrast threshold so scanlines and 14-segment
                LED displays remain 100% readable even at tiny scale.
              </p>
            </div>

            <div>
              <p className="font-pixel text-[9.5px] uppercase font-bold mb-1">PERSISTENCE</p>
              <p className="opacity-80 leading-relaxed">
                Saved instantly to your local preferences. Syncs smoothly across both desktop app
                sessions and web player playback without requiring an account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
