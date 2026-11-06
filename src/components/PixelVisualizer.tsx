import React, { useEffect, useRef } from 'react';
import { lofiEngine } from '../services/lofiAudio';

interface PixelVisualizerProps {
  isPlaying: boolean;
  isSpotifyActive: boolean;
  barCount?: number;
}

export const PixelVisualizer: React.FC<PixelVisualizerProps> = ({
  isPlaying,
  isSpotifyActive,
  barCount = 16,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dummyFreqs = new Array(barCount).fill(0);
    const analyser = !isSpotifyActive ? lofiEngine.getAnalyser() : null;
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const blockHeight = 4;
      const blockWidth = Math.floor(canvas.width / barCount) - 2;
      const maxBlocks = Math.floor(canvas.height / (blockHeight + 1));

      for (let i = 0; i < barCount; i++) {
        let value = 0;

        if (isPlaying) {
          if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray);
            const index = Math.min(dataArray.length - 1, Math.floor(i * 1.5));
            value = dataArray[index] / 255;
          } else {
            // Simulated rhythmic pulse for Spotify playback
            const t = Date.now() / 200;
            const target = 0.3 + 0.5 * Math.abs(Math.sin(t * (1 + (i % 3) * 0.4) + i));
            dummyFreqs[i] += (target - dummyFreqs[i]) * 0.25;
            value = dummyFreqs[i];
          }
        } else {
          // Slowly decay to 0
          dummyFreqs[i] *= 0.85;
          value = dummyFreqs[i];
        }

        const activeBlocks = Math.floor(value * maxBlocks);

        for (let b = 0; b < maxBlocks; b++) {
          const x = i * (blockWidth + 2);
          const y = canvas.height - (b + 1) * (blockHeight + 1);

          if (b < activeBlocks) {
            // Block colors: lowest blocks navy/blue, middle pink, top white/gold
            if (b > maxBlocks * 0.75) {
              ctx.fillStyle = '#ffe6f0'; // top peak
            } else if (b > maxBlocks * 0.4) {
              ctx.fillStyle = '#fec5db'; // mid pink
            } else {
              ctx.fillStyle = '#191244'; // deep navy
            }
          } else {
            // Unlit faint pixel dot for retro LED display grid look
            ctx.fillStyle = 'rgba(25, 18, 68, 0.15)';
          }

          ctx.fillRect(x, y, blockWidth, blockHeight);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, isSpotifyActive, barCount]);

  return (
    <div className="w-full h-7 flex items-center justify-center select-none">
      <canvas
        ref={canvasRef}
        width={180}
        height={24}
        className="w-full h-full pixelated"
      />
    </div>
  );
};

