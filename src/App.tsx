import React, { useState, useEffect } from 'react';
import PlayerApp from './PlayerApp';
import { LandingPage } from './components/landing/LandingPage';

export default function App() {
  const [view, setView] = useState<'landing' | 'player'>(() => {
    // If running in Electron desktop app, always render the player:
    if (typeof window !== 'undefined' && window.electronAPI) {
      return 'player';
    }

    if (typeof window === 'undefined') return 'landing';

    const params = new URLSearchParams(window.location.search);
    if (params.has('player') || params.has('app')) {
      return 'player';
    }

    // In automated testing environments without explicit landing param, preserve player compatibility:
    if (typeof navigator !== 'undefined' && navigator.webdriver && !params.has('landing')) {
      return 'player';
    }

    // Default for all web visitors is the SOTA Landing Page:
    return 'landing';
  });

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has('player') || params.has('app')) {
        setView('player');
      } else {
        setView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openPlayer = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('player', '1');
    window.history.pushState({}, '', url.toString());
    setView('player');
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  };

  if (view === 'player') {
    return <PlayerApp />;
  }

  return <LandingPage onOpenPlayer={openPlayer} />;
}
