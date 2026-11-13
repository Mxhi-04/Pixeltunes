import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { playClickSound } from '../../shared/services/soundEffects';
import { ScrollReveal } from '../hooks/useScrollAnimation';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'Do I need a Spotify Premium account to use PixelTunes?',
    a: 'No! You can use PixelTunes in 100% Offline Lo-Fi mode without any Spotify account whatsoever. If you do connect your Spotify account, basic track control works with both Free and Premium tiers, while full playback handover operates on any active Spotify device on your local network.',
  },
  {
    q: 'Does PixelTunes work completely offline?',
    a: 'Yes! PixelTunes comes with a built-in procedural 8-bit / lo-fi synthesizer engine that generates chillhop chords, gentle basslines, and vinyl crackle entirely in real-time via the Web Audio API. It requires zero MB of streamed MP3s and works offline on airplanes or without Wi-Fi.',
  },
  {
    q: 'How does PixelTunes protect my Spotify account and security?',
    a: 'PixelTunes uses RFC 7636 Proof Key for Code Exchange (PKCE). When you sign in, you authenticate directly on accounts.spotify.com in your default browser. No client secrets are stored or exposed, and all session tokens are encrypted locally on your computer using Electron safeStorage (macOS Keychain and Windows DPAPI).',
  },
  {
    q: 'How do I open PixelTunes on macOS if Gatekeeper displays a warning?',
    a: 'Because PixelTunes is an independent open-source release built by the community, macOS Gatekeeper may present a dialog on first launch. Simply right-click PixelTunes.app in Finder, select "Open", and click "Open" on the confirmation prompt, or approve it under System Settings > Privacy & Security > Open Anyway.',
  },
  {
    q: 'How do I install PixelTunes on Windows?',
    a: 'PixelTunes on Windows is packaged as a portable 64-bit application. Unzip "PixelTunes-windows-x64.zip" into any folder of your choice (such as Documents or Desktop) and double-click PixelTunes.exe. It does not require administrator privileges or an installer.',
  },
  {
    q: 'Can I keep PixelTunes pinned on top of my code editor or games?',
    a: 'Yes! Toggle the pin icon on the window or access the menu to enable "Keep Player on Top". PixelTunes stays neatly floating above VS Code, browsers, or games without stealing keyboard focus.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    try { playClickSound(); } catch {}
    setOpenIndex((curr) => (curr === idx ? null : idx));
  };

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 bg-[#09071a] relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Stamped Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#191244] border border-white/20 text-[#fffdf5] font-silkscreen text-[9.5px] tracking-[0.2em] shadow-pixel-sm mb-4">
            <span className="text-[#ffd269]">[ 07 // FREQUENTLY ASKED QUESTIONS ]</span>
            <span className="text-white/30">|</span>
            <span className="text-[#9df0cf]">TRANSPARENCY FIRST</span>
          </div>

          <h2 className="font-pixel text-[20px] sm:text-[32px] md:text-[38px] text-[#fffdf5] leading-tight">
            COMMONLY ASKED QUESTIONS.
          </h2>
          <p className="mt-3 text-sm sm:text-base font-sans text-[#cbd5e1] max-w-xl">
            Everything you need to know about the architecture, security, and usage of PixelTunes.
          </p>
        </div>

        {/* FAQ Accordion List with Scroll Reveal */}
        <div className="space-y-3.5">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <ScrollReveal key={idx} delayMs={idx * 70}>
                <div
                  className="bg-[#120d2b] border-2 border-[#191244] shadow-pixel-sm overflow-hidden transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${idx}`}
                    id={`faq-question-${idx}`}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#1a133d] transition-colors"
                  >
                    <span className="font-pixel text-[10px] sm:text-[11.5px] text-[#fffdf5] flex items-center gap-2.5">
                      <span className="text-[#fec5db]">{isOpen ? '▾' : '▸'}</span>
                      <span>{faq.q}</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#ffd269] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div
                      id={`faq-answer-${idx}`}
                      role="region"
                      aria-labelledby={`faq-question-${idx}`}
                      className="px-5 pb-5 pt-1 border-t border-white/10 font-sans text-xs sm:text-sm text-[#cbd5e1] leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

