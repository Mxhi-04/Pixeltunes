import React, { useEffect, useState } from 'react';

/**
 * 4 Floating Retro Side Mascots (Kirby, Nyan Cat, Pikachu, Chrono Campfire)
 * They stay fixed at the side margins of the viewport and smoothly enlarge as the user scrolls.
 */
export const SideMascots: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(1);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          setScrollY(y);

          // Gracefully fade out when reaching the bottom footer
          const scrollable = document.documentElement.scrollHeight - window.innerHeight;
          const distFromBottom = scrollable - y;
          if (distFromBottom < 500) {
            setFadeOpacity(Math.max(0, distFromBottom / 500));
          } else {
            setFadeOpacity(1);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smoothly enlarge from scale(1.0) up to scale(1.38) as user scrolls down
  // Capped at 1.38 to keep pixel art crisp and avoid overlapping central content
  const scale = Math.min(1 + scrollY * 0.00065, 1.38);

  return (
    <div
      aria-hidden="true"
      className="hidden xl:block pointer-events-none select-none transition-opacity duration-300"
      style={{ opacity: fadeOpacity }}
    >
      {/* 1. Top-Left: Kirby Warp Star */}
      <div
        className="fixed left-5 2xl:left-8 top-32 z-20 transition-transform duration-150 ease-out will-change-transform"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          className="relative p-2 bg-[#191244]/85 border-2 border-[#fec5db] shadow-pixel-sm backdrop-blur-md animate-bounce"
          style={{ animationDuration: '6s' }}
        >
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

      {/* 2. Top-Right: Nyan Cat Vibes */}
      <div
        className="fixed right-5 2xl:right-8 top-32 z-20 transition-transform duration-150 ease-out will-change-transform"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top right',
        }}
      >
        <div
          className="relative p-2 bg-[#191244]/85 border-2 border-[#9df0cf] shadow-pixel-sm backdrop-blur-md animate-bounce"
          style={{ animationDuration: '7s' }}
        >
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

      {/* 3. Bottom-Left: Pikachu Beats */}
      <div
        className="fixed left-5 2xl:left-8 bottom-12 z-20 transition-transform duration-150 ease-out will-change-transform"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'bottom left',
        }}
      >
        <div className="relative p-2 bg-[#191244]/85 border-2 border-[#8fa2d4] shadow-pixel-sm backdrop-blur-md">
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

      {/* 4. Bottom-Right: Chrono Campfire */}
      <div
        className="fixed right-5 2xl:right-8 bottom-12 z-20 transition-transform duration-150 ease-out will-change-transform"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'bottom right',
        }}
      >
        <div className="relative p-2 bg-[#191244]/85 border-2 border-[#ffd269] shadow-pixel-sm backdrop-blur-md">
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
    </div>
  );
};
