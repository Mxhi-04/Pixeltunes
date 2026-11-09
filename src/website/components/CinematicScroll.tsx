import React, { useRef, useState, useEffect } from 'react';
import { THEMES } from '../../types/theme';
import { Sparkles, Layers, Sliders, Radio, Music, Shield, Laptop } from 'lucide-react';

interface CinematicScrollProps {
  onOpenPlayer: () => void;
}

export const CinematicScroll: React.FC<CinematicScrollProps> = ({ onOpenPlayer }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let animationFrameId: number;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.min(Math.max(currentScroll / totalScrollable, 0), 1);

      animationFrameId = requestAnimationFrame(() => {
        setScrollProgress(progress);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Determine stage based on scroll progress:
  // 0.00 - 0.33: Stage 1 - Hardware reveal & retro architecture
  // 0.33 - 0.66: Stage 2 - 7 Theme metamorphosis
  // 0.66 - 1.00: Stage 3 - Spotify Connect & Desktop Menubar mode
  let currentStage = 1;
  if (scrollProgress >= 0.66) currentStage = 3;
  else if (scrollProgress >= 0.33) currentStage = 2;

  // Compute theme index for Stage 2 (cycle through standout themes from themes.json)
  const stage2Progress = Math.min(Math.max((scrollProgress - 0.33) / 0.33, 0), 1);
  const themeSequence = ['inspo', 'vaporwave', 'gameboy', 'moonlight', 'mint'];
  const themeIndex = Math.min(
    Math.floor(stage2Progress * themeSequence.length),
    themeSequence.length - 1
  );
  const activeThemeId = currentStage === 2 ? themeSequence[themeIndex] : currentStage === 3 ? 'moonlight' : 'inspo';
  const activeTheme = THEMES[activeThemeId] || THEMES.inspo || Object.values(THEMES)[0];

  return (
    <section id="preview" ref={containerRef} className="relative h-[240vh] bg-[#09071a]">
      {/* Sticky 100vh Stage */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-center items-center overflow-hidden px-4 py-6">
        {/* Background Atmosphere Flare */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-colors duration-700"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${activeTheme.accentPink}25 0%, rgba(25, 18, 68, 0.9) 60%, #09071a 100%)`,
          }}
        />

        {/* Floating Stamped Stage Label (dope.security style) */}
        <div className="mb-4 z-30 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#191244]/80 border border-white/20 font-silkscreen text-[9px] tracking-[0.2em] text-[#fffdf5] shadow-pixel-sm backdrop-blur-md">
            <span className="text-[#ffd269]">STAGE {currentStage} OF 3</span>
            <span className="text-white/30">|</span>
            <span className="text-[#9df0cf]">
              {currentStage === 1 && 'HARDWARE-ACCELERATED 16-BIT ARCHITECTURE'}
              {currentStage === 2 && 'DYNAMIC PALETTE METAMORPHOSIS (SCROLL TO SHIFT)'}
              {currentStage === 3 && 'SPOTIFY PKCE & MACOS MENU-BAR COMPANION'}
            </span>
          </div>

          {/* Progress Tracker Pill */}
          <div className="mt-2 w-48 h-1.5 bg-white/10 border border-white/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#fec5db] to-[#ffd269] transition-all duration-75"
              style={{ width: `${Math.round(scrollProgress * 100)}%` }}
            />
          </div>
        </div>

        {/* Central Player Window Simulation */}
        <div className="relative z-20 w-full max-w-2xl transition-all duration-500 transform">
          <div
            className="w-full border-4 shadow-pixel-lg overflow-hidden transition-all duration-500"
            style={{
              borderColor: activeTheme.primaryBorder,
              backgroundColor: activeTheme.windowBg,
              boxShadow: `8px 8px 0px 0px ${activeTheme.primaryBorder}`,
            }}
          >
            {/* Title Bar */}
            <div
              className="h-9 px-3 flex items-center justify-between border-b-4 transition-colors duration-500"
              style={{
                backgroundColor: activeTheme.titleBarBg,
                borderColor: activeTheme.primaryBorder,
                color: activeTheme.textColor,
              }}
            >
              <div className="flex items-center gap-2 font-pixel text-[9px] font-bold">
                <span className="text-[12px] animate-pulse">♫</span>
                <span>PIXELTUNES - {activeTheme.name.toUpperCase()} PALETTE</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 bg-[#ff7b90] border-2 border-[#191244] flex items-center justify-center text-[8px] font-pixel">
                  _
                </span>
                <span className="w-4 h-4 bg-[#ffd269] border-2 border-[#191244] flex items-center justify-center text-[8px] font-pixel">
                  □
                </span>
                <span className="w-4 h-4 bg-[#9df0cf] border-2 border-[#191244] flex items-center justify-center text-[8px] font-pixel">
                  ✕
                </span>
              </div>
            </div>

            {/* Window Content Body */}
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6 items-center">
              {/* Left Column: Pixel Art Screen with CRT overlay */}
              <div className="sm:col-span-5 relative aspect-square bg-[#0e0b24] border-3 border-[#191244] overflow-hidden shadow-pixel-sm">
                <img
                  src={
                    currentStage === 1
                      ? '/covers/18_chrono_campfire.gif'
                      : currentStage === 2
                      ? '/covers/04_kirby_warpstar.gif'
                      : '/covers/20_stardew_farm.gif'
                  }
                  alt="Pixel Art Scene"
                  className="w-full h-full object-cover"
                />
                {/* CRT Scanline Overlay */}
                <div className="crt-overlay absolute inset-0 pointer-events-none" />

                {/* Track Badge */}
                <div className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-[#191244]/80 backdrop-blur-sm border border-white/20 font-silkscreen text-[8px] text-[#fffdf5] truncate">
                  {currentStage === 1 && 'NOW PLAYING: CHRONO NOSTALGIA'}
                  {currentStage === 2 && `PALETTE: ${activeTheme.name.toUpperCase()}`}
                  {currentStage === 3 && 'SPOTIFY: STARDEW BREEZE'}
                </div>
              </div>

              {/* Right Column: Controls & Metadata */}
              <div className="sm:col-span-7 flex flex-col justify-between h-full space-y-3 font-pixel">
                {/* 14-Segment Digital Title Display */}
                <div
                  className="p-2.5 border-3 border-[#191244] text-[#191244] shadow-pixel-sm"
                  style={{ backgroundColor: activeTheme.controlBtnBg }}
                >
                  <p className="font-silkscreen text-[9px] uppercase tracking-wider text-[#191244]/70">
                    {currentStage === 3 ? 'SPOTIFY CONNECTED' : 'OFFLINE CHILLHOP LO-FI'}
                  </p>
                  <p className="text-[11px] font-bold text-[#191244] truncate mt-0.5">
                    {currentStage === 1 && 'CAMPFIRE ACOUSTICS · 78 BPM'}
                    {currentStage === 2 && `${activeTheme.name.toUpperCase()} · CHIP HOP`}
                    {currentStage === 3 && 'SUMMER SUNSET · ACTIVE PLAYBACK'}
                  </p>
                </div>

                {/* Scrubber Simulator */}
                <div className="space-y-1">
                  <div className="flex justify-between font-silkscreen text-[8.5px] text-[#191244]/80">
                    <span>01:24</span>
                    <span>03:45</span>
                  </div>
                  <div className="w-full h-3 bg-[#fffdf5] border-2 border-[#191244] p-0.5">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        backgroundColor: activeTheme.accentPink,
                        width: `${Math.round(25 + scrollProgress * 65)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Retro Control Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button className="px-2.5 py-1.5 bg-[#fffdf5] border-2 border-[#191244] text-[9px] shadow-pixel-sm">
                    ⏮
                  </button>
                  <button
                    className="flex-1 py-1.5 border-2 border-[#191244] text-[9px] text-[#191244] font-bold shadow-pixel-sm"
                    style={{ backgroundColor: activeTheme.accentPink }}
                  >
                    ▶ PLAYING
                  </button>
                  <button className="px-2.5 py-1.5 bg-[#fffdf5] border-2 border-[#191244] text-[9px] shadow-pixel-sm">
                    ⏭
                  </button>
                  <button className="px-2.5 py-1.5 bg-[#ffd269] border-2 border-[#191244] text-[9px] shadow-pixel-sm">
                    {currentStage === 3 ? '♫ SPOTIFY' : '📻 LO-FI'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Narrative Callout Cards below window */}
        <div className="mt-6 max-w-xl text-center z-20 min-h-[72px] flex items-center justify-center">
          {currentStage === 1 && (
            <p className="font-sans text-sm sm:text-base text-[#cbd5e1] leading-relaxed animate-fadeIn">
              <strong className="text-[#fec5db] font-pixel text-[11px] block mb-1">
                AUTHENTIC 16-BIT DESKTOP EMBED
              </strong>
              PixelTunes lives on your desktop with zero distractions. Built with native window
              framing, CRT scanlines, and an offline Web Audio synthesizer that generates
              calming beats even without an internet connection.
            </p>
          )}

          {currentStage === 2 && (
            <p className="font-sans text-sm sm:text-base text-[#cbd5e1] leading-relaxed animate-fadeIn">
              <strong className="text-[#ffd269] font-pixel text-[11px] block mb-1">
                7 HAND-CRAFTED RETRO PALETTES
              </strong>
              Switch instantly between Inspo Pink, Vaporwave Neon, Game Boy Pea-Soup,
              Moonlight Arcade, Bubblegum Pastel, Amber CRT, and Emerald Mint.
            </p>
          )}

          {currentStage === 3 && (
            <p className="font-sans text-sm sm:text-base text-[#cbd5e1] leading-relaxed animate-fadeIn">
              <strong className="text-[#9df0cf] font-pixel text-[11px] block mb-1">
                SPOTIFY PKCE & MENU-BAR MODE
              </strong>
              One-click connect via local loopback port 8888. No client secrets exposed. Minimize to
              the macOS menu bar or Windows tray for background playback control while you work.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
