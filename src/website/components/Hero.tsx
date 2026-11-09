import React from 'react';
import { Sparkles, Radio, ShieldCheck, Zap, Disc3, Music2 } from 'lucide-react';
import { DownloadButtons } from './DownloadButtons';
import { useScrollParallax } from '../hooks/useScrollAnimation';

interface HeroProps {
  onOpenPlayer: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenPlayer }) => {
  const kirbyOffset = useScrollParallax(-0.18);
  const nyanOffset = useScrollParallax(-0.22);
  const campfireOffset = useScrollParallax(0.14);
  const pikachuOffset = useScrollParallax(0.1);
  return (
    <section className="relative min-h-[92vh] pt-32 pb-20 px-4 sm:px-6 flex flex-col justify-center items-center overflow-hidden">
      {/* Background Aurora Glow (Unicorn Studio inspired) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 15%, rgba(175, 80, 255, 0.18) 0%, rgba(143, 162, 212, 0.12) 30%, rgba(25, 18, 68, 0.95) 75%, #0a071d 100%)',
        }}
      />

      {/* Retro Grid Floor Accent */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-64 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(254, 197, 219, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(254, 197, 219, 0.15) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          transform: 'perspective(400px) rotateX(60deg)',
          transformOrigin: 'bottom center',
        }}
      />

      {/* Floating Retro Game-World Mascots with Parallax Motion (Discord reference) */}
      <div
        aria-hidden="true"
        className="hidden lg:block absolute left-8 top-44 pointer-events-none z-10 transition-transform duration-100 ease-out animate-bounce"
        style={{
          animationDuration: '6s',
          transform: `translateY(${kirbyOffset}px)`,
        }}
      >
        <div className="relative p-2 bg-[#191244]/80 border-2 border-[#fec5db] shadow-pixel-sm backdrop-blur-md">
          <img
            src="/covers/04_kirby_warpstar.gif"
            alt="Kirby"
            className="w-14 h-14 object-contain"
          />
          <span className="block font-silkscreen text-[7px] text-[#fec5db] text-center mt-1">
            WARP STAR
          </span>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="hidden lg:block absolute right-12 top-48 pointer-events-none z-10 transition-transform duration-100 ease-out animate-bounce"
        style={{
          animationDuration: '7s',
          transform: `translateY(${nyanOffset}px)`,
        }}
      >
        <div className="relative p-2 bg-[#191244]/80 border-2 border-[#9df0cf] shadow-pixel-sm backdrop-blur-md">
          <img
            src="/covers/01_nyan_cat.gif"
            alt="Nyan Cat"
            className="w-16 h-12 object-contain"
          />
          <span className="block font-silkscreen text-[7px] text-[#9df0cf] text-center mt-1">
            NYAN VIBES
          </span>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="hidden xl:block absolute right-24 bottom-24 pointer-events-none z-10 transition-transform duration-100 ease-out"
        style={{
          transform: `translateY(${campfireOffset}px)`,
        }}
      >
        <div className="relative p-2 bg-[#191244]/80 border-2 border-[#ffd269] shadow-pixel-sm backdrop-blur-md">
          <img
            src="/covers/18_chrono_campfire.gif"
            alt="Chrono Trigger"
            className="w-16 h-14 object-contain"
          />
          <span className="block font-silkscreen text-[7px] text-[#ffd269] text-center mt-1">
            CAMPFIRE 16-BIT
          </span>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="hidden xl:block absolute left-20 bottom-24 pointer-events-none z-10 transition-transform duration-100 ease-out"
        style={{
          transform: `translateY(${pikachuOffset}px)`,
        }}
      >
        <div className="relative p-2 bg-[#191244]/80 border-2 border-[#8fa2d4] shadow-pixel-sm backdrop-blur-md">
          <img
            src="/covers/02_pokemon_pikachu.gif"
            alt="Pikachu"
            className="w-14 h-14 object-contain"
          />
          <span className="block font-silkscreen text-[7px] text-[#8fa2d4] text-center mt-1">
            PIKACHU BEATS
          </span>
        </div>
      </div>

      {/* Main Hero Content */}
      <div className="relative z-20 max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Terminal Stamped Badge (Dope.security style) */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 mb-7 bg-[#191244]/90 border border-white/20 text-[#fffdf5] font-silkscreen text-[10px] tracking-[0.2em] shadow-pixel-sm backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#57f287] animate-ping" />
          <span className="text-[#9df0cf] font-bold">[ 01 // RETRO AUDIO WORKSPACE ]</span>
          <span className="text-white/40">|</span>
          <span className="text-[#fec5db]">SPOTIFY & OFFLINE 16-BIT LO-FI</span>
        </div>

        {/* Monumental Headline */}
        <h1 className="font-pixel text-[24px] sm:text-[38px] md:text-[50px] lg:text-[58px] leading-[1.25] tracking-tight text-[#fffdf5] max-w-4xl drop-shadow-[0_4px_16px_rgba(254,197,219,0.3)]">
          YOUR MUSIC, REIMAGINED IN{' '}
          <span className="bg-gradient-to-r from-[#fec5db] via-[#ffd269] to-[#9df0cf] bg-clip-text text-transparent">
            16-BIT NOSTALGIA.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-sm sm:text-base md:text-lg max-w-2xl font-sans text-[#cbd5e1] leading-relaxed">
          The aesthetic desktop player for macOS and Windows. Seamlessly controls your Spotify
          library with zero secrets, plays offline procedural lo-fi beats, and transforms your
          workspace with 7 retro palettes and 23 animated pixel scenes.
        </p>

        {/* Feature Badges Pills */}
        <div className="mt-8 flex flex-wrap justify-center items-center gap-2.5 sm:gap-3 text-xs font-silkscreen text-[#fffdf5]/90">
          <div className="px-3 py-1 bg-white/[0.06] border border-white/15 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#ffd269]" />
            <span>Spotify 1-Click PKCE</span>
          </div>
          <div className="px-3 py-1 bg-white/[0.06] border border-white/15 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#9df0cf]" />
            <span>Built-in Offline Radio</span>
          </div>
          <div className="px-3 py-1 bg-white/[0.06] border border-white/15 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#fec5db]" />
            <span>7 Authentic Palettes</span>
          </div>
          <div className="px-3 py-1 bg-white/[0.06] border border-white/15 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8fa2d4]" />
            <span>Zero Trackers · 100% Free</span>
          </div>
        </div>

        {/* Dynamic OS-Aware Two Download Buttons */}
        <div className="mt-10 w-full flex justify-center">
          <DownloadButtons onTryWebPlayer={onOpenPlayer} />
        </div>
      </div>
    </section>
  );
};

