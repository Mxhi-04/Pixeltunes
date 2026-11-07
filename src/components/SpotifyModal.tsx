import React, { useState, useEffect } from 'react';
import {
  login as authLogin,
  clearSpotifyAuth,
  getSpotifyDevices,
  transferPlaybackSpotify,
  validateSpotifyToken,
  setInMemoryTokenForTesting,
  forceExpireTokenForTesting,
} from '../services/spotify';
import { SpotifyDevice } from '../types/spotify';
import { playClickSound } from '../services/soundEffects';

interface SpotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  userName: string;
  onLoginSuccess: () => void;
  onLogout: () => void;
}

export const SpotifyModal: React.FC<SpotifyModalProps> = ({
  isOpen,
  onClose,
  isLoggedIn,
  userName,
  onLoginSuccess,
  onLogout,
}) => {
  const [manualToken, setManualToken] = useState('');
  const [isWaitingAuth, setIsWaitingAuth] = useState(false);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [showAdvancedOAuth, setShowAdvancedOAuth] = useState(false);
  const [clientId, setClientId] = useState('');
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);

  useEffect(() => {
    if (!isOpen) return;

    if (isLoggedIn) {
      validateSpotifyToken().then(({ valid }) => {
        if (!valid) {
          clearSpotifyAuth();
          onLogout();
          setStatusMsg('Session was revoked. Please connect Spotify below.');
          setIsError(true);
        } else {
          loadDevices();
        }
      });
    }

    // Auto-sync when browser auth completes
    let unsubscribeUpdated: (() => void) | undefined;
    if (window.electronAPI?.onAuthTokenUpdated) {
      unsubscribeUpdated = window.electronAPI.onAuthTokenUpdated((payload) => {
        setIsWaitingAuth(false);
        const name = payload.user_name || 'SPOTIFY USER';
        setStatusMsg(`★ Connected as ${name}!`);
        setIsError(false);
        onLoginSuccess();
        setTimeout(() => onClose(), 800);
      });
    }

    return () => {
      if (unsubscribeUpdated) unsubscribeUpdated();
    };
  }, [isOpen, isLoggedIn]);

  const loadDevices = async () => {
    const devList = await getSpotifyDevices();
    setDevices(devList);
  };

  const handleManualTokenSubmit = async () => {
    playClickSound();
    let cleaned = manualToken.trim().replace(/^Bearer\s+/i, '').replace(/["']/g, '');
    if (!cleaned) {
      setStatusMsg('Please paste your Spotify API token / key above');
      setIsError(true);
      return;
    }

    if (/^[a-f0-9]{32}$/i.test(cleaned)) {
      setStatusMsg(
        '⚠️ That looks like a 32-character Client ID. Please use 1-Click Connect above!'
      );
      setIsError(true);
      return;
    }

    setIsWaitingAuth(true);
    setStatusMsg('Verifying token with Spotify API...');
    setIsError(false);

    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${cleaned}` },
      });

      if (!res.ok) {
        setIsWaitingAuth(false);
        setIsError(true);
        setStatusMsg('⚠️ Token expired or invalid (401). Use 1-Click Connect above.');
        return;
      }

      const profile = await res.json();
      const name = (profile.display_name || profile.id || 'SPOTIFY USER').toUpperCase();
      setInMemoryTokenForTesting(cleaned, 3600);
      setIsWaitingAuth(false);
      setStatusMsg(`Connected as ${name}! (In-memory testing session)`);
      setIsError(false);
      onLoginSuccess();
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setIsWaitingAuth(false);
      setIsError(true);
      setStatusMsg(err.message || 'Network error verifying token');
    }
  };

  const handleStartOAuthLogin = async () => {
    playClickSound();
    setIsWaitingAuth(true);
    setStatusMsg('Opening Spotify in your browser... Click "Agree" to link!');
    try {
      const res = await authLogin();
      if (!res.success && res.error) {
        setIsError(true);
        setStatusMsg(res.error);
        setIsWaitingAuth(false);
      }
    } catch (e: any) {
      setIsError(true);
      setStatusMsg(e.message || 'OAuth failed');
      setIsWaitingAuth(false);
    }
  };

  const handleDisconnect = async () => {
    playClickSound();
    await clearSpotifyAuth();
    onLogout();
  };

  const handleTransfer = async (deviceId: string) => {
    playClickSound();
    await transferPlaybackSpotify(deviceId);
    await loadDevices();
  };

  const handleGoBack = () => {
    playClickSound();
    onClose();
  };

  const handleOpenSpotifyWeb = () => {
    playClickSound();
    window.open('https://open.spotify.com', '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-[640px] max-w-[95%] max-h-[385px] flex flex-col min-h-0 bg-[#8fa2d4] border-4 border-[#191244] shadow-pixel-lg overflow-hidden">
        {/* Fixed Header Bar */}
        <div className="bg-[#fec5db] border-b-4 border-[#191244] px-3 py-1.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff7b90] border-2 border-[#191244]" />
            <div className="w-3 h-3 rounded-full bg-[#ffd269] border-2 border-[#191244]" />
            <div className="w-3 h-3 rounded-full bg-[#9df0cf] border-2 border-[#191244]" />
            <span className="ml-1.5 font-pixel text-xs text-[#191244] tracking-wider font-bold">
              SPOTIFY.SETUP
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGoBack}
              className="px-2 py-0.5 bg-[#fffdf5] text-[#191244] border-2 border-[#191244] font-pixel text-[9px] hover:bg-[#ffe6f0] active:translate-y-0.5 cursor-pointer font-bold"
            >
              ← BACK TO PLAYER
            </button>
            <button
              onClick={handleGoBack}
              title="Close"
              className="w-5 h-5 flex items-center justify-center bg-[#fec5db] border-2 border-[#191244] text-xs font-bold hover:bg-[#ff7b90] cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 overflow-y-auto min-h-0 flex-1 space-y-3 text-[#191244] font-silkscreen text-xs">
          {isLoggedIn ? (
            /* Connected view */
            <div className="space-y-2.5">
              <div className="p-2.5 bg-[#191244] text-[#fec5db] border-2 border-[#191244] flex items-center justify-between shadow-pixel-sm">
                <div>
                  <div className="text-[9px] text-[#9df0cf] font-pixel">CONNECTED ACCOUNT</div>
                  <div className="font-pixel text-sm text-[#ffd269]">{userName}</div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-2.5 py-1 bg-[#ff7b90] text-[#191244] font-pixel text-[9px] border-2 border-[#191244] hover:bg-[#ff5270] cursor-pointer font-bold"
                >
                  DISCONNECT
                </button>
              </div>

              {/* Devices */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-pixel text-[9px] text-[#191244]">ACTIVE SPOTIFY DEVICES:</span>
                  <button
                    onClick={() => {
                      playClickSound();
                      loadDevices();
                    }}
                    className="underline text-[9px] font-pixel text-[#191244] hover:text-white cursor-pointer"
                  >
                    ↻ REFRESH DEVICES
                  </button>
                </div>

                <div className="bg-[#191244] border-2 border-[#191244] p-2 space-y-1 max-h-32 overflow-y-auto">
                  {devices.length === 0 ? (
                    <div className="text-[#8fa2d4] text-[11px] p-2 text-center space-y-1.5">
                      <div className="text-[#ffd269] font-pixel text-[10px]">
                        NO ACTIVE PLAYBACK DETECTED
                      </div>
                      <p className="text-[#ffe6f0] text-[10px] leading-relaxed">
                        Spotify requires your desktop app or web player to be open.
                        <br />
                        Open Spotify on your Mac and <strong>hit Play on any song</strong>!
                      </p>
                      <button
                        onClick={handleOpenSpotifyWeb}
                        className="mt-1 px-2.5 py-1 bg-[#9df0cf] text-[#191244] font-pixel text-[8px] border border-[#191244] hover:bg-white cursor-pointer font-bold"
                      >
                        🌐 OPEN SPOTIFY WEB PLAYER
                      </button>
                    </div>
                  ) : (
                    devices.map((device) => (
                      <div
                        key={device.id}
                        className={`p-1.5 border flex items-center justify-between ${
                          device.is_active
                            ? 'bg-[#2c2269] text-[#9df0cf] border-[#9df0cf]'
                            : 'bg-[#100b2e] text-[#ffe6f0] border-[#2c2269]'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[11px]">{device.name}</div>
                          <div className="text-[9px] text-[#b4c4ec]">
                            {device.type} {device.is_active ? '• [CURRENT PLAYING]' : ''}
                          </div>
                        </div>
                        {!device.is_active && (
                          <button
                            onClick={() => handleTransfer(device.id)}
                            className="px-2 py-0.5 bg-[#fec5db] text-[#191244] border border-[#191244] text-[8px] hover:bg-[#ffe6f0] font-pixel"
                          >
                            TRANSFER
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-1 flex justify-end items-center">
                <button
                  onClick={handleGoBack}
                  className="px-4 py-1.5 bg-[#fec5db] text-[#191244] font-pixel text-[10px] border-2 border-[#191244] shadow-pixel hover:bg-[#ffe6f0] cursor-pointer font-bold"
                >
                  DONE
                </button>
              </div>
            </div>
          ) : (
            /* Not logged in: 1-Click Connect (Hero) + Manual Token backup */
            <div className="space-y-2.5">
              {/* 1-Click Browser Login Hero Card */}
              <div className="p-3 bg-[#191244] text-[#fffdf5] border-2 border-[#191244] shadow-pixel-sm space-y-2 text-center">
                <div className="font-pixel text-[11px] text-[#9df0cf] tracking-wide font-bold">
                  ★ 1-CLICK SPOTIFY CONNECT ★
                </div>
                <button
                  onClick={handleStartOAuthLogin}
                  disabled={isWaitingAuth}
                  className="w-full py-2.5 px-3 bg-[#9df0cf] text-[#191244] font-pixel text-[11px] border-2 border-[#fffdf5] shadow-pixel hover:bg-[#b5f5db] active:translate-y-0.5 cursor-pointer font-bold tracking-wider"
                >
                  {isWaitingAuth ? 'WAITING FOR APPROVAL IN BROWSER...' : '⚡ CONNECT MY SPOTIFY'}
                </button>

                {/* Redirect URI helper for 1-time setup */}
                <div className="p-2 bg-[#120e29] border border-[#fec5db]/40 text-left space-y-1">
                  <div className="flex items-center justify-between text-[8px] text-[#ffd269] font-pixel">
                    <span>REDIRECT URI (ADD TO SPOTIFY DASHBOARD):</span>
                    <a
                      href="https://developer.spotify.com/dashboard/0e51fa9c7bfb4df7b72cfa5d72d87df0/settings"
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-[#9df0cf] hover:text-white"
                    >
                      Dashboard Settings ↗
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <code className="text-[9px] font-mono bg-black/60 px-1.5 py-0.5 text-[#fffdf5] flex-1 select-all">
                      http://127.0.0.1:8888/callback
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('http://127.0.0.1:8888/callback');
                        setCopiedRedirect(true);
                        setTimeout(() => setCopiedRedirect(false), 2000);
                      }}
                      className="px-2 py-0.5 bg-[#fec5db] text-[#191244] text-[8px] font-pixel border border-[#191244] hover:bg-white cursor-pointer"
                    >
                      {copiedRedirect ? '✓ COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {statusMsg && (
                <div
                  className={`p-2 border-2 text-[9px] font-pixel text-center leading-relaxed ${
                    isError
                      ? 'bg-[#ff7b90] text-[#191244] border-[#191244]'
                      : 'bg-[#191244] text-[#ffd269] border-[#191244]'
                  }`}
                >
                  {statusMsg}
                </div>
              )}

              {/* Manual Token Paste (compact backup) */}
              <div className="p-2.5 bg-[#fffdf5] border-2 border-[#191244] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-pixel text-[9px] text-[#191244] font-bold">
                    OR PASTE API TOKEN DIRECTLY:
                  </span>
                  <a
                    href="https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[8px] underline font-pixel text-[#191244] hover:text-[#ff7b90]"
                  >
                    Token Page ↗
                  </a>
                </div>
                <p className="text-[8px] text-[#ff5270] leading-tight">
                  ⚠️ Note: Pasted developer tokens expire after 1 hour. Use 1-Click Connect above to stay connected.
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste token (starts with BQ...)"
                    className="flex-1 px-2 py-1 bg-white border border-[#191244] text-[9px] font-mono focus:outline-none"
                  />
                  <button
                    onClick={handleManualTokenSubmit}
                    disabled={isWaitingAuth}
                    className="px-2.5 py-1 bg-[#fec5db] text-[#191244] font-pixel text-[9px] border border-[#191244] hover:bg-[#ffe6f0] cursor-pointer font-bold"
                  >
                    SUBMIT
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
