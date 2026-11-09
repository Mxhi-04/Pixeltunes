import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { CinematicScroll } from './components/CinematicScroll';
import { LivePlayerShowcase } from './components/LivePlayerShowcase';
import { FeaturesGrid } from './components/FeaturesGrid';
import { ThemeMatrix } from './components/ThemeMatrix';
import { PixelArtGallery } from './components/PixelArtGallery';
import { SpecsComparison } from './components/SpecsComparison';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';

interface LandingPageProps {
  onOpenPlayer: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenPlayer }) => {
  return (
    <div className="min-h-screen bg-[#0a071c] text-[#fffdf5] selection:bg-[#fec5db] selection:text-[#191244] font-sans antialiased">
      {/* Fixed Navbar */}
      <Navbar onOpenPlayer={onOpenPlayer} />

      {/* Main Content Sections */}
      <main>
        {/* 1. Hero with Dynamic OS Detection Download Buttons */}
        <Hero onOpenPlayer={onOpenPlayer} />

        {/* 2. SOTA 300vh Sticky Scroll Sequence (Skill Workflow) */}
        <CinematicScroll onOpenPlayer={onOpenPlayer} />

        {/* 3. Live Interactive Browser Player Proving Ground */}
        <LivePlayerShowcase onOpenFullPlayer={onOpenPlayer} />

        {/* 4. Architectural Specs & Features Grid (Dope.security / Discord style) */}
        <FeaturesGrid />

        {/* 5. 7 Authentic Retro Palettes Matrix */}
        <ThemeMatrix />

        {/* 6. 23 Animated Pixel Scenes Gallery */}
        <PixelArtGallery />

        {/* 7. macOS & Windows Specifications Comparison */}
        <SpecsComparison />

        {/* 8. Frequently Asked Questions */}
        <FaqSection />
      </main>

      {/* Footer & Final Download CTA Banner */}
      <Footer onOpenPlayer={onOpenPlayer} />
    </div>
  );
};

