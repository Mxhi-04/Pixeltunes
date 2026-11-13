import React, { useState, useEffect } from 'react';
import { RetroCapsuleWidget } from './RetroCapsuleWidget';

export interface SharedPlaybackState {
  title: string;
  artist: string;
  album: string;
  artworkUrl?: string;
  durationMs: number;
  progressMs: number;
  isPlaying: boolean;
  volumePercent: number;
  shuffleState: boolean;
  repeatState: 'off' | 'track' | 'context';
  isSpotifyConnected: boolean;
}

export function MenuBarCapsuleView() {
  const [state, setState] = useState<SharedPlaybackState>({
    title: 'PixelTunes',
    artist: 'Ready to Play',
    album: 'Lo-Fi Chill',
    artworkUrl: '',
    durationMs: 184000,
    progressMs: 0,
    isPlaying: false,
    volumePercent: 80,
    shuffleState: false,
    repeatState: 'off',
    isSpotifyConnected: false,
  });

  // Synchronize state via Electron IPC bridge from main player window
  useEffect(() => {
    const unsub = window.electronAPI?.onPlaybackStateSync?.((freshState) => {
      if (freshState) {
        setState((prev) => ({
          ...prev,
          ...freshState,
          volumePercent: typeof freshState.volumePercent === 'number' ? freshState.volumePercent : prev.volumePercent,
        }));
      }
    });

    return () => {
      unsub?.();
    };
  }, []);

  const handleTogglePlay = () => {
    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    window.electronAPI?.sendPlaybackAction?.('toggle');
  };

  const handleNext = () => {
    window.electronAPI?.sendPlaybackAction?.('next');
  };

  const handlePrevious = () => {
    window.electronAPI?.sendPlaybackAction?.('previous');
  };

  const handleSeek = (positionMs: number) => {
    setState((prev) => ({ ...prev, progressMs: positionMs }));
    window.electronAPI?.sendPlaybackAction?.('seek', { positionMs });
  };

  const handleVolumeChange = (volumePercent: number) => {
    setState((prev) => ({ ...prev, volumePercent }));
    window.electronAPI?.sendPlaybackAction?.('volume', { volumePercent });
  };

  const handleExpand = () => {
    window.electronAPI?.showPlayer?.();
  };

  const handleClose = () => {
    window.electronAPI?.hidePopover?.();
  };

  const handleOpenSettings = () => {
    window.electronAPI?.sendPlaybackAction?.('open-settings');
    window.electronAPI?.showPlayer?.();
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center bg-transparent select-none p-1 overflow-hidden"
      style={{
        width: '400px',
        height: '106px',
        fontFamily: '"Press Start 2P", monospace',
        WebkitAppRegion: 'no-drag' as any,
      }}
    >
      <RetroCapsuleWidget
        isPlaying={state.isPlaying}
        onTogglePlay={handleTogglePlay}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onOpenSettings={handleOpenSettings}
        progressMs={state.progressMs}
        durationMs={state.durationMs}
        seekTo={handleSeek}
        volume={state.volumePercent}
        onVolumeChange={handleVolumeChange}
        currentTitle={state.title}
        currentArtist={state.artist}
        onCloseWindow={handleClose}
        closeLabel="Hide Menu Bar Popover"
        onExpand={handleExpand}
      />
    </div>
  );
}

export default MenuBarCapsuleView;

