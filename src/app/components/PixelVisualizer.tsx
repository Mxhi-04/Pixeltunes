import React, { useEffect, useRef } from 'react';
import { lofiEngine } from '../../shared/services/lofiAudio';

interface PixelVisualizerProps {
  isPlaying: boolean;
  reducedMotion: boolean;
  barCount?: number;
}

export const PixelVisualizer: React.FC<PixelVisualizerProps> = ({
  isPlaying,
  reducedMotion,
  barCount = 16,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const barLevelsRef = useRef<Float32Array>(new Float32Array(barCount));

  useEffect(() => {
    // Reset bar array when barCount changes
    if (barLevelsRef.current.length !== barCount) {
      barLevelsRef.current = new Float32Array(barCount);
    }
  }, [barCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = isPlaying ? lofiEngine.getAnalyser() : null;
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const levels = barLevelsRef.current;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const blockHeight = 4;
      const blockWidth = Math.floor(canvas.width / barCount) - 2;
      const maxBlocks = Math.floor(canvas.height / (blockHeight + 1));

      const isLofiActive = lofiEngine.getIsPlaying();
      if (analyser && dataArray && isLofiActive && !reducedMotion) {
        analyser.getByteFrequencyData(dataArray);
      }

      const now = performance.now();
      // 124 BPM rhythm timing (~484ms per beat)
      const bpm = 124;
      const beatDuration = 60000 / bpm;
      const measureDuration = beatDuration * 4;

      const beatPhase = (now % beatDuration) / beatDuration; // 0..1 in current beat
      const beatNum = Math.floor((now % measureDuration) / beatDuration); // 0, 1, 2, 3 in measure
      const halfBeatPhase = (now % (beatDuration / 2)) / (beatDuration / 2); // 8th note
      const quarterBeatPhase = (now % (beatDuration / 4)) / (beatDuration / 4); // 16th note

      // Punchy kick on beats 1 & 3, with exponential decay
      const isKickBeat = beatNum === 0 || beatNum === 2;
      const kickEnvelope = isKickBeat
        ? Math.pow(1 - beatPhase, 2.8)
        : Math.pow(1 - beatPhase, 3.5) * 0.35;

      // Crisp snare snap on beats 2 & 4
      const isSnareBeat = beatNum === 1 || beatNum === 3;
      const snareEnvelope = isSnareBeat
        ? Math.pow(1 - beatPhase, 3.0)
        : 0.15;

      // Shimmering hi-hat chatter on 8th & 16th notes
      const hatEnvelope = Math.pow(1 - halfBeatPhase, 3.8) * 0.7 + Math.pow(1 - quarterBeatPhase, 4.5) * 0.35;

      for (let i = 0; i < barCount; i++) {
        if (isPlaying && !reducedMotion) {
          if (analyser && dataArray && isLofiActive) {
            const index = Math.min(dataArray.length - 1, Math.floor(i * (dataArray.length / barCount) * 0.6));
            const raw = dataArray[index] / 255;
            if (raw > levels[i]) {
              levels[i] = raw;
            } else {
              levels[i] = Math.max(0, levels[i] * 0.88 - 0.02);
            }
          } else {
            // Simulated rhythmic beat-driven bounce per frequency column
            const barNoise = Math.sin(now * 0.01 + i * 2.7) * 0.12 + Math.cos(now * 0.016 + i * 1.9) * 0.1;
            let target = 0;

            if (i < Math.floor(barCount * 0.3)) {
              // Bass columns (0-5): punch up and down on the kick drum beat
              target = kickEnvelope * 0.88 + barNoise + 0.08;
            } else if (i < Math.floor(barCount * 0.68)) {
              // Mid columns (6-12): snap up and down on the snare & melody beat
              target = snareEnvelope * 0.78 + kickEnvelope * 0.28 + barNoise + 0.1;
            } else {
              // Treble columns (13-17): bounce rapidly on hi-hat & percussion ticks
              target = hatEnvelope * 0.72 + snareEnvelope * 0.25 + barNoise + 0.08;
            }

            target = Math.max(0, Math.min(1, target));

            // Instant upward snap on beat, smooth gravity fall
            if (target > levels[i]) {
              levels[i] = target;
            } else {
              levels[i] = Math.max(0, levels[i] * 0.87 - 0.015);
            }
          }
        } else {
          // When paused or reduced motion, quickly snap bars down to zero
          levels[i] = Math.max(0, levels[i] * 0.58 - 0.06);
        }

        const activeBlocks = Math.floor(levels[i] * (maxBlocks + 0.2));

        for (let b = 0; b < maxBlocks; b++) {
          const x = i * (blockWidth + 2);
          const y = canvas.height - (b + 1) * (blockHeight + 1);

          if (b < activeBlocks) {
            // Block colors: lowest blocks navy/blue, middle pink, top white/gold
            if (b >= maxBlocks - 1) {
              ctx.fillStyle = '#ffe6f0'; // top peak
            } else if (b >= maxBlocks * 0.5) {
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

      let hasActiveLevel = false;
      for (let i = 0; i < barCount; i++) {
        if (levels[i] > 0.01) {
          hasActiveLevel = true;
          break;
        }
      }

      if ((isPlaying || hasActiveLevel) && !reducedMotion) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, reducedMotion, barCount]);

  return (
    <div className="w-full h-7 flex items-center justify-center select-none">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        width={180}
        height={24}
        className="w-full h-full pixelated"
      />
    </div>
  );
};

