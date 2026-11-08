import React, { useState } from 'react';
import { Sparkles, Eye, Disc } from 'lucide-react';
import { playClickSound } from '../../services/soundEffects';
import { ScrollReveal } from '../../hooks/useScrollAnimation';

interface ArtItem {
  name: string;
  file: string;
  era: string;
  vibe: string;
}

const GALLERY_ITEMS: ArtItem[] = [
  { name: 'CHRONO CAMPFIRE', file: '/covers/18_chrono_campfire.gif', era: '1995 · SNES', vibe: 'Acoustic Campfire Chill' },
  { name: 'KIRBY WARP STAR', file: '/covers/04_kirby_warpstar.gif', era: '1992 · HAL LABS', vibe: 'Dream Land Night Ride' },
  { name: 'STARDEW VALLEY', file: '/covers/20_stardew_farm.gif', era: '2016 · INDIE', vibe: 'Summer Rain Harvest' },
  { name: 'SATURN GALAXY', file: '/covers/00_saturn_galaxy.png', era: 'RETRO SCI-FI', vibe: 'Deep Cosmic Ambient' },
  { name: 'NYAN SPACE CAT', file: '/covers/01_nyan_cat.gif', era: '2011 · INTERNET', vibe: 'Sweet Pop Synth' },
  { name: 'PALLET TOWN PIKACHU', file: '/covers/02_pokemon_pikachu.gif', era: '1996 · GAME BOY', vibe: 'Nostalgic Route 1' },
  { name: 'ZELDA TRIFORCE', file: '/covers/06_zelda_triforce.gif', era: '1991 · HYRULE', vibe: 'Pastel Dungeon Waltz' },
  { name: 'METROID SAMUS', file: '/covers/11_metroid_samus.gif', era: '1994 · SUPER', vibe: 'Atmospheric Brinstar' },
  { name: 'MEGA MAN CHARGE', file: '/covers/10_megaman_charging.gif', era: '1987 · CAPCOM', vibe: 'High-Energy Chiptune' },
  { name: 'SONIC GREEN HILL', file: '/covers/07_sonic_green_hill.gif', era: '1991 · SEGA', vibe: '16-Bit Palm Breeze' },
  { name: 'CASTLEVANIA MOON', file: '/covers/15_castlevania_moon.gif', era: '1997 · KONAMI', vibe: 'Gothic Nocturne' },
  { name: 'UNDERTALE DOG', file: '/covers/19_undertale_dog.gif', era: '2015 · TOBY FOX', vibe: 'Playful Lo-Fi Whistle' },
];

export const PixelArtGallery: React.FC = () => {
  const [activeItem, setActiveItem] = useState(GALLERY_ITEMS[0]);

  return (
    <section id="pixel-art" className="py-24 px-4 sm:px-6 bg-[#09071a] relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Stamped Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#191244] border border-white/20 text-[#fffdf5] font-silkscreen text-[9.5px] tracking-[0.2em] shadow-pixel-sm mb-4">
            <span className="text-[#fec5db]">[ 05 // 23 NOSTALGIC COVERS ]</span>
            <span className="text-white/30">|</span>
            <span className="text-[#9df0cf]">ANIMATED 16-BIT VISUALS</span>
          </div>

          <h2 className="font-pixel text-[20px] sm:text-[32px] md:text-[38px] text-[#fffdf5] leading-tight">
            NOSTALGIA IN MOTION.
          </h2>
          <p className="mt-3 text-sm sm:text-base font-sans text-[#cbd5e1] max-w-xl">
            PixelTunes includes 23 animated pixel scenes that cycle during playback, freeze on reduced-motion
            systems, and respond to your active retro palette.
          </p>
        </div>

        {/* Gallery Grid with Staggered Scroll Motion */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {GALLERY_ITEMS.map((item, idx) => (
            <ScrollReveal key={idx} delayMs={(idx % 6) * 60}>
              <div
                onClick={() => {
                  try { playClickSound(); } catch {}
                  setActiveItem(item);
                }}
                className="group relative bg-[#120d2a] border-3 border-[#191244] hover:border-[#fec5db] p-2 shadow-pixel-sm hover:shadow-pixel transition-all duration-200 cursor-pointer hover:translate-y-[-4px]"
              >
                {/* Art Box */}
                <div className="relative aspect-square bg-[#0a071c] overflow-hidden border border-white/10 mb-2">
                  <img
                    src={item.file}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="crt-overlay absolute inset-0 pointer-events-none opacity-60" />
                </div>

                {/* Title and metadata */}
                <div className="font-silkscreen">
                  <p className="text-[8.5px] font-bold text-[#fffdf5] truncate group-hover:text-[#ffd269] transition-colors">
                    {item.name}
                  </p>
                  <p className="text-[7px] text-[#cbd5e1]/60 truncate mt-0.5">
                    {item.era}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

