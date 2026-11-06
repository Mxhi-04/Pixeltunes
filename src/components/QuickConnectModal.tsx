import React, { useState, useEffect, useRef } from 'react';
import { login as authLogin, getAccessToken, validateSpotifyToken } from '../services/spotify';
import { playClickSound, playPlaySound } from '../services/soundEffects';

interface QuickConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  needsScopeUpgrade?: boolean;
  onConnected?: () => void;
}

export const QuickConnectModal: React.FC<QuickConnectModalProps> = ({
  isOpen,
  onClose,
  needsScopeUpgrade = false,
  onConnected,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const connectedHandledRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setIsConnecting(false);
      setStatusMsg(null);
      connectedHandledRef.current = false;
    }
  }, [isOpen]);

  // Robust multi-channel listener for auth success
  useEffect(() => {
    if (!isOpen) return;

    const handleConnected = () => {
      if (connectedHandledRef.current) return;
      connectedHandledRef.current = true;
      setIsConnecting(false);
      setStatusMsg('★ Connected successfully! Loading your Liked Songs...');
      if (onConnected) onConnected();
      setTimeout(() => {
        onClose();
      }, 500);
    };

    // 1. Electron IPC Listener
    let unsubscribeIpc: (() => void) | undefined;
    if (window.electronAPI?.onAuthTokenUpdated) {
      unsubscribeIpc = window.electronAPI.onAuthTokenUpdated(handleConnected);
    }

    // 2. Active Polling while connecting
    let pollInterval: any = null;
    const checkAuth = async () => {
      try {
        const { valid } = await validateSpotifyToken();
        if (valid) {
          handleConnected();
        }
      } catch {}
    };

    if (isConnecting) {
      pollInterval = setInterval(checkAuth, 800);
    }

    // 3. Window Focus Listener (as soon as user returns from browser to app)
    const handleFocus = () => {
      checkAuth();
    };
    window.addEventListener('focus', handleFocus);

    // 4. BroadcastChannel for cross-tab Web sync
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('pixeltunes_auth');
      bc.onmessage = (e) => {
        if (e.data?.type === 'CONNECTED') {
          handleConnected();
        }
      };
    } catch {}

    // 5. LocalStorage sync listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pixeltunes_auth_sync') {
        checkAuth();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (unsubscribeIpc) unsubscribeIpc();
      if (pollInterval) clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, [isOpen, isConnecting, onClose, onConnected]);

  if (!isOpen) return null;

  const handleOneClickConnect = async () => {
    playClickSound();
    setIsConnecting(true);
    setStatusMsg('Opening Spotify in browser... Click "Agree" to link!');

    try {
      const res = await authLogin();
      if (!res.success && res.error) {
        setIsConnecting(false);
        setStatusMsg(res.error);
      }
    } catch (err: any) {
      setIsConnecting(false);
      setStatusMsg(err.message || 'Connection failed. Please retry.');
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#191244]/80 backdrop-blur-[2px] p-4 select-none animate-fadeIn">
      <div
        className="relative w-[360px] max-w-[94%] bg-[#fffdf5] border-4 border-[#191244] shadow-pixel-lg flex flex-col overflow-hidden"
        style={{
          boxShadow: '6px 6px 0px 0px #191244',
        }}
      >
        {/* Retro Title Bar */}
        <div className="h-8 bg-[#fec5db] border-b-4 border-[#191244] px-3 flex items-center justify-between select-none shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[12px] text-[#ff7b90] animate-bounce">♫</span>
            <span className="font-pixel text-[8.5px] font-bold tracking-widest text-[#191244] truncate">
              {needsScopeUpgrade ? 'SPOTIFY PERMISSION UPDATE' : 'SPOTIFY 1-CLICK CONNECT'}
            </span>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            title="Close"
            className="w-4 h-4 rounded-full border-2 border-[#191244] bg-[#ff7b90] text-[#191244] text-[8px] font-bold flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer leading-none"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex flex-col items-center text-center space-y-3">
          {/* Animated Pixel Icon */}
          <div className="w-12 h-12 rounded-full bg-[#9df0cf] border-3 border-[#191244] flex items-center justify-center shadow-pixel-sm">
            <span className="text-xl select-none animate-pulse">♫</span>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="font-pixel text-[11px] font-bold text-[#191244] tracking-wider uppercase">
              {needsScopeUpgrade ? 'Update Spotify Scopes' : 'Welcome to Pixeltunes!'}
            </h2>
            <p className="font-silkscreen text-[8px] text-[#191244]/80 leading-relaxed max-w-[280px]">
              {needsScopeUpgrade
                ? 'Your Spotify session needs 1-click update to unlock your Liked Songs and playlists without glitching.'
                : 'Connect with 1-click to auto-load your Liked Songs playlist and enjoy glitch-free retro music.'}
            </p>
          </div>

          {/* Status Message / Notification */}
          {statusMsg && (
            <div className="w-full bg-[#ffd269] border-2 border-[#191244] py-1 px-2 text-[7.5px] font-pixel text-[#191244] truncate animate-pulse">
              {statusMsg}
            </div>
          )}

          {/* 1-Click Connect Button */}
          <button
            onClick={handleOneClickConnect}
            disabled={isConnecting}
            className="w-full py-2.5 px-4 bg-[#9df0cf] hover:bg-[#8fa2d4] active:translate-y-0.5 text-[#191244] border-3 border-[#191244] shadow-pixel-sm font-pixel text-[9.5px] font-bold tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2 group disabled:opacity-60"
          >
            {isConnecting ? (
              <>
                <span className="animate-spin text-xs">↻</span>
                <span>OPENING BROWSER...</span>
              </>
            ) : (
              <>
                <span className="text-xs group-hover:scale-125 transition-transform">✦</span>
                <span>CONNECT SPOTIFY (1-CLICK)</span>
                <span className="text-xs group-hover:scale-125 transition-transform">✦</span>
              </>
            )}
          </button>

          {/* Skip / Guest Link */}
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="font-silkscreen text-[7.5px] text-[#191244]/65 hover:text-[#ff7b90] underline cursor-pointer transition-colors"
          >
            Continue in Lo-Fi Audio mode
          </button>
        </div>
      </div>
    </div>
  );
};

