import React, { useState, useEffect, useRef } from 'react';
import { lofiEngine, BUILTIN_TRACKS } from '../../services/lofiAudio';
import { THEMES, RetroTheme } from '../../types/theme';
import { Play, Pause, SkipForward, SkipBack, Volume2, Sparkles, Tv, Palette, ExternalLink } from 'lucide-react';
import { playClickSound } from '../../services/soundEffects';

const SHOWCASE_COVERS = [
  { name: 'Chrono Campfire', file: '/covers/18_chrono_campfire.gif', track: 'FLY ME TO THE MOON' },
  { name: 'Kirby Warpstar', file: '/covers/04_kirby_warpstar.gif', track: 'MIDNIGHT ORBIT' },
  { name: 'Stardew Valley', file: '/covers/20_stardew_farm.gif', track: 'PASTEL CLOUDS' },
  { name: 'Nyan Cat Space', file: '/covers/01_nyan_cat.gif', track: 'RAINBOW RUNNER' },
  { name: 'Pikachu Lofi', file: '/covers/02_pokemon_pikachu.gif', track: 'PALLET TOWN BEATS' },
  { name: 'Saturn Galaxy', file: '/covers/00_saturn_galaxy.png', track: 'COSMIC DUST' },
];

interface LivePlayerShowcaseProps {
  onOpenFullPlayer: () => void;
}

