import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { RetroWindow } from './components/RetroWindow';
import { SpotifyModal } from './components/SpotifyModal';
import { SettingsModal } from './components/SettingsModal';
import { QuickConnectModal } from './components/QuickConnectModal';
import { AutoLaunchPermissionModal } from './components/AutoLaunchPermissionModal';
import { PlayerDialog } from './components/PlayerDialog';
import { THEMES } from './types/theme';
import { PLAYER_SCALES, SCALES, PlayerScale } from './types/scale';
import { SpotifyPlaybackState } from './types/spotify';
import {
  getPlaybackState,
  getStoredUserName,
  clearSpotifyAuth,
  validateSpotifyToken,
  onSessionRevoked,
  handleWebAuthCallback,
} from './services/spotify';
import {
  hasPromptedAutoLaunch,
  isAutoLaunchEnabled,
  launchSpotifyInBackground,
  markAutoLaunchPrompted,
} from './services/spotifyAutoLaunch';
import { isSoundEffectsEnabled, playClickSound } from './services/soundEffects';

const BASE_WIDTH = 720;
const BASE_HEIGHT = 410;
type ArtMode = 'pixelCovers' | 'pixelArt' | 'cassette';
type MotionMode = 'system' | 'on' | 'off';
const labels = { connect: 'Connect Spotify', autoLaunch: 'Spotify background launch', spotify: 'Spotify', settings: 'Settings' };
type Modal = keyof typeof labels;

