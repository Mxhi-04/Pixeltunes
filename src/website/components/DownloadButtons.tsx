import React, { useState } from 'react';
import { Apple, Monitor, Download, ChevronDown, Zap, Check } from 'lucide-react';
import { useOperatingSystem } from '../hooks/useOperatingSystem';
import { DOWNLOAD_LINKS } from '../utils/downloadLinks';
import { playClickSound } from '../../shared/services/soundEffects';

interface DownloadButtonsProps {
  className?: string;
  size?: 'normal' | 'large';
  onTryWebPlayer?: () => void;
}

export const DownloadButtons: React.FC<DownloadButtonsProps> = ({
  className = '',
  size = 'large',
  onTryWebPlayer,
}) => {
  const osInfo = useOperatingSystem();
  const [showMacDropdown, setShowMacDropdown] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isMacPrimary = osInfo.isMac; // If Mac, Mac goes on the left and is highlighted. If Windows, Windows goes on the left and is highlighted.

  const handleDownloadClick = () => {
    try {
      playClickSound();
    } catch {}
  };

  const macButtonPrimary = (
    <div key="mac-btn" className="relative group flex-1 min-w-[280px]">
      <div className="absolute -top-3 left-4 z-20 px-2 py-0.5 bg-[#191244] border border-[#fec5db] text-[#fec5db] font-pixel text-[8px] tracking-wider uppercase flex items-center gap-1 shadow-pixel-sm animate-pulse">
        <Zap className="w-2.5 h-2.5 text-[#ffd269] fill-[#ffd269]" />
        <span>RECOMMENDED FOR YOUR MAC</span>
      </div>

      <div className="flex rounded-none overflow-visible shadow-pixel-lg group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] transition-all duration-150">
        <a
          href={DOWNLOAD_LINKS.macArm64}
          onClick={handleDownloadClick}
          className="flex-1 py-4 px-5 bg-gradient-to-r from-[#fec5db] via-[#ffe6f0] to-[#ffd269] text-[#191244] border-3 border-[#191244] font-pixel flex items-center gap-3.5 hover:brightness-105 active:translate-y-0.5 cursor-pointer"
        >
          <div className="w-10 h-10 bg-[#191244] text-[#fffdf5] flex items-center justify-center shrink-0 border-2 border-[#191244] shadow-pixel-sm">
            <Apple className="w-5 h-5 fill-current" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[12px] font-bold tracking-wide flex items-center gap-1.5">
              <span>DOWNLOAD FOR MACOS</span>
              <Download className="w-3.5 h-3.5" />
            </span>
            <span className="font-silkscreen text-[9px] text-[#191244]/80 mt-0.5">
              Apple Silicon (M1/M2/M3/M4) · {DOWNLOAD_LINKS.version}
            </span>
          </div>
        </a>

        {/* Dropdown toggle for Intel Macs */}
        <button
          type="button"
          onClick={() => setShowMacDropdown((v) => !v)}
          title="Choose Intel (x64) or Apple Silicon (arm64)"
          className="px-3 bg-[#ffd269] hover:bg-[#ffbe42] text-[#191244] border-3 border-l-0 border-[#191244] flex items-center justify-center cursor-pointer transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showMacDropdown ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showMacDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-[#191244] border-3 border-[#fec5db] p-3 shadow-pixel-lg text-left font-silkscreen">
          <p className="text-[9px] text-[#fec5db] font-bold mb-2">SELECT YOUR MAC ARCHITECTURE:</p>
          <div className="flex flex-col gap-2">
            <a
              href={DOWNLOAD_LINKS.macArm64}
              onClick={() => {
                handleDownloadClick();
                setShowMacDropdown(false);
              }}
              className="p-2 bg-[#261b5c] hover:bg-[#34247d] border border-[#fec5db]/40 text-[#fffdf5] text-[10px] flex items-center justify-between transition-colors"
            >
              <span>Apple Silicon (M1/M2/M3/M4)</span>
              <span className="text-[#ffd269] text-[8px] font-pixel">RECOMMENDED</span>
            </a>
            <a
              href={DOWNLOAD_LINKS.macX64}
              onClick={() => {
                handleDownloadClick();
                setShowMacDropdown(false);
              }}
              className="p-2 bg-[#261b5c] hover:bg-[#34247d] border border-[#fec5db]/40 text-[#cbd5e1] text-[10px] flex items-center justify-between transition-colors"
            >
              <span>Intel Macs (x64)</span>
              <span className="text-[#8fa2d4] text-[8px]">ZIP</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );

  const macButtonSecondary = (
    <div key="mac-btn" className="relative flex-1 min-w-[260px]">
      <a
        href={DOWNLOAD_LINKS.macArm64}
        onClick={handleDownloadClick}
        className="w-full py-4 px-5 bg-[#191244]/80 hover:bg-[#261b5c] backdrop-blur-md text-[#fffdf5] border-3 border-[#8fa2d4]/50 hover:border-[#fec5db] shadow-pixel group flex items-center gap-3.5 transition-all cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px]"
      >
        <div className="w-9 h-9 bg-white/10 text-[#fec5db] flex items-center justify-center shrink-0 border border-white/20">
          <Apple className="w-5 h-5 fill-current" />
        </div>
        <div className="flex flex-col text-left font-pixel">
          <span className="text-[11px] font-bold tracking-wide flex items-center gap-1.5 text-[#fffdf5] group-hover:text-[#fec5db] transition-colors">
            <span>DOWNLOAD FOR MACOS</span>
            <Download className="w-3 h-3 text-[#8fa2d4]" />
          </span>
          <span className="font-silkscreen text-[8.5px] text-[#cbd5e1]/70 mt-0.5">
            Apple Silicon & Intel (.zip)
          </span>
        </div>
      </a>
    </div>
  );

  const windowsButtonPrimary = (
    <div key="win-btn" className="relative group flex-1 min-w-[280px]">
      <div className="absolute -top-3 left-4 z-20 px-2 py-0.5 bg-[#191244] border border-[#9df0cf] text-[#9df0cf] font-pixel text-[8px] tracking-wider uppercase flex items-center gap-1 shadow-pixel-sm animate-pulse">
        <Zap className="w-2.5 h-2.5 text-[#ffd269] fill-[#ffd269]" />
        <span>RECOMMENDED FOR YOUR PC</span>
      </div>

      <a
        href={DOWNLOAD_LINKS.windowsX64}
        onClick={handleDownloadClick}
        className="w-full py-4 px-5 bg-gradient-to-r from-[#9df0cf] via-[#b4c4ec] to-[#8fa2d4] text-[#191244] border-3 border-[#191244] shadow-pixel-lg font-pixel flex items-center gap-3.5 hover:brightness-105 active:translate-y-0.5 cursor-pointer group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] transition-all duration-150"
      >
        <div className="w-10 h-10 bg-[#191244] text-[#9df0cf] flex items-center justify-center shrink-0 border-2 border-[#191244] shadow-pixel-sm">
          <Monitor className="w-5 h-5" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[12px] font-bold tracking-wide flex items-center gap-1.5">
            <span>DOWNLOAD FOR WINDOWS</span>
            <Download className="w-3.5 h-3.5" />
          </span>
          <span className="font-silkscreen text-[9px] text-[#191244]/80 mt-0.5">
            Windows 10 / 11 · x64 Portable (.zip) · {DOWNLOAD_LINKS.version}
          </span>
        </div>
      </a>
    </div>
  );

  const windowsButtonSecondary = (
    <div key="win-btn" className="relative flex-1 min-w-[260px]">
      <a
        href={DOWNLOAD_LINKS.windowsX64}
        onClick={handleDownloadClick}
        className="w-full py-4 px-5 bg-[#191244]/80 hover:bg-[#261b5c] backdrop-blur-md text-[#fffdf5] border-3 border-[#8fa2d4]/50 hover:border-[#9df0cf] shadow-pixel group flex items-center gap-3.5 transition-all cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px]"
      >
        <div className="w-9 h-9 bg-white/10 text-[#9df0cf] flex items-center justify-center shrink-0 border border-white/20">
          <Monitor className="w-5 h-5" />
        </div>
        <div className="flex flex-col text-left font-pixel">
          <span className="text-[11px] font-bold tracking-wide flex items-center gap-1.5 text-[#fffdf5] group-hover:text-[#9df0cf] transition-colors">
            <span>DOWNLOAD FOR WINDOWS</span>
            <Download className="w-3 h-3 text-[#8fa2d4]" />
          </span>
          <span className="font-silkscreen text-[8.5px] text-[#cbd5e1]/70 mt-0.5">
            x64 Portable (.zip) · No install required
          </span>
        </div>
      </a>
    </div>
  );

  // Requirement: "placing one on left side highlighted to download by checking the user's system is mac or windows"
  const leftButton = isMacPrimary ? macButtonPrimary : windowsButtonPrimary;
  const rightButton = isMacPrimary ? windowsButtonSecondary : macButtonSecondary;

  return (
    <div className={`flex flex-col gap-3.5 ${className}`}>
      <div className="flex flex-wrap items-stretch gap-4 w-full max-w-3xl">
        {leftButton}
        {rightButton}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-silkscreen text-[#cbd5e1]/70 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-[#57f287]">●</span>
          <span>Portable, zero installer bloat, runs offline with built-in lo-fi audio.</span>
        </div>

        {onTryWebPlayer && (
          <button
            type="button"
            onClick={onTryWebPlayer}
            className="text-[#fec5db] hover:text-[#ffd269] underline cursor-pointer transition-colors flex items-center gap-1 font-bold"
          >
            <span>Or launch Web Player directly</span>
            <span>→</span>
          </button>
        )}
      </div>
    </div>
  );
};

