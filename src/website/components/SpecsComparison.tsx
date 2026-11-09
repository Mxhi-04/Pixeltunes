import React from 'react';
import { Apple, Monitor, ShieldCheck, Check, Terminal, FileCode, HardDrive, Cpu } from 'lucide-react';
import { DOWNLOAD_LINKS } from '../utils/downloadLinks';
import { playClickSound } from '../../shared/services/soundEffects';
import { ScrollReveal } from '../hooks/useScrollAnimation';

export const SpecsComparison: React.FC = () => {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[#0a071c] relative overflow-hidden border-t border-b border-white/[0.08]">
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section Stamped Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#191244] border border-white/20 text-[#fffdf5] font-silkscreen text-[9.5px] tracking-[0.2em] shadow-pixel-sm mb-4">
            <span className="text-[#9df0cf]">[ 06 // SYSTEM REQUIREMENTS & DOWNLOADS ]</span>
            <span className="text-white/30">|</span>
            <span className="text-[#ffd269]">LIGHTWEIGHT RUNTIME</span>
          </div>

          <h2 className="font-pixel text-[20px] sm:text-[32px] md:text-[38px] text-[#fffdf5] leading-tight">
            MAC & WINDOWS NATIVE.
          </h2>
          <p className="mt-3 text-sm sm:text-base font-sans text-[#cbd5e1] max-w-xl">
            Clean portable packages with zero registry bloat or background updater services.
          </p>
        </div>

        {/* Side-by-side Platform Cards with Scroll Motion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* macOS Card */}
          <ScrollReveal direction="right" delayMs={60} className="h-full">
            <div className="p-6 sm:p-8 bg-[#120d2a] border-3 border-[#fec5db]/40 shadow-pixel-lg flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#fec5db] text-[#191244] flex items-center justify-center font-bold">
                      <Apple className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <h3 className="font-pixel text-[13px] text-[#fffdf5]">MACOS DESKTOP</h3>
                      <p className="font-silkscreen text-[8.5px] text-[#cbd5e1]/70">APPLE SILICON & INTEL</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-[#2c2269] text-[#fec5db] font-pixel text-[7.5px] border border-[#fec5db]/50">
                    MACOS 12+
                  </span>
                </div>

                <ul className="space-y-3 font-silkscreen text-[10px] text-[#cbd5e1] mb-8">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#57f287] shrink-0 mt-0.5" />
                    <span>Native arm64 build for M1/M2/M3/M4 (plus x64 for Intel)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#57f287] shrink-0 mt-0.5" />
                    <span>Menu-bar accessory mode (<code className="text-[#fec5db]">LSUIElement</code>)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#57f287] shrink-0 mt-0.5" />
                    <span>Hardware-backed safeStorage via macOS Keychain</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#57f287] shrink-0 mt-0.5" />
                    <span>Supports macOS Dark Mode, custom window framing & drag</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#57f287] shrink-0 mt-0.5" />
                    <span>Zero installation setup: unzip <code className="text-[#fec5db]">PixelTunes.app</code> to Applications</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
                <a
                  href={DOWNLOAD_LINKS.macArm64}
                  onClick={() => {
                    try { playClickSound(); } catch {}
                  }}
                  className="py-3 px-4 bg-[#fec5db] hover:bg-[#ffd269] text-[#191244] border-2 border-[#191244] font-pixel text-[10px] font-bold text-center shadow-pixel-sm active:translate-y-0.5 transition-all"
                >
                  DOWNLOAD MACOS (APPLE SILICON)
                </a>
                <a
                  href={DOWNLOAD_LINKS.macX64}
                  onClick={() => {
                    try { playClickSound(); } catch {}
                  }}
                  className="text-center font-silkscreen text-[8.5px] text-[#cbd5e1]/70 hover:text-[#fec5db] underline mt-1"
                >
                  Or download Intel x64 package (.zip)
                </a>
              </div>
            </div>
          </ScrollReveal>

          {/* Windows Card */}
          <ScrollReveal direction="left" delayMs={120} className="h-full">
            <div className="p-6 sm:p-8 bg-[#120d2a] border-3 border-[#9df0cf]/40 shadow-pixel-lg flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#9df0cf] text-[#191244] flex items-center justify-center font-bold">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-pixel text-[13px] text-[#fffdf5]">WINDOWS DESKTOP</h3>
                      <p className="font-silkscreen text-[8.5px] text-[#cbd5e1]/70">PORTABLE X64 ARCHITECTURE</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-[#2c2269] text-[#9df0cf] font-pixel text-[7.5px] border border-[#9df0cf]/50">
                    WIN 10 / 11
                  </span>
                </div>

                <ul className="space-y-3 font-silkscreen text-[10px] text-[#cbd5e1] mb-8">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#57f287] shrink-0 mt-0.5" />
                    <span>Portable x64 executable: runs from any folder or USB drive</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#57f287] shrink-0 mt-0.5" />
                    <span>System tray icon with right-click scaling and playback controls</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#57f287] shrink-0 mt-0.5" />
                    <span>Encrypted session tokens via Windows DPAPI CryptProtectData</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#57f287] shrink-0 mt-0.5" />
                    <span>Always-on-top pin toggle for transparent multitasking</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#57f287] shrink-0 mt-0.5" />
                    <span>No installer, no UAC prompts, zero clutter left in Registry</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
                <a
                  href={DOWNLOAD_LINKS.windowsX64}
                  onClick={() => {
                    try { playClickSound(); } catch {}
                  }}
                  className="py-3 px-4 bg-[#9df0cf] hover:bg-[#b4c4ec] text-[#191244] border-2 border-[#191244] font-pixel text-[10px] font-bold text-center shadow-pixel-sm active:translate-y-0.5 transition-all"
                >
                  DOWNLOAD WINDOWS (X64 PORTABLE)
                </a>
                <span className="text-center font-silkscreen text-[8.5px] text-[#cbd5e1]/70 mt-1">
                  PixelTunes-windows-x64.zip · Extract and launch PixelTunes.exe
                </span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