function usePreference<T extends string>(key: string, fallback: T, allowed?: readonly T[]) {
  const storageKey = `pixeltunes_${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey) as T | null;
      return stored !== null && (!allowed || allowed.includes(stored)) ? stored : fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, value); } catch {}
  }, [storageKey, value]);
  return [value, setValue] as const;
}

export function App() {
  const isElectron = Boolean(window.electronAPI?.isElectron);
  const [themeId, setThemeId] = usePreference('theme', 'inspo', Object.keys(THEMES));
  const theme = THEMES[themeId];
  const [artMode, setArtMode] = usePreference<ArtMode>('art_mode', 'pixelCovers', ['pixelCovers', 'pixelArt', 'cassette']);
  const [pixelResolution, setPixelResolution] = usePreference<string>('pixel_resolution', '180', ['48', '64', '96', '120', '180', '240']);
  const [scale, setScale] = usePreference<PlayerScale>('scale', 'standard', PLAYER_SCALES);
  const [crt, setCrt] = usePreference('crt', 'on', ['on', 'off']);
  const [motion, setMotion] = usePreference<MotionMode>('motion', 'system', ['system', 'on', 'off']);
  const [windowTitle, setWindowTitle] = usePreference<string>('window_title', 'PIXELTUNES');
  const [titleEmojis, setTitleEmojis] = usePreference<string>('title_emojis', '𐙚 ⊹₊⋆☆');
  const [soundEnabled, setSoundEnabled] = useState(isSoundEffectsEnabled);
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const reducedMotion = motion === 'off' || (motion === 'system' && systemReduced);

  const [modal, setModal] = useState<Modal | null>(null);
  const modalOpener = useRef<HTMLElement | null>(null);
  const openModal = (next: Modal, opener?: HTMLElement) => {
    modalOpener.current = opener ?? null;
    setModal(next);
  };
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [spotifyPlayback, setSpotifyPlayback] = useState<SpotifyPlaybackState | null>(null);
  const [userName, setUserName] = useState('SPOTIFY USER');
  const [authError, setAuthError] = useState('');
  const [authForbidden, setAuthForbidden] = useState(false);
  const [needsScopeUpgrade, setNeedsScopeUpgrade] = useState(false);
  const session = useRef(0);
  const resetAuthError = () => {
    session.current++;
    setAuthError('');
    setAuthForbidden(false);
  };
  const pendingPoll = useRef<Promise<void> | null>(null);

  const closeModal = () => {
    if (modal === 'autoLaunch') markAutoLaunchPrompted();
    modalOpener.current = null;
    setModal(null);
  };

  const connect = useCallback((name: string) => {
    setIsSpotifyConnected(true);
    setUserName(name);
    setNeedsScopeUpgrade(false);
    setAuthError('');
    setAuthForbidden(false);
    if (isAutoLaunchEnabled()) void launchSpotifyInBackground();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let startupTimer: number | undefined;
    const checkAuth = async (interactive = false) => {
      const version = ++session.current;
      if (isElectron && !interactive) {
        startupTimer = window.setTimeout(() => {
          if (cancelled || version !== session.current) return;
          setAuthError('Still checking your saved session. If macOS asks for Keychain access, respond there or connect again.');
          setModal((current) => current ?? 'connect');
        }, 7000);
      }
      let callbackError = '';
      try {
        if (!interactive) await handleWebAuthCallback();
      } catch (error) {
        callbackError = error instanceof Error ? error.message : 'Spotify authorization failed.';
      }
      if (cancelled || version !== session.current) return;
      const { valid, user, needsScopeUpgrade: upgrade, forbidden, error } = await validateSpotifyToken(interactive);
      clearTimeout(startupTimer);
      if (cancelled || version !== session.current) return;
      if (valid && user) {
        connect(user);
        if (isElectron && !hasPromptedAutoLaunch()) {
          setModal((current) => interactive || !current || current === 'connect' ? 'autoLaunch' : current);
        } else {
          setModal((current) => interactive || current === 'connect' ? null : current);
        }
        if (interactive) {
          if (document.querySelector('[data-motion="on"]')) {
            void confetti({ particleCount: 80, spread: 60, disableForReducedMotion: false });
          }
        }
      } else {
        setNeedsScopeUpgrade(Boolean(upgrade));
        setAuthError(error || callbackError || (interactive ? 'Spotify could not complete the connection.' : ''));
        setAuthForbidden(Boolean(forbidden));
        setModal((current) => current ?? 'connect');
      }
    };
    const unsubscribe = window.electronAPI?.onAuthTokenUpdated?.((result) => {
      if (result.error) {
        session.current++;
        setAuthError(result.error);
        setAuthForbidden(Boolean(result.forbidden));
        setModal((current) => current ?? 'connect');
      } else if (result.access_token) {
        void checkAuth(true);
      }
    });
    const unsubscribeRevoked = onSessionRevoked(() => {
      session.current++;
      setIsSpotifyConnected(false);
      setSpotifyPlayback(null);
      setAuthError('Your Spotify session expired. Connect again to resume control.');
      setModal((current) => current ?? 'connect');
    });
    void checkAuth();
    return () => {
      cancelled = true;
      clearTimeout(startupTimer);
      unsubscribe?.();
      unsubscribeRevoked();
    };
  }, [connect, isElectron]);

  const pollSpotify = useCallback(() => {
    if (!isSpotifyConnected) return Promise.resolve();
    if (pendingPoll.current) return pendingPoll.current;
    const version = session.current;
    const request = getPlaybackState().then((state) => {
      if (version === session.current) setSpotifyPlayback(state);
    }).catch(() => {
      // Keep the last confirmed state during a temporary network failure or rate limit.
    }).finally(() => {
      if (pendingPoll.current === request) pendingPoll.current = null;
    });
    pendingPoll.current = request;
    return request;
  }, [isSpotifyConnected]);

  useEffect(() => {
    if (!isSpotifyConnected) return;
    void pollSpotify();
    const interval = window.setInterval(() => {
      if (!document.hidden) void pollSpotify();
    }, 1800);
    const onVisible = () => { if (!document.hidden) void pollSpotify(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      pendingPoll.current = null;
    };
  }, [isSpotifyConnected, pollSpotify]);

  const disconnect = async () => {
    session.current++;
    setIsSpotifyConnected(false);
    setSpotifyPlayback(null);
    try {
      await clearSpotifyAuth();
    } catch {
      setAuthError('Could not clear the saved Spotify session.');
    }
  };

  const [dimensions, setDimensions] = useState(() => ({ width: innerWidth, height: innerHeight }));
  useEffect(() => {
    const resize = () => setDimensions({ width: innerWidth, height: innerHeight });
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const changeMotion = (event: MediaQueryListEvent) => setSystemReduced(event.matches);
    window.addEventListener('resize', resize);
    preference.addEventListener('change', changeMotion);
    return () => {
      window.removeEventListener('resize', resize);
      preference.removeEventListener('change', changeMotion);
    };
  }, []);

  useEffect(() => {
    window.electronAPI?.setScale(scale);
  }, [scale]);
  useEffect(() => window.electronAPI?.onScaleChanged(setScale), [setScale]);

  const portrait = !isElectron && dimensions.width <= 560 && dimensions.height > dimensions.width;
  const frameWidth = portrait ? 420 : BASE_WIDTH;
  const frameHeight = portrait ? 630 : BASE_HEIGHT;
  const fit = Math.min(dimensions.width / frameWidth, dimensions.height / frameHeight);
  const zoomScale = portrait ? fit * { tiny: 0.72, mini: 0.82, standard: 0.92, large: 0.97, xl: 1 }[scale]
    : Math.min(fit, isElectron ? Infinity : SCALES[scale].width / BASE_WIDTH);
  const [clickSparks, setClickSparks] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      playClickSound();
      if (!reducedMotion) {
        setClickSparks((previous) => [...previous.slice(-6), {
          id: Date.now() + Math.random(), x: event.clientX, y: event.clientY,
        }]);
      }
    };
    if (reducedMotion) setClickSparks([]);
    window.addEventListener('pointerdown', pointerDown);
    return () => window.removeEventListener('pointerdown', pointerDown);
  }, [reducedMotion]);

  return (
    <div
      className="w-full h-full relative flex items-center justify-center overflow-hidden"
      data-motion={reducedMotion ? 'off' : 'on'}
      data-theme={themeId}
      data-layout={portrait ? 'portrait' : 'landscape'}
      style={{ backgroundColor: isElectron ? 'transparent' : theme.bodyBg }}
    >
      {!isElectron && (
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden opacity-30" style={{ color: theme.accentPink }}>
          <div className="absolute top-10 left-12 text-xs font-pixel animate-pulse">✦</div>
          <div className="absolute top-1/4 right-24 text-xs font-pixel animate-bounce">★</div>
          <div className="absolute bottom-20 left-28 text-xs font-pixel animate-pulse">✦</div>
          <div className="absolute bottom-1/3 right-16 text-xs font-pixel animate-bounce">★</div>
        </div>
      )}

      <main className="w-full h-full flex items-center justify-center z-10 relative">
        <div
          className="relative shrink-0"
          style={{ width: frameWidth, height: frameHeight, transform: `scale(${zoomScale})` }}
        >
          <div className="w-full h-full" ref={(element) => { if (element) element.inert = Boolean(modal); }}>
            <RetroWindow
              theme={theme}
              artMode={artMode}
              pixelResolution={Number(pixelResolution)}
              reducedMotion={reducedMotion}
              crtEnabled={crt === 'on'}
              windowTitle={windowTitle}
              titleEmojis={titleEmojis}
              scale={scale}
              onScaleChange={setScale}
              isSpotifyConnected={isSpotifyConnected}
              spotifyPlayback={spotifyPlayback}
              onPollSpotify={pollSpotify}
              onOpenSpotifyModal={(opener) => openModal('spotify', opener)}
              onOpenSettingsModal={(opener) => openModal('settings', opener)}
              isModalOpen={Boolean(modal)}
            />
          </div>

          {modal && (
            <PlayerDialog key={modal} label={labels[modal]} opener={modalOpener.current} onClose={closeModal}>
              {modal === 'connect' && (
                <QuickConnectModal isOpen onClose={closeModal} needsScopeUpgrade={needsScopeUpgrade} authError={authError}
                  onRetry={resetAuthError} onOpenSetup={() => openModal('spotify')} />
              )}
              {modal === 'autoLaunch' && <AutoLaunchPermissionModal isOpen onClose={closeModal} />}
              {modal === 'spotify' && (
                <SpotifyModal
                  isOpen onClose={closeModal} isLoggedIn={isSpotifyConnected} userName={userName}
                  authError={authError} authForbidden={authForbidden} onRetryAuth={resetAuthError}
                  onLoginSuccess={() => {
                    session.current++;
                    connect(getStoredUserName());
                  }}
                  onLogout={disconnect}
                  onPlaybackStarted={pollSpotify}
                />
              )}
              {modal === 'settings' && (
                <SettingsModal
                  isOpen onClose={closeModal} currentTheme={theme} onThemeSelect={(next) => setThemeId(next.id)}
                  artMode={artMode} onArtModeSelect={setArtMode}
                  pixelResolution={Number(pixelResolution)} onPixelResolutionChange={(value) => setPixelResolution(String(value))}
                  crtEnabled={crt === 'on'} onToggleCrt={() => setCrt(crt === 'on' ? 'off' : 'on')}
                  motion={motion} onMotionChange={setMotion}
                  soundEnabled={soundEnabled} onToggleSound={setSoundEnabled}
                  windowTitle={windowTitle} onWindowTitleChange={setWindowTitle}
                  titleEmojis={titleEmojis} onTitleEmojisChange={setTitleEmojis}
                  scale={scale} onScaleChange={setScale}
                />
              )}
            </PlayerDialog>
          )}
        </div>
      </main>

      {/* Click Spark Visual Particles (matching reference image) */}
      {clickSparks.map((spark) => (
        <div
          key={spark.id}
          aria-hidden="true"
          className="fixed pointer-events-none z-[99999] select-none"
          style={{ left: `${spark.x}px`, top: `${spark.y}px` }}
        >
          <div onAnimationEnd={() => setClickSparks((previous) => previous.filter(({ id }) => id !== spark.id))}
            className="relative -left-[16px] -top-[16px] w-[32px] h-[32px] animate-pixel-spark">
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
