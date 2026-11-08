import React from 'react';
import { KeyRound, Radio, Palette, Tv, ShieldCheck, Cpu, Sliders, Music, Zap, Layers } from 'lucide-react';

interface FeatureCard {
  tag: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  badge: string;
}

const FEATURES: FeatureCard[] = [
  {
    tag: 'SEC // 01',
    title: 'SPOTIFY PKCE LOOPBACK',
    description:
      'Connects directly to Spotify via RFC 7636 PKCE. Authorization loops back to local port 8888 without intermediate proxy servers or client secret exposure.',
    icon: <KeyRound className="w-5 h-5 text-[#ffd269]" />,
    accent: '#ffd269',
    badge: 'ZERO SECRETS',
  },
  {
    tag: 'AUDIO // 02',
    title: 'OFFLINE SYNTHESIZER',
    description:
      'Features a procedural Web Audio API lo-fi engine that generates soothing 8-bit chillhop chords, vinyl crackle, and basslines entirely offline.',
    icon: <Radio className="w-5 h-5 text-[#9df0cf]" />,
    accent: '#9df0cf',
    badge: '100% OFFLINE',
  },
  {
    tag: 'THEME // 03',
    title: '7 RETRO COLORWAYS',
    description:
      'Switch between Standard Pink, Cyberpunk Neon, Game Boy Pea Soup, Dracula Gothic, Mint Emerald, Sunset Twilight, and Lavender Mist.',
    icon: <Palette className="w-5 h-5 text-[#fec5db]" />,
    accent: '#fec5db',
    badge: '7 PALETTES',
  },
  {
    tag: 'DISPLAY // 04',
    title: 'CRT SCANLINES & 23 SCENES',
    description:
      'Toggle authentic phosphor CRT scanlines and chromatic aberration alongside 23 animated pixel scenes inspired by 90s gaming history.',
    icon: <Tv className="w-5 h-5 text-[#8fa2d4]" />,
    accent: '#8fa2d4',
    badge: '23 ART COVERS',
  },
  {
    tag: 'NATIVE // 05',
    title: 'MENU-BAR & TRAY PLAYER',
    description:
      'Hides quietly to the macOS menu-bar (LSUIElement accessory mode) or Windows tray icon with right-click size scaling and media controls.',
    icon: <Cpu className="w-5 h-5 text-[#ffd269]" />,
    accent: '#ffd269',
    badge: 'MAC & WIN NATIVE',
  },
  {
    tag: 'PRIVACY // 06',
    title: 'KEYCHAIN ENCRYPTION',
    description:
      'Zero telemetry, zero trackers. Saved Spotify sessions are encrypted directly through Electron safeStorage backed by macOS Keychain and Windows DPAPI.',
    icon: <ShieldCheck className="w-5 h-5 text-[#9df0cf]" />,
    accent: '#9df0cf',
    badge: 'SAFESTORAGE',
  },
];

export const FeaturesGrid: React.FC = () => {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 bg-[#09071a] relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Tag */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#191244] border border-white/20 text-[#fffdf5] font-silkscreen text-[9.5px] tracking-[0.2em] shadow-pixel-sm mb-4">
            <span className="text-[#fec5db]">[ 03 // ARCHITECTURAL ADVANTAGES ]</span>
            <span className="text-white/30">|</span>
            <span className="text-[#9df0cf]">BUILT FOR DISTRACTION-FREE FOCUS</span>
          </div>

          <h2 className="font-pixel text-[20px] sm:text-[32px] md:text-[38px] text-[#fffdf5] leading-tight">
            CRAFTED WITH PRECISION.
          </h2>
          <p className="mt-3 text-sm sm:text-base font-sans text-[#cbd5e1] max-w-xl">
            Everything you need for an immersive workspace soundtrack without bloated web wrappers
            or intrusive analytics.
          </p>
        </div>

        {/* Feature Cards Grid (Dope.security + Unicorn Studio inspired) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => (
            <div
              key={idx}
              className="group relative p-6 bg-[#120d2b]/80 hover:bg-[#1a133d] border-2 border-white/10 hover:border-white/30 shadow-pixel transition-all duration-200 flex flex-col justify-between"
              style={{
                boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.6)',
              }}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between mb-4 font-silkscreen">
                  <span className="text-[9px] text-[#cbd5e1]/50 tracking-widest">{feature.tag}</span>
                  <span
                    className="px-2 py-0.5 border text-[7.5px] font-pixel"
                    style={{
                      borderColor: `${feature.accent}50`,
                      color: feature.accent,
                      backgroundColor: `${feature.accent}15`,
                    }}
                  >
                    {feature.badge}
                  </span>
                </div>

                {/* Icon & Title */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-[#191244] border-2 border-[#191244] shadow-pixel-sm">
                    {feature.icon}
                  </div>
                  <h3 className="font-pixel text-[11px] font-bold text-[#fffdf5] tracking-wide group-hover:text-[#fec5db] transition-colors">
                    {feature.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="font-sans text-xs sm:text-sm text-[#cbd5e1]/80 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Bottom Hairline Highlight */}
              <div
                className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[9px] font-silkscreen text-[#cbd5e1]/50"
              >
                <span>NATIVE DESKTOP CAPABILITY</span>
                <span className="text-[#57f287]">● VERIFIED</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

