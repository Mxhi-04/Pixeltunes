import React, { useState, useEffect } from 'react';
import { Apple, Monitor, Download, Github, ExternalLink, Sparkles, Music } from 'lucide-react';
import { useOperatingSystem } from '../hooks/useOperatingSystem';
import { usePageScrollProgress } from '../hooks/useScrollAnimation';
import { DOWNLOAD_LINKS } from '../utils/downloadLinks';
import { playClickSound } from '../../shared/services/soundEffects';

interface NavbarProps {
  onOpenPlayer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenPlayer }) => {
  const osInfo = useOperatingSystem();
  const [scrolled, setScrolled] = useState(false);
  const scrollProgress = usePageScrollProgress();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const downloadUrl = osInfo.isMac ? DOWNLOAD_LINKS.macArm64 : DOWNLOAD_LINKS.windowsX64;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a071d]/90 backdrop-blur-xl border-b border-white/[0.1] py-3 shadow-lg'
          : 'bg-transparent py-5'
      }`}
    >
      {/* Global Scroll Reading Progress Bar (Neon Gradient) */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-[2.5px] bg-gradient-to-r from-[#ff5e7e] via-[#ffd269] to-[#00f5d4] transition-all duration-75 shadow-[0_0_8px_rgba(255,94,126,0.6)]"
        style={{ width: `${scrollProgress}%` }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <a
          href="#"
          className="flex items-center gap-2.5 group cursor-pointer select-none"
          onClick={() => {
            try { playClickSound(); } catch {}
          }}
        >
          <div className="relative w-8 h-8 bg-[#fec5db] border-2 border-[#191244] shadow-pixel-sm flex items-center justify-center group-hover:rotate-6 transition-transform">
            <span className="text-[#191244] text-[14px] leading-none animate-spin" style={{ animationDuration: '6s' }}>💿</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[13px] tracking-wider text-[#fffdf5] font-bold group-hover:text-[#fec5db] transition-colors">
                PIXELTUNES
              </span>
              <span className="px-1.5 py-0.2 bg-[#2c2269] text-[#9df0cf] border border-[#9df0cf]/40 font-silkscreen text-[7.5px] uppercase">
                {DOWNLOAD_LINKS.version}
              </span>
            </div>
            <span className="font-silkscreen text-[8px] text-[#cbd5e1]/60 tracking-wider">
              RETRO DESKTOP AUDIO PLAYER
            </span>
          </div>
        </a>

        {/* Navigation Anchors (hidden on small screens) */}
        <nav className="hidden md:flex items-center gap-6 font-silkscreen text-[11px] text-[#cbd5e1]/80 tracking-wide">
          <a href="#preview" className="hover:text-[#fec5db] transition-colors">
            PREVIEW
          </a>
          <a href="#interactive" className="hover:text-[#ffd269] transition-colors">
            TRY DEMO
          </a>
          <a href="#features" className="hover:text-[#9df0cf] transition-colors">
            FEATURES
          </a>
          <a href="#themes" className="hover:text-[#b4c4ec] transition-colors">
            7 THEMES
          </a>
          <a href="#pixel-art" className="hover:text-[#fec5db] transition-colors">
            GALLERY
          </a>
          <a href="#faq" className="hover:text-[#cbd5e1] transition-colors">
            FAQ
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Try Web Player */}
          <button
            type="button"
            onClick={() => {
              try { playClickSound(); } catch {}
              onOpenPlayer();
            }}
            className="hidden sm:flex items-center gap-1.5 py-2 px-3 bg-[#191244] hover:bg-[#2c2269] text-[#fec5db] border-2 border-[#fec5db]/60 text-[9px] font-pixel shadow-pixel-sm transition-all hover:scale-105 cursor-pointer"
            title="Launch full browser music player"
          >
            <Music className="w-3 h-3 text-[#ffd269]" />
            <span>PLAY ONLINE</span>
          </button>

          {/* Quick OS Download CTA */}
          <a
            href={downloadUrl}
            onClick={() => {
              try { playClickSound(); } catch {}
            }}
            className="flex items-center gap-1.5 py-2 px-3.5 bg-gradient-to-r from-[#fec5db] to-[#ffd269] text-[#191244] border-2 border-[#191244] font-pixel text-[9px] font-bold shadow-pixel-sm hover:brightness-105 active:translate-y-0.5 transition-all cursor-pointer"
          >
            {osInfo.isMac ? (
              <Apple className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Monitor className="w-3.5 h-3.5" />
            )}
            <span>GET FOR {osInfo.name.toUpperCase()}</span>
            <Download className="w-3 h-3" />
          </a>

          {/* GitHub Star Link */}
          <a
            href={DOWNLOAD_LINKS.repo}
            target="_blank"
            rel="noopener noreferrer"
            title="View source on GitHub"
            className="w-8 h-8 rounded-none bg-white/[0.07] hover:bg-white/[0.14] border border-white/20 text-[#fffdf5] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
};

