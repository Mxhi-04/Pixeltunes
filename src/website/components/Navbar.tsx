import React, { useState, useEffect } from 'react';
import { Download, Github, Music, Menu, X } from 'lucide-react';
import { AppleLogo, WindowsLogo } from './DownloadButtons';
import { useOperatingSystem } from '../hooks/useOperatingSystem';
import { usePageScrollProgress } from '../hooks/useScrollAnimation';
import { DOWNLOAD_LINKS } from '../utils/downloadLinks';
import { playClickSound } from '../../shared/services/soundEffects';

const NAV_LINKS = [
  { href: '#preview', label: 'PREVIEW', hover: 'hover:text-[#fec5db]' },
  { href: '#interactive', label: 'TRY DEMO', hover: 'hover:text-[#ffd269]' },
  { href: '#features', label: 'FEATURES', hover: 'hover:text-[#9df0cf]' },
  { href: '#themes', label: '7 THEMES', hover: 'hover:text-[#b4c4ec]' },
  { href: '#pixel-art', label: 'GALLERY', hover: 'hover:text-[#fec5db]' },
  { href: '#faq', label: 'FAQ', hover: 'hover:text-[#cbd5e1]' },
];

interface NavbarProps {
  onOpenPlayer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenPlayer }) => {
  const osInfo = useOperatingSystem();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollProgress = usePageScrollProgress();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close the mobile menu on Escape or when the viewport grows past the md breakpoint.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    const mq = window.matchMedia('(min-width: 768px)');
    const onMq = () => { if (mq.matches) setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onMq);
    };
  }, [menuOpen]);

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
          className="flex items-center gap-2.5 min-w-0 group cursor-pointer select-none"
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
              <span className="hidden sm:inline px-1.5 py-0.2 bg-[#2c2269] text-[#9df0cf] border border-[#9df0cf]/40 font-silkscreen text-[7.5px] uppercase">
                {DOWNLOAD_LINKS.version}
              </span>
            </div>
            <span className="hidden sm:inline font-silkscreen text-[8px] text-[#cbd5e1]/60 tracking-wider">
              RETRO DESKTOP AUDIO PLAYER
            </span>
          </div>
        </a>

        {/* Navigation Anchors (collapsed into the menu below md) */}
        <nav aria-label="Sections" className="hidden md:flex items-center gap-6 font-silkscreen text-[11px] text-[#cbd5e1]/80 tracking-wide">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={`${link.hover} transition-colors`}>
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
            aria-label={`Download PixelTunes for ${osInfo.name}`}
            className="flex items-center gap-1.5 py-2 px-2.5 sm:px-3.5 bg-gradient-to-r from-[#fec5db] to-[#ffd269] text-[#191244] border-2 border-[#191244] font-pixel text-[9px] font-bold shadow-pixel-sm hover:brightness-105 active:translate-y-0.5 transition-all cursor-pointer"
          >
            {osInfo.isMac ? (
              <AppleLogo className="w-3.5 h-3.5 fill-current" />
            ) : (
              <WindowsLogo className="w-3.5 h-3.5 fill-current" />
            )}
            <span className="sm:hidden">GET</span>
            <span className="hidden sm:inline">GET FOR {osInfo.name.toUpperCase()}</span>
            <Download className="w-3 h-3" />
          </a>

          {/* GitHub Star Link */}
          <a
            href={DOWNLOAD_LINKS.repo}
            target="_blank"
            rel="noopener noreferrer"
            title="View source on GitHub"
            aria-label="View source on GitHub"
            className="hidden sm:flex w-8 h-8 rounded-none bg-white/[0.07] hover:bg-white/[0.14] border border-white/20 text-[#fffdf5] items-center justify-center transition-colors cursor-pointer"
          >
            <Github className="w-4 h-4" />
          </a>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => {
              try { playClickSound(); } catch {}
              setMenuOpen((open) => !open);
            }}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="md:hidden w-9 h-9 bg-white/[0.07] hover:bg-white/[0.14] border border-white/20 text-[#fffdf5] flex items-center justify-center transition-colors cursor-pointer"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Sections"
          className="md:hidden mt-3 mx-4 sm:mx-6 bg-[#0a071d]/95 backdrop-blur-xl border-2 border-white/15 shadow-lg font-silkscreen text-[12px] text-[#cbd5e1]"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 border-b border-white/10 ${link.hover} transition-colors`}
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              try { playClickSound(); } catch {}
              setMenuOpen(false);
              onOpenPlayer();
            }}
            className="sm:hidden w-full text-left flex items-center gap-2 px-4 py-3 border-b border-white/10 text-[#fec5db] cursor-pointer"
          >
            <Music className="w-3.5 h-3.5 text-[#ffd269]" />
            PLAY ONLINE
          </button>
          <a
            href={DOWNLOAD_LINKS.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden flex items-center gap-2 px-4 py-3"
          >
            <Github className="w-3.5 h-3.5" />
            GITHUB
          </a>
        </nav>
      )}
    </header>
  );
};