export const LivePlayerShowcase: React.FC<LivePlayerShowcaseProps> = ({ onOpenFullPlayer }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);
  const [activeThemeKey, setActiveThemeKey] = useState<string>('inspo');
  const [crtOn, setCrtOn] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(() => lofiEngine.getTrack());
  const [volume, setVolume] = useState(0.8);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const theme: RetroTheme = THEMES[activeThemeKey] || THEMES.inspo || Object.values(THEMES)[0];
  const cover = SHOWCASE_COVERS[currentCoverIndex];

  // Subscribe to lofi engine state updates
  useEffect(() => {
    lofiEngine.setOnStateChange(() => {
      setIsPlaying(lofiEngine.getIsPlaying());
      setCurrentTrack(lofiEngine.getTrack());
    });
    return () => {
      lofiEngine.setOnStateChange(null);
      lofiEngine.pause();
    };
  }, []);

  // Simple visualizer canvas loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = lofiEngine.getAnalyser();
    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 32);

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Flat or idle gentle dance
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = isPlaying ? Math.random() * 80 + 30 : 10;
        }
      }

      const barCount = 18;
      const barWidth = Math.floor(width / barCount) - 2;
      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * 2] || 10;
        const barHeight = Math.floor((val / 255) * height);
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        ctx.fillStyle = theme.accentPink || '#fec5db';
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, theme]);

  const togglePlay = () => {
    try { playClickSound(); } catch {}
    if (isPlaying) {
      lofiEngine.pause();
    } else {
      lofiEngine.play();
    }
  };

  const handleNext = () => {
    try { playClickSound(); } catch {}
    lofiEngine.nextTrack();
    setCurrentCoverIndex((prev) => (prev + 1) % SHOWCASE_COVERS.length);
  };

  const handlePrev = () => {
    try { playClickSound(); } catch {}
    lofiEngine.previousTrack();
    setCurrentCoverIndex((prev) => (prev - 1 + SHOWCASE_COVERS.length) % SHOWCASE_COVERS.length);
  };

  return (
    <section id="interactive" className="relative py-24 px-4 sm:px-6 bg-[#0a071c] overflow-hidden">
      {/* Background Decor */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${theme.accentPink}20 0%, transparent 60%)`,
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Stamped Header (dope.security style) */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#191244] border border-white/20 text-[#fffdf5] font-silkscreen text-[9.5px] tracking-[0.2em] shadow-pixel-sm mb-4">
            <span className="text-[#ffd269]">[ 02 // INTERACTIVE PROVING GROUND ]</span>
            <span className="text-white/30">|</span>
            <span className="text-[#9df0cf]">LIVE RETRO WEBAUDIO ENGINE</span>
          </div>

          <h2 className="font-pixel text-[20px] sm:text-[32px] md:text-[40px] text-[#fffdf5] leading-tight">
            TRY IT LIVE IN YOUR BROWSER.
          </h2>
          <p className="mt-3 text-sm sm:text-base font-sans text-[#cbd5e1] max-w-xl">
            Click play below to start the built-in procedural Web Audio synthesizer. No external
            audio files, zero latency, and 100% offline ready.
          </p>
        </div>

        {/* Interactive Desktop Showcase Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls & Theme Customizer Palette Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-5 order-2 lg:order-1 font-silkscreen">
            {/* Theme Picker Card */}
            <div className="p-5 bg-[#120d2a]/90 border-3 border-[#191244] shadow-pixel-lg">
              <div className="flex items-center justify-between pb-3 border-b-2 border-white/10 mb-4">
                <span className="font-pixel text-[10px] text-[#ffd269] flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  <span>SELECT PALETTE</span>
                </span>
                <span className="text-[9px] text-[#cbd5e1]/60">7 OPTIONS</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      try { playClickSound(); } catch {}
                      setActiveThemeKey(key);
                    }}
                    className={`p-2 border-2 text-left flex items-center gap-2 transition-all cursor-pointer ${
                      activeThemeKey === key
                        ? 'border-[#ffd269] bg-[#191244] scale-[1.02]'
                        : 'border-[#191244] bg-[#0c0820] hover:border-white/40'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 border border-black/40 shrink-0"
                      style={{ backgroundColor: t.accentPink }}
                    />
                    <span className="text-[8px] text-[#fffdf5] truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Toggles: CRT & Full Player */}
            <div className="p-5 bg-[#120d2a]/90 border-3 border-[#191244] shadow-pixel-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[9px] text-[#fec5db] flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5" />
                  <span>CRT SCANLINES</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCrtOn((v) => !v)}
                  className={`px-3 py-1 font-pixel text-[8px] border-2 border-[#191244] cursor-pointer ${
                    crtOn ? 'bg-[#9df0cf] text-[#191244]' : 'bg-[#191244] text-white/50'
                  }`}
                >
                  {crtOn ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenFullPlayer}
                className="w-full mt-3 py-2.5 px-4 bg-[#fec5db] hover:bg-[#ffd269] text-[#191244] border-2 border-[#191244] font-pixel text-[9px] font-bold shadow-pixel-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>OPEN FULLSCREEN WEB PLAYER</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Interactive Retro Window */}
          <div className="lg:col-span-8 order-1 lg:order-2">
            <div
              className="w-full border-4 shadow-pixel-lg overflow-hidden transition-all duration-300"
              style={{
                borderColor: theme.primaryBorder,
                backgroundColor: theme.windowBg,
                boxShadow: `8px 8px 0px 0px ${theme.primaryBorder}`,
              }}
            >
              {/* Titlebar */}
              <div
                className="h-9 px-4 flex items-center justify-between border-b-4 transition-colors duration-300 select-none"
                style={{
                  backgroundColor: theme.titleBarBg,
                  borderColor: theme.primaryBorder,
                  color: theme.textColor,
                }}
              >
                <div className="flex items-center gap-2 font-pixel text-[9.5px] font-bold">
                  <span className="text-[#ff7b90] animate-bounce">♫</span>
                  <span>PIXELTUNES - {theme.name.toUpperCase()} EDITION</span>
                </div>
                <div className="flex items-center gap-2 font-silkscreen text-[9px]">
                  <span>{isPlaying ? '● LIVE SYNTH' : '○ PAUSED'}</span>
                </div>
              </div>

              {/* Player Body */}
              <div className="p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                {/* Album Art Box with Scanline */}
                <div className="sm:col-span-5 relative aspect-square bg-[#0b081e] border-3 border-[#191244] overflow-hidden shadow-pixel">
                  <img
                    src={cover.file}
                    alt={cover.name}
                    className="w-full h-full object-cover"
                  />
                  {crtOn && <div className="crt-overlay absolute inset-0 pointer-events-none" />}

                  {/* Scene Name Badge */}
                  <div className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-[#191244]/85 backdrop-blur-sm border border-white/20 font-silkscreen text-[8px] text-[#fffdf5] text-center">
                    SCENE: {cover.name.toUpperCase()}
                  </div>
                </div>

                {/* Controls & Spectrum Analyzer */}
                <div className="sm:col-span-7 flex flex-col justify-between h-full space-y-4">
                  {/* Digital Marquee Display */}
                  <div
                    className="p-3 border-3 border-[#191244] text-[#191244] shadow-pixel-sm font-pixel"
                    style={{ backgroundColor: theme.controlBtnBg }}
                  >
                    <p className="font-silkscreen text-[8px] uppercase tracking-wider text-[#191244]/70">
                      LO-FI 8-BIT ENGINE · {currentTrack.bpm} BPM
                    </p>
                    <p className="text-[12px] font-bold text-[#191244] truncate mt-1">
                      {currentTrack.name}
                    </p>
                    <p className="font-silkscreen text-[9px] text-[#191244]/80 mt-0.5">
                      {currentTrack.artist}
                    </p>
                  </div>

                  {/* Live WebAudio Spectrum Visualizer */}
                  <div className="bg-[#100b2e] border-2 border-[#191244] p-2">
                    <canvas
                      ref={canvasRef}
                      width={240}
                      height={40}
                      className="w-full h-10 block"
                    />
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handlePrev}
                      title="Previous track"
                      className="p-3 bg-[#fffdf5] hover:bg-[#ffe6f0] active:translate-y-0.5 text-[#191244] border-2 border-[#191244] shadow-pixel-sm cursor-pointer transition-all"
                    >
                      <SkipBack className="w-4 h-4 fill-current" />
                    </button>

                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex-1 py-3 px-4 border-2 border-[#191244] font-pixel text-[11px] font-bold text-[#191244] shadow-pixel-sm active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-105"
                      style={{ backgroundColor: isPlaying ? '#9df0cf' : theme.accentPink }}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>PAUSE LO-FI</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>PLAY DEMO</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      title="Next track"
                      className="p-3 bg-[#fffdf5] hover:bg-[#ffe6f0] active:translate-y-0.5 text-[#191244] border-2 border-[#191244] shadow-pixel-sm cursor-pointer transition-all"
                    >
                      <SkipForward className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-3 font-silkscreen text-[9px] text-[#191244]/80">
                    <Volume2 className="w-3.5 h-3.5 text-[#191244]" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        lofiEngine.setVolume(val);
                      }}
                      className="flex-1 pixel-scrubber cursor-pointer"
                      style={{ '--fill': theme.accentPink, '--edge': '#191244' } as any}
                    />
                    <span className="w-8 text-right font-pixel text-[8px]">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
