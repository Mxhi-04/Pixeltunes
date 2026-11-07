import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { RetroWindow } from './components/RetroWindow';
import { SpotifyModal } from './components/SpotifyModal';
import { SettingsModal } from './components/SettingsModal';
import { QuickConnectModal } from './components/QuickConnectModal';
import { THEMES, RetroTheme } from './types/theme';
import { SCALES, PlayerScale } from './types/scale';
import { SpotifyPlaybackState } from './types/spotify';
import { lofiEngine } from './services/lofiAudio';
import {
  getAccessToken,
  getPlaybackState,
  getStoredUserName,
  clearSpotifyAuth,
  validateSpotifyToken,
  startSpotifyAutoRefreshLoop,
  onSessionRevoked,
  setStoredUserName,
  loadAndPauseFirstLikedSong,
  handleWebAuthCallback,
} from './services/spotify';
import { isSoundEffectsEnabled, setSoundEffectsEnabled, playClickSound } from './services/soundEffects';

const BASE_WIDTH = 720;
const BASE_HEIGHT = 410;

const DEFAULT_TITLE_EMOJIS = '𐙚 ⊹₊⋆☆';
const DEFAULT_WINDOW_TITLE = 'PIXELTUNES';

export const App: React.FC = () => {
  // Theme & Aesthetic State
  const [currentTheme, setCurrentTheme] = useState<RetroTheme>(THEMES.inspo);
  const [artMode, setArtMode] = useState<'inspo' | 'pixelArt' | 'cassette'>('inspo');
  const [pixelResolution, setPixelResolution] = useState<number>(180);
  const [scale, setScale] = useState<PlayerScale>('standard');
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(isSoundEffectsEnabled());
  const [windowTitle, setWindowTitle] = useState(() => {
    return localStorage.getItem('pixeltunes_window_title') || DEFAULT_WINDOW_TITLE;
  });
  const [titleEmojis, setTitleEmojis] = useState(() => {
    return localStorage.getItem('pixeltunes_title_emojis') || DEFAULT_TITLE_EMOJIS;
  });

  const handleWindowTitleChange = (newTitle: string) => {
    setWindowTitle(newTitle);
    localStorage.setItem('pixeltunes_window_title', newTitle);
  };

  const handleTitleEmojisChange = (newEmojis: string) => {
    setTitleEmojis(newEmojis);
    localStorage.setItem('pixeltunes_title_emojis', newEmojis);
  };

  // Spotify State
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [spotifyPlayback, setSpotifyPlayback] = useState<SpotifyPlaybackState | null>(null);
  const [userName, setUserName] = useState('RABGON');
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [needsScopeUpgrade, setNeedsScopeUpgrade] = useState(false);
  const [initialLikedTrack, setInitialLikedTrack] = useState<any>(null);
  const [initialLikedList, setInitialLikedList] = useState<any[]>([]);

  // Modals
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Helper to load and pause user's first liked song on startup/connect
  const syncFirstLikedSong = useCallback(async () => {
    try {
      const res = await loadAndPauseFirstLikedSong();
      if (res.firstTrack) {
        setInitialLikedTrack(res.firstTrack);
        setInitialLikedList(res.likedSongs);
      }
    } catch (e) {
      console.error('Failed to sync first liked song:', e);
    }
  }, []);

  // Window Dimensions for Responsive Proportional Scaling (Layout NEVER changes!)
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : BASE_WIDTH,
    height: typeof window !== 'undefined' ? window.innerHeight : BASE_HEIGHT,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute uniform zoom scale factor so layout never reflows
  const zoomScale = Math.max(
    0.35,
    Math.min(windowDimensions.width / BASE_WIDTH, windowDimensions.height / BASE_HEIGHT)
  );

  // Validate session on mount & subscribe to token updates
  useEffect(() => {
    const checkInitialAuth = async () => {
      // 0. Check if web browser returned from Spotify PKCE redirect
      await handleWebAuthCallback().catch(() => {});

      // 1. Initial check: If user has a valid Keychain session with all scopes, connect & pause on 1st liked song
      const { valid, user, needsScopeUpgrade: upgradeRequired } = await validateSpotifyToken();
      if (valid && user && !upgradeRequired) {
        setIsSpotifyConnected(true);
        setUserName(user);
        setShowQuickConnect(false);
        setNeedsScopeUpgrade(false);
        // Pause on the very first song of user's Liked Songs playlist whenever Pixeltunes is opened!
        syncFirstLikedSong();
      } else {
        setIsSpotifyConnected(false);
        setNeedsScopeUpgrade(Boolean(upgradeRequired));
        // Prompt to connect in 1-click on open!
        setShowQuickConnect(true);
      }
    };

    checkInitialAuth();

    // 2. Subscribe to Electron PKCE auth callback (zero reload, instant seamless sync)
    let unsubscribeUpdated: (() => void) | undefined;
    if (window.electronAPI?.onAuthTokenUpdated) {
      unsubscribeUpdated = window.electronAPI.onAuthTokenUpdated(async (payload) => {
        setIsSpotifyConnected(true);
        setShowQuickConnect(false);
        setNeedsScopeUpgrade(false);
        const name = (payload.user_name || 'SPOTIFY USER').toUpperCase();
        setUserName(name);
        setStoredUserName(name);
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#fec5db', '#8fa2d4', '#9df0cf', '#ffd269'],
        });

        // As soon as Pixeltunes is connected, pause on the first liked song playlist of the user!
        syncFirstLikedSong();
      });
    }

    // 3. Subscribe to invalid_grant revocation (shows non-blocking reconnect button)
    const unsubscribeRevoked = onSessionRevoked(() => {
      setIsSpotifyConnected(false);
      setSpotifyPlayback(null);
      setShowQuickConnect(true);
    });

    return () => {
      if (unsubscribeUpdated) unsubscribeUpdated();
      unsubscribeRevoked();
    };
  }, [syncFirstLikedSong]);

  // Poll Spotify Playback State
  const pollSpotify = useCallback(async () => {
    if (!isSpotifyConnected) return;
    const token = await getAccessToken();
    if (!token) {
      setIsSpotifyConnected(false);
      return;
    }

    const state = await getPlaybackState();
    setSpotifyPlayback(state);
  }, [isSpotifyConnected]);

  useEffect(() => {
    if (!isSpotifyConnected) return;

    pollSpotify();
    const interval = setInterval(pollSpotify, 1200);
    return () => clearInterval(interval);
  }, [isSpotifyConnected, pollSpotify]);

  // Dedicated background auto-refresh loop (zero disruption to playback)
  useEffect(() => {
    if (!isSpotifyConnected) return;
    const cleanup = startSpotifyAutoRefreshLoop();
    return cleanup;
  }, [isSpotifyConnected]);

  // Global Soft Minimalistic Click Sound & Visual Click Sparks (from reference image)
  const [clickSparks, setClickSparks] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    const handleGlobalPointerDown = (e: MouseEvent) => {
      // Soft minimalistic tactile click
      playClickSound();

      // Spawn pixel click spark effect at mouse coordinates
      const newSpark = { id: Date.now() + Math.random(), x: e.clientX, y: e.clientY };
      setClickSparks((prev) => [...prev.slice(-6), newSpark]);

      setTimeout(() => {
        setClickSparks((prev) => prev.filter((s) => s.id !== newSpark.id));
      }, 260);
    };

    window.addEventListener('pointerdown', handleGlobalPointerDown);
    return () => window.removeEventListener('pointerdown', handleGlobalPointerDown);
  }, []);

  // Cycle Art Mode Helper
  const handleCycleArtMode = () => {
    setArtMode((prev) => {
      if (prev === 'inspo') return 'pixelArt';
      if (prev === 'pixelArt') return 'cassette';
      return 'inspo';
    });
  };

  const handleLoginSuccess = async () => {
    setIsSpotifyConnected(true);
    setShowQuickConnect(false);
    setNeedsScopeUpgrade(false);
    const name = getStoredUserName();
    setUserName(name);
    pollSpotify();
    await syncFirstLikedSong();
  };

  const handleLogout = () => {
    clearSpotifyAuth();
    setIsSpotifyConnected(false);
    setSpotifyPlayback(null);
    setInitialLikedTrack(null);
    setInitialLikedList([]);
    setShowQuickConnect(true);
  };

  // Check if running in Electron
  const isElectron = Boolean(window.electronAPI?.isElectron);

  const handleScaleChange = (newScale: PlayerScale) => {
    setScale(newScale);
    const dims = SCALES[newScale];
    if (window.electronAPI?.setSize) {
      window.electronAPI.setSize(dims.width, dims.height);
    }
  };

  return (
    <div
      className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: isElectron ? 'transparent' : currentTheme.bodyBg }}
    >
      {/* CRT Scanline Overlay Effect */}
      {crtEnabled && (
        <div className="fixed inset-0 crt-overlay z-40 pointer-events-none" />
      )}

      {/* Floating Pixel Stars Background (only in browser mode) */}
      {!isElectron && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-10 left-12 text-[#fec5db] text-xs font-pixel animate-pulse">✦</div>
          <div className="absolute top-1/4 right-24 text-[#8fa2d4] text-xs font-pixel animate-bounce">★</div>
          <div className="absolute bottom-20 left-28 text-[#ffd269] text-xs font-pixel animate-pulse">✦</div>
          <div className="absolute bottom-1/3 right-16 text-[#9df0cf] text-xs font-pixel animate-bounce">★</div>
          <div className="absolute top-1/2 left-8 text-[#fec5db] text-[10px] font-pixel">✦</div>
        </div>
      )}

      {/* Main Scaled Canvas: Fixed 720x410 layout, scaled uniformly like a fixed canvas */}
      <main className="w-full h-full flex items-center justify-center z-10 overflow-hidden relative">
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{
            width: `${BASE_WIDTH}px`,
            height: `${BASE_HEIGHT}px`,
            transform: `scale(${zoomScale})`,
            transformOrigin: 'center center',
          }}
        >
          <RetroWindow
            theme={currentTheme}
            artMode={artMode}
            onCycleArtMode={handleCycleArtMode}
            pixelResolution={pixelResolution}
            windowTitle={windowTitle}
            titleEmojis={titleEmojis}
            scale={scale}
            onScaleChange={handleScaleChange}
            isSpotifyConnected={isSpotifyConnected}
            spotifyPlayback={spotifyPlayback}
            initialLikedTrack={initialLikedTrack}
            initialLikedList={initialLikedList}
            onPollSpotify={pollSpotify}
            onOpenSpotifyModal={() => setIsSpotifyModalOpen(true)}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            isModalOpen={isSpotifyModalOpen || isSettingsModalOpen || showQuickConnect}
          />

          {/* 1-Click Spotify Connect Prompt on Startup */}
          <QuickConnectModal
            isOpen={showQuickConnect}
            onClose={() => setShowQuickConnect(false)}
            needsScopeUpgrade={needsScopeUpgrade}
            onConnected={syncFirstLikedSong}
          />

          {/* Modals rendered directly inside the scaled 720x410 container so they never clip or distort! */}
          <SpotifyModal
            isOpen={isSpotifyModalOpen}
            onClose={() => setIsSpotifyModalOpen(false)}
            isLoggedIn={isSpotifyConnected}
            userName={userName}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />

          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            currentTheme={currentTheme}
            onThemeSelect={setCurrentTheme}
            artMode={artMode}
            onArtModeSelect={setArtMode}
            pixelResolution={pixelResolution}
            onPixelResolutionChange={setPixelResolution}
            crtEnabled={crtEnabled}
            onToggleCrt={() => setCrtEnabled(!crtEnabled)}
            soundEnabled={soundEnabled}
            onToggleSound={setSoundEnabled}
            windowTitle={windowTitle}
            onWindowTitleChange={handleWindowTitleChange}
            titleEmojis={titleEmojis}
            onTitleEmojisChange={handleTitleEmojisChange}
            scale={scale}
            onScaleChange={handleScaleChange}
          />
        </div>
      </main>

      {/* Click Spark Visual Particles (matching reference image) */}
      {clickSparks.map((spark) => (
        <div
          key={spark.id}
          className="fixed pointer-events-none z-[99999] select-none"
          style={{ left: `${spark.x}px`, top: `${spark.y}px` }}
        >
          <div className="relative -left-[16px] -top-[16px] w-[32px] h-[32px] animate-pixel-spark">
            {/* Top vertical ray + shadow */}
            <div className="absolute top-[2px] left-[15px] w-[2px] h-[6px] bg-[#191244] shadow-[1.5px_1.5px_0px_rgba(25,18,68,0.28)]" />

            {/* Top-right diagonal rays + shadow */}
            <div className="absolute top-[6px] left-[21px] w-[3px] h-[3px] bg-[#191244] shadow-[1.5px_1.5px_0px_rgba(25,18,68,0.28)]" />
            <div className="absolute top-[3px] left-[25px] w-[3px] h-[3px] bg-[#191244] shadow-[1.5px_1.5px_0px_rgba(25,18,68,0.28)]" />

            {/* Right horizontal ray + shadow */}
            <div className="absolute top-[15px] left-[23px] w-[6px] h-[2px] bg-[#191244] shadow-[1.5px_1.5px_0px_rgba(25,18,68,0.28)]" />

            {/* Left horizontal ray + shadow */}
            <div className="absolute top-[15px] left-[3px] w-[6px] h-[2px] bg-[#191244] shadow-[1.5px_1.5px_0px_rgba(25,18,68,0.28)]" />

            {/* Top-left diagonal rays + shadow */}
            <div className="absolute top-[6px] left-[8px] w-[3px] h-[3px] bg-[#191244] shadow-[1.5px_1.5px_0px_rgba(25,18,68,0.28)]" />
            <div className="absolute top-[3px] left-[4px] w-[3px] h-[3px] bg-[#191244] shadow-[1.5px_1.5px_0px_rgba(25,18,68,0.28)]" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;
