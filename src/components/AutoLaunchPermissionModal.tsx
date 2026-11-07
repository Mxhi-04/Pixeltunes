import React from 'react';
import { playClickSound } from '../services/soundEffects';
import { setAutoLaunchPermission, launchSpotifyInBackground } from '../services/spotifyAutoLaunch';

interface AutoLaunchPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccepted?: () => void;
}

export const AutoLaunchPermissionModal: React.FC<AutoLaunchPermissionModalProps> = ({
  isOpen,
  onClose,
  onAccepted,
}) => {
  if (!isOpen) return null;

  const handleAccept = async () => {
    playClickSound();
    setAutoLaunchPermission('allowed');
    await launchSpotifyInBackground().catch(() => {});
    onClose();
    if (onAccepted) onAccepted();
  };

  const handleDecline = () => {
    playClickSound();
    setAutoLaunchPermission('denied');
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs select-none app-no-drag"
      style={{ WebkitAppRegion: 'no-drag' as any }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleDecline();
        }
      }}
    >
      <div
        className="w-[460px] max-w-[95%] flex flex-col bg-[#8fa2d4] border-4 border-[#191244] shadow-pixel-lg overflow-hidden app-no-drag"
        style={{ WebkitAppRegion: 'no-drag' as any }}
      >
        {/* Title Bar */}
        <div
          className="bg-[#fec5db] border-b-4 border-[#191244] px-3 py-1.5 flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff7b90] border border-[#191244]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffd269] border border-[#191244]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#9df0cf] border border-[#191244]" />
            <span className="font-pixel text-[11px] text-[#191244] tracking-wider font-bold ml-1">
              SPOTIFY.DAEMON
            </span>
          </div>
          <button
            type="button"
            onClick={handleDecline}
            className="w-5 h-5 flex items-center justify-center border-2 border-[#191244] bg-[#fffdf5] text-[#191244] font-pixel text-xs hover:bg-[#ff7b90] hover:text-white cursor-pointer active:translate-y-0.5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 bg-[#fffdf5] text-[#191244] font-pixel space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 bg-[#fec5db] border-2 border-[#191244] flex items-center justify-center text-lg shadow-pixel-xs">
              ⚡
            </div>
            <div className="space-y-1">
              <h3 className="text-[12px] font-bold text-[#191244] tracking-wide">
                AUTO-LAUNCH SPOTIFY APP?
              </h3>
              <p className="text-[9px] leading-relaxed text-[#191244]/80">
                To play music smoothly without glitches, Spotify desktop app needs to run in the background.
              </p>
            </div>
          </div>

          <div className="p-2.5 bg-[#8fa2d4]/20 border-2 border-[#191244] text-[8.5px] leading-relaxed text-[#191244] space-y-1">
            <p className="font-bold text-[#191244]">
              ✨ PIXELTUNES WILL:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[#191244]/90 pl-1">
              <li>Launch Spotify automatically when connected</li>
              <li>Keep Spotify minimized/hidden in the background</li>
              <li>Prevent playback errors when Spotify was previously closed</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="flex-1 py-2 px-3 bg-[#191244] text-[#9df0cf] border-2 border-[#191244] font-pixel text-[10px] font-bold tracking-wider hover:bg-[#2b1f66] active:translate-y-0.5 transition-all shadow-pixel-sm cursor-pointer text-center"
            >
              ✓ YES, AUTO-LAUNCH
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="py-2 px-3 bg-[#fffdf5] text-[#191244] border-2 border-[#191244] font-pixel text-[9px] font-bold tracking-wider hover:bg-[#ffe6f0] active:translate-y-0.5 transition-all shadow-pixel-sm cursor-pointer text-center"
            >
              NOT NOW
            </button>
          </div>

          <p className="text-center text-[7.5px] text-[#191244]/60">
            * You can enable or disable this anytime in Menu &gt; Settings.
          </p>
        </div>
      </div>
    </div>
  );
};
