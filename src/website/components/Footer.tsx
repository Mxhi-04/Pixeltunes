import React from 'react';
import { DownloadButtons } from './DownloadButtons';
import { DOWNLOAD_LINKS } from '../utils/downloadLinks';
import { Github, Heart, Sparkles, ArrowUp, Disc } from 'lucide-react';
import { playClickSound } from '../../shared/services/soundEffects';

interface FooterProps {
  onOpenPlayer: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPlayer }) => {
  const scrollToTop = () => {
    try { playClickSound(); } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#070514] text-[#fffdf5] border-t-4 border-[#191244] pt-20 pb-12 px-4 sm:px-6 overflow-hidden">
      {/* Background Radial Glow */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, #fec5db 0%, #191244 70%, transparent 100%)',
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
        {/* Animated Cassette Tape Visual Motif */}
        <div
          aria-label="PixelTunes retro cassette tape"
          className="relative mb-10 w-48 h-30 bg-[#191244] border-4 border-[#fec5db] shadow-pixel-lg p-2.5 flex flex-col justify-between animate-cassette-float hover:scale-105 transition-transform duration-300 select-none group"
        >
          {/* Top Tape Label */}
          <div className="flex items-center justify-between font-silkscreen text-[8px] text-[#ffd269]">
            <span className="tracking-wider">PIXELTUNES</span>
            <span>SIDE A · 90 MIN</span>
          </div>

          {/* Cassette Window & Spinning Spools */}
          <div className="relative h-12 bg-[#fffdf5] border-2 border-[#191244] px-2 flex items-center justify-between overflow-hidden shadow-inner">
            {/* Magnetic Tape Roll on Left Reel */}
            <div className="absolute left-1.5 w-8 h-8 rounded-full bg-[#4a2e18]/25 border border-[#191244]/30 pointer-events-none" />

            {/* Left Reel with Visible Rotating Cog Spokes */}
            <div
              className="relative z-10 w-7 h-7 rounded-full border-2 border-[#191244] bg-[#fec5db] flex items-center justify-center animate-spin"
              style={{ animationDuration: '2.5s' }}
            >
              <div className="absolute w-1 h-full bg-[#191244]" />
              <div className="absolute h-1 w-full bg-[#191244]" />
              <div className="absolute w-1 h-full bg-[#191244] rotate-45" />
              <div className="absolute w-1 h-full bg-[#191244] -rotate-45" />
              <div className="absolute w-4 h-4 rounded-full bg-[#fec5db] border border-[#191244]" />
              <div className="relative z-10 w-2 h-2 rounded-full bg-[#fffdf5] border border-[#191244]" />
            </div>

            {/* Center Tape Window with Rolling Strip and Meter */}
            <div className="relative z-10 w-16 h-5 bg-[#191244]/15 border border-[#191244]/40 overflow-hidden flex items-center justify-center">
              <div
                className="absolute inset-0 opacity-40 animate-tape-rolling"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #191244, #191244 2px, transparent 2px, transparent 6px)',
                  backgroundSize: '12px 100%',
                }}
              />
              <span className="relative z-10 font-silkscreen text-[7px] text-[#191244] font-bold tracking-wider">
                LO-FI
              </span>
            </div>

            {/* Right Reel with Visible Rotating Cog Spokes */}
            <div
              className="relative z-10 w-7 h-7 rounded-full border-2 border-[#191244] bg-[#fec5db] flex items-center justify-center animate-spin"
              style={{ animationDuration: '2.5s' }}
            >
              <div className="absolute w-1 h-full bg-[#191244]" />
              <div className="absolute h-1 w-full bg-[#191244]" />
              <div className="absolute w-1 h-full bg-[#191244] rotate-45" />
              <div className="absolute w-1 h-full bg-[#191244] -rotate-45" />
              <div className="absolute w-4 h-4 rounded-full bg-[#fec5db] border border-[#191244]" />
              <div className="relative z-10 w-2 h-2 rounded-full bg-[#fffdf5] border border-[#191244]" />
            </div>
          </div>

          {/* Bottom Tape Subtitle */}
          <div className="font-silkscreen text-[7.5px] text-[#9df0cf] tracking-widest text-center">
            LO-FI & SPOTIFY DESKTOP
          </div>
        </div>

        {/* Big Final Headline */}
        <h2 className="font-pixel text-[22px] sm:text-[34px] md:text-[42px] leading-tight text-[#fffdf5] max-w-3xl drop-shadow-[0_4px_12px_rgba(254,197,219,0.3)]">
          YOUR WORKSPACE DESERVES BETTER SOUNDTRACKS.
        </h2>

        <p className="mt-4 font-sans text-sm sm:text-base text-[#cbd5e1] max-w-lg">
          Download PixelTunes today. No subscriptions, zero trackers, and complete control
          over your music environment.
        </p>

        {/* Final Download Buttons */}
        <div className="mt-8 mb-16 w-full flex justify-center">
          <DownloadButtons onTryWebPlayer={onOpenPlayer} />
        </div>

        {/* Divider */}
        <div className="w-full border-t border-white/10 my-8" />

        {/* Bottom Bar */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 font-silkscreen text-[10px] text-[#cbd5e1]/70">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[11px] text-[#fffdf5] font-bold">PIXELTUNES</span>
            <span>·</span>
            <span>RELEASED UNDER MIT LICENSE</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href={DOWNLOAD_LINKS.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#fec5db] flex items-center gap-1.5 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GITHUB</span>
            </a>
            <a
              href={DOWNLOAD_LINKS.allReleases}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#ffd269] transition-colors"
            >
              ALL RELEASES
            </a>
            <button
              type="button"
              onClick={scrollToTop}
              className="hover:text-[#9df0cf] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>BACK TO TOP</span>
              <ArrowUp className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

