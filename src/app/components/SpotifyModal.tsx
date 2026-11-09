import React, { useState, useEffect } from 'react';
import {
  login as authLogin,
  getSpotifyDevices,
  transferPlaybackSpotify,
  setInMemoryTokenForTesting,
  getSpotifyRedirectUri,
  openSpotifyApp,
  setStoredUserName,
  playTrack,
  addTrackToQueue,
  playPlaylist,
} from '../services/spotify';
import { SpotifyDevice } from '../../types/spotify';
import { parseSpotifyLink } from '../services/spotifyLinks';
import { playClickSound } from '../../shared/services/soundEffects';

interface SpotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  userName: string;
  authError: string;
  authForbidden: boolean;
  onRetryAuth: () => void;
  onLoginSuccess: () => void;
  onLogout: () => Promise<void>;
  onPlaybackStarted: () => Promise<void>;
}

export const SpotifyModal: React.FC<SpotifyModalProps> = ({
  isOpen,
  onClose,
  isLoggedIn,
  userName,
  authError,
  authForbidden,
  onRetryAuth,
  onLoginSuccess,
  onLogout,
  onPlaybackStarted,
}) => {
  const [manualToken, setManualToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [isWaitingAuth, setIsWaitingAuth] = useState(false);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkStatus, setLinkStatus] = useState('');
  const [linkPending, setLinkPending] = useState(false);
  const spotifyLink = parseSpotifyLink(linkInput);
  const [copiedRedirect, setCopiedRedirect] = useState(false);


  useEffect(() => {
    if (!isOpen) return;

    if (isLoggedIn) {
      setIsWaitingAuth(false);
      loadDevices();
    }
  }, [isOpen, isLoggedIn]);

  useEffect(() => {
    if (authError) {
      setIsWaitingAuth(false);
      setStatusMsg('');
    }
  }, [authError]);

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
      setManualToken('');
      setStoredUserName(name);
      setIsWaitingAuth(false);
      setStatusMsg(`Connected as ${name}! (In-memory testing session)`);
      setIsError(false);
      onLoginSuccess();
      onClose();
    } catch (err: any) {
      setIsWaitingAuth(false);
      setIsError(true);
      setStatusMsg(err.message || 'Network error verifying token');
    }
  };

  const handleStartOAuthLogin = async () => {
    playClickSound();
    onRetryAuth();
    setIsWaitingAuth(true);
    setIsError(false);
    setStatusMsg('Waiting for Spotify authorization in your browser.');
    try {
      const res = await authLogin(clientId.trim() || undefined);
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
    setStatusMsg('');
    await onLogout();
  };

  const handleTransfer = async (deviceId: string) => {
    playClickSound();
    const transferred = await transferPlaybackSpotify(deviceId, false);
    setStatusMsg(transferred ? 'Playback device changed.' : 'Could not transfer playback to this device.');
    setIsError(!transferred);
    await loadDevices();
  };

  const handleGoBack = () => {
    playClickSound();
    onClose();
  };

  const handleOpenSpotify = async () => {
    playClickSound();
    const opened = await openSpotifyApp();
    setIsError(opened === 'unavailable');
    setStatusMsg(opened === 'unavailable'
      ? 'Could not open Spotify. Open it from Applications or use the web player.'
      : 'Spotify opened. Start a song there, then refresh devices in PixelTunes.');
    if (isLoggedIn) await loadDevices();
  };

  const handleSpotifyLink = async (addToQueue = false) => {
    if (!spotifyLink || linkPending || !isLoggedIn) return;
    setLinkPending(true);
    setLinkStatus('Contacting Spotify…');
    const success = addToQueue ? await addTrackToQueue(spotifyLink.uri)
      : await (spotifyLink.type === 'track' ? playTrack(spotifyLink.uri) : playPlaylist(spotifyLink.uri));
    setLinkPending(false);
    setLinkStatus(success
      ? (addToQueue ? 'Added to your Spotify queue.' : 'Playback started on your Spotify device.')
      : 'Spotify could not complete this action. Check your Premium account and active device.');
    if (success && !addToQueue) await onPlaybackStarted();
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs select-none app-no-drag"
      style={{ WebkitAppRegion: 'no-drag' as any }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleGoBack();
        }
      }}
    >
      <div
        className="w-[640px] max-w-[95%] max-h-[385px] flex flex-col min-h-0 bg-[#8fa2d4] border-4 border-[#191244] shadow-pixel-lg overflow-hidden app-no-drag"
        style={{ WebkitAppRegion: 'no-drag' as any }}
      >
        {/* Fixed Header Bar */}
        <div
          className="bg-[#fec5db] border-b-4 border-[#191244] px-3 py-1.5 flex items-center justify-between shrink-0 app-no-drag"
          style={{ WebkitAppRegion: 'no-drag' as any }}
        >
          <div className="flex items-center gap-1.5 app-no-drag">
            <span className="font-pixel text-xs text-[#191244] tracking-wider font-bold">
              SPOTIFY.SETUP
            </span>
          </div>

          <div className="flex items-center gap-2 app-no-drag">
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleGoBack();
              }}
              className="px-2 py-0.5 bg-[#fffdf5] text-[#191244] border-2 border-[#191244] font-pixel text-[9px] hover:bg-[#ffe6f0] active:translate-y-0.5 cursor-pointer font-bold app-no-drag"
              style={{ WebkitAppRegion: 'no-drag' as any }}
            >
              ← BACK TO PLAYER
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleGoBack();
              }}
              title="Close"
              className="w-6 h-6 flex items-center justify-center bg-[#fec5db] border-2 border-[#191244] text-xs font-bold hover:bg-[#ff7b90] active:translate-y-0.5 transition-colors cursor-pointer app-no-drag"
              style={{ WebkitAppRegion: 'no-drag' as any }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div
          className="p-3.5 overflow-y-auto min-h-0 flex-1 space-y-3 text-[#191244] font-silkscreen text-xs app-no-drag"
          style={{ WebkitAppRegion: 'no-drag' as any }}
        >
          <form onSubmit={(event) => { event.preventDefault(); void handleSpotifyLink(); }} className="bg-[#fffdf5] text-[#191244] border-2 border-[#191244] p-2 space-y-1.5 mb-2.5">
            <label htmlFor="spotify-link" className="block font-pixel text-[10px] font-bold">SPOTIFY LINK OR URI</label>
            <input id="spotify-link" value={linkInput} placeholder="https://open.spotify.com/track/…"
              autoComplete="off" spellCheck={false} maxLength={2048} disabled={linkPending}
              aria-describedby="spotify-link-help"
              onChange={(event) => { setLinkInput(event.target.value); setLinkStatus(''); }}
              className="w-full px-2 py-1 border border-[#191244] text-[10px] font-mono" />
            <p id="spotify-link-help" className="font-silkscreen text-[8px]">
              {linkInput.trim() && !spotifyLink ? 'Enter an open.spotify.com track, album, or playlist link, or a Spotify URI.'
                : 'Paste a Spotify track, album, or playlist. Connect Spotify to play it on your device.'}
            </p>
            <div className="flex gap-2">
              {isLoggedIn && <button type="submit" disabled={!spotifyLink || linkPending}
                className="px-2 py-1 bg-[#9df0cf] border border-[#191244] font-pixel text-[8px]">PLAY LINK</button>}
              {isLoggedIn && spotifyLink?.type === 'track' && (
                <button type="button" disabled={linkPending} onClick={() => { void handleSpotifyLink(true); }}
                  className="px-2 py-1 bg-[#ffd269] border border-[#191244] font-pixel text-[8px]">ADD TO QUEUE</button>
              )}
              {spotifyLink && <a href={spotifyLink.url} target="_blank" rel="noopener noreferrer"
                className="px-2 py-1 bg-[#fec5db] border border-[#191244] font-pixel text-[8px]">OPEN IN SPOTIFY ↗</a>}
            </div>
            {linkStatus && <p role="status" className="font-pixel text-[8px]">{linkStatus}</p>}
          </form>

          <button type="button" onClick={handleOpenSpotify}
            className="px-2 py-1 bg-[#9df0cf] border border-[#191244] font-pixel text-[8px]">
            Open Spotify
          </button>

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

              {statusMsg && <p role="status" className="text-xs text-[#191244]">{statusMsg}</p>}

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
                        {!device.is_active && !device.is_restricted && device.id && (
                          <button
                            onClick={() => { if (device.id) void handleTransfer(device.id); }}
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
                {window.electronAPI?.isElectron && (
                  <details open={authForbidden || undefined} className="text-left border border-[#fec5db]/40 p-2 space-y-1.5">
                    <summary className="cursor-pointer text-[#9df0cf] font-pixel text-[8px]">
                      Use your own Spotify Client ID
                    </summary>
                    <label htmlFor="spotify-client-id" className="block font-silkscreen text-[9px]">Spotify Client ID</label>
                    <input id="spotify-client-id" value={clientId} onChange={(event) => setClientId(event.target.value)}
                      autoComplete="off" spellCheck={false} placeholder="32 characters from your Developer Dashboard"
                      maxLength={64} className="w-full px-2 py-1 text-[#191244] bg-white border border-[#fec5db] font-mono text-[10px]" />
                    <p className="font-silkscreen text-[8px] leading-relaxed">
                      Add the redirect URI below to your Spotify app and sign in with an account that has access.
                    </p>
                  </details>
                )}
                <button
                  onClick={handleStartOAuthLogin}
                  className="w-full py-2.5 px-3 bg-[#9df0cf] text-[#191244] font-pixel text-[11px] border-2 border-[#fffdf5] shadow-pixel hover:bg-[#b5f5db] active:translate-y-0.5 cursor-pointer font-bold tracking-wider"
                >
                  {isWaitingAuth ? 'REOPEN SPOTIFY AUTHORIZATION' : '⚡ CONNECT MY SPOTIFY'}
                </button>

                {/* Redirect URI helper for 1-time setup */}
                <div className="p-2 bg-[#120e29] border border-[#fec5db]/40 text-left space-y-1">
                  <div className="flex items-center justify-between text-[8px] text-[#ffd269] font-pixel">
                    <span>REDIRECT URI (ADD TO SPOTIFY DASHBOARD):</span>
                    <a
                      href="https://developer.spotify.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-[#9df0cf] hover:text-white"
                    >
                      Dashboard Settings ↗
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <code className="text-[9px] font-mono bg-black/60 px-1.5 py-0.5 text-[#fffdf5] flex-1 select-all">
                      {getSpotifyRedirectUri()}
                    </code>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(getSpotifyRedirectUri());
                          setCopiedRedirect(true);
                        } catch {
                          setStatusMsg('Select and copy the redirect URI above.');
                        }
                      }}
                      className="px-2 py-0.5 bg-[#fec5db] text-[#191244] text-[8px] font-pixel border border-[#191244] hover:bg-white cursor-pointer"
                    >
                      {copiedRedirect ? '✓ COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {(authError || statusMsg) && (
                <div role="status"
                  className={`p-2 border-2 text-[9px] font-pixel text-center leading-relaxed ${
                    authError || isError
                      ? 'bg-[#ff7b90] text-[#191244] border-[#191244]'
                      : 'bg-[#191244] text-[#ffd269] border-[#191244]'
                  }`}
                >
                  {authError || statusMsg}
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
                    type="password"
                    aria-label="Spotify API token"
                    autoComplete="off"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste token (starts with BQ...)"
                    className="flex-1 px-2 py-1 bg-white border border-[#191244] text-[9px] font-mono focus:outline-none"
                  />
                  <button
                    onClick={handleManualTokenSubmit}
                    disabled={!manualToken.trim()}
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
