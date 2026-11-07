import React, { useEffect, useRef, useState, useMemo } from 'react';
import { getPixelCoverForTrack, PixelCover } from '../types/covers';

interface PixelCanvasProps {
  isPlaying: boolean;
  albumArtUrl?: string | null;
  mode: 'pixelCovers' | 'pixelArt' | 'cassette' | 'saturn' | 'inspo';
  pixelResolution?: number;
  trackTitle?: string;
  artistName?: string;
  themeColors?: {
    navy: string;
    pink: string;
    periwinkle: string;
    cream: string;
  };
}

// 1. Saturn Galaxy Stars Definition
const SATURN_STARS = [
  { x: 16, y: 28, baseColor: '#ffffff', peakColor: '#ffffff', speed: 0.08, offset: 0, size: 3 },
  { x: 100, y: 26, baseColor: '#ffbde2', peakColor: '#ffffff', speed: 0.07, offset: 1.2, size: 3 },
  { x: 225, y: 36, baseColor: '#e0f7ff', peakColor: '#ffffff', speed: 0.06, offset: 2.1, size: 3 },
  { x: 24, y: 73, baseColor: '#c2f0ff', peakColor: '#ffffff', speed: 0.09, offset: 0.8, size: 3 },
  { x: 132, y: 92, baseColor: '#ffffff', peakColor: '#ffffff', speed: 0.11, offset: 3.0, size: 2, isGlint: true },
  { x: 24, y: 140, baseColor: '#ff9ee2', peakColor: '#ffffff', speed: 0.08, offset: 1.7, size: 3 },
  { x: 208, y: 133, baseColor: '#ff80d5', peakColor: '#ffffff', speed: 0.07, offset: 2.7, size: 3 },
  { x: 12, y: 183, baseColor: '#7ae5ff', peakColor: '#ffffff', speed: 0.06, offset: 0.4, size: 3 },
  { x: 171, y: 195, baseColor: '#8ce8ff', peakColor: '#ffffff', speed: 0.08, offset: 3.4, size: 3 },
  { x: 234, y: 224, baseColor: '#8ce8ff', peakColor: '#ffffff', speed: 0.10, offset: 1.5, size: 3 },
  // Subtle ambient micro-stars in the cosmic sky
  { x: 42, y: 18, baseColor: '#ffffff', peakColor: '#ffffff', speed: 0.12, offset: 2.2, size: 1 },
  { x: 178, y: 20, baseColor: '#ffc8e8', peakColor: '#ffffff', speed: 0.09, offset: 0.5, size: 1 },
  { x: 14, y: 110, baseColor: '#aeeaff', peakColor: '#ffffff', speed: 0.10, offset: 3.1, size: 1 },
  { x: 228, y: 88, baseColor: '#ffffff', peakColor: '#ffffff', speed: 0.07, offset: 1.9, size: 1 },
  { x: 80, y: 220, baseColor: '#8ce8ff', peakColor: '#ffffff', speed: 0.08, offset: 2.8, size: 1 },
];

// 2. Moon Bunny Stars Definition
const BUNNY_STARS = [
  { x: 12, y: 15, type: 'dot', color: 'white', speed: 0.05, offset: 0 },
  { x: 26, y: 11, type: 'cross', color: 'white', speed: 0.04, offset: 1 },
  { x: 18, y: 35, type: 'dot', color: 'pink', speed: 0.06, offset: 2 },
  { x: 10, y: 65, type: 'cross', color: 'pink', speed: 0.03, offset: 3 },
  { x: 22, y: 92, type: 'cross', color: 'white', speed: 0.05, offset: 4 },
  { x: 15, y: 120, type: 'cross', color: 'white', speed: 0.04, offset: 0.5 },
  { x: 24, y: 145, type: 'dot', color: 'pink', speed: 0.07, offset: 1.5 },
  { x: 62, y: 10, type: 'cross', color: 'white', speed: 0.05, offset: 2.2 },
  { x: 74, y: 16, type: 'cross', color: 'pink', speed: 0.04, offset: 3.1 },
  { x: 105, y: 12, type: 'cross', color: 'white', speed: 0.03, offset: 1.8 },
  { x: 118, y: 22, type: 'cross', color: 'pink', speed: 0.06, offset: 0.8 },
  { x: 124, y: 80, type: 'cross', color: 'white', speed: 0.05, offset: 2.5 },
  { x: 120, y: 115, type: 'cross', color: 'pink', speed: 0.04, offset: 3.5 },
  { x: 126, y: 140, type: 'dot', color: 'white', speed: 0.06, offset: 1.2 },
  { x: 108, y: 158, type: 'cross', color: 'pink', speed: 0.05, offset: 2.7 },
  { x: 42, y: 160, type: 'dot', color: 'pink', speed: 0.04, offset: 0.9 },
  { x: 92, y: 170, type: 'cross', color: 'white', speed: 0.03, offset: 1.7 },
  { x: 116, y: 46, type: 'dot', color: 'white', speed: 0.07, offset: 3.3 },
];

export const PixelCanvas: React.FC<PixelCanvasProps> = ({
  isPlaying,
  albumArtUrl,
  mode,
  pixelResolution = 180,
  trackTitle = 'FLY ME TO THE MOON',
  artistName = 'PIXEL JAZZ TRIO',
  themeColors = {
    navy: '#191244',
    pink: '#fec5db',
    periwinkle: '#8fa2d4',
    cream: '#fffdf5',
  },
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Cached image for Spotify Album Art (pixelArt mode)
  const cachedCoverImageRef = useRef<HTMLImageElement | null>(null);
  const [hasCoverLoaded, setHasCoverLoaded] = useState(false);
  const previousTempFileRef = useRef<string | null>(null);
  const currentTrackKeyRef = useRef<string>('');

  // Preloaded Saturn image ref for the new animated Saturn Galaxy cover
  const saturnImgRef = useRef<HTMLImageElement | null>(null);

  // Pixel Covers Mode active check
  const isPixelCoversMode = mode === 'pixelCovers' || mode === 'inspo' || mode === 'saturn';

  // Manual shuffle offset (allows user to click the cover to cycle through saved covers)
  const [manualShuffleOffset, setManualShuffleOffset] = useState<number>(0);
  const prevTrackKeyRef = useRef<string>('');

  // Whenever trackTitle or artistName changes (every song change), reset manual shuffle offset
  useEffect(() => {
    const key = `${trackTitle || ''}__${artistName || ''}`;
    if (key !== prevTrackKeyRef.current) {
      prevTrackKeyRef.current = key;
      setManualShuffleOffset(0);
    }
  }, [trackTitle, artistName]);

  // Pick active Pixel Cover for this track (automatically rotates/shuffles with every song change!)
  const activePixelCover: PixelCover = useMemo(() => {
    return getPixelCoverForTrack(trackTitle, artistName, manualShuffleOffset);
  }, [trackTitle, artistName, manualShuffleOffset]);

  const handleShuffleCover = () => {
    if (isPixelCoversMode) {
      setManualShuffleOffset((prev) => prev + 1);
    }
  };

  // Preload the Saturn base cover image
  useEffect(() => {
    const img = new Image();
    img.src = './covers/00_saturn_galaxy.png';
    img.onload = () => {
      saturnImgRef.current = img;
    };
    img.onerror = () => {
      // Fallback relative root if needed
      img.src = '/covers/00_saturn_galaxy.png';
    };
  }, []);

  const pixelSize = pixelResolution || 180;
  const trackKey = `${trackTitle}__${artistName}__${albumArtUrl || 'procedural'}__${pixelSize}`;

  // Process Spotify Album Artwork (used in mode === 'pixelArt')
  useEffect(() => {
    if (mode !== 'pixelArt') return;
    if (currentTrackKeyRef.current === trackKey && cachedCoverImageRef.current) {
      return;
    }
    currentTrackKeyRef.current = trackKey;

    let isCancelled = false;

    const deleteOldCover = async () => {
      if (previousTempFileRef.current && window.electronAPI?.deleteTempCover) {
        const fileToDelete = previousTempFileRef.current;
        previousTempFileRef.current = null;
        try {
          await window.electronAPI.deleteTempCover(fileToDelete);
        } catch (e) {
          console.warn('Could not delete old cover file:', e);
        }
      }
    };

    const generateAndDisplayCover = async () => {
      await deleteOldCover();
      if (isCancelled) return;

      const offscreen = document.createElement('canvas');
      offscreen.width = pixelSize;
      offscreen.height = pixelSize;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;

      if (albumArtUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = albumArtUrl;

        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });

        if (isCancelled) return;
        ctx.drawImage(img, 0, 0, pixelSize, pixelSize);
      } else {
        // Fallback procedural retro cover when no Spotify album art
        drawSynthwaveLandscape(ctx, pixelSize, pixelSize, trackTitle + artistName);
      }

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 240;
      exportCanvas.height = 240;
      const exportCtx = exportCanvas.getContext('2d');
      if (!exportCtx) return;

      exportCtx.imageSmoothingEnabled = false;
      exportCtx.drawImage(offscreen, 0, 0, 240, 240);

      const dataUrl = exportCanvas.toDataURL('image/png');

      if (window.electronAPI?.saveTempCover) {
        try {
          const savedPath = await window.electronAPI.saveTempCover(dataUrl, trackKey);
          previousTempFileRef.current = savedPath;
        } catch (saveErr) {
          console.warn('Could not write temporary pixel cover file:', saveErr);
        }
      }

      const displayImg = new Image();
      displayImg.src = dataUrl;
      displayImg.onload = () => {
        if (!isCancelled) {
          cachedCoverImageRef.current = displayImg;
          setHasCoverLoaded(true);
        }
      };
    };

    generateAndDisplayCover();

    return () => {
      isCancelled = true;
    };
  }, [trackKey, albumArtUrl, trackTitle, artistName, pixelSize, mode]);

  // Clean up disk covers on unmount
  useEffect(() => {
    return () => {
      if (previousTempFileRef.current && window.electronAPI?.deleteTempCover) {
        window.electronAPI.deleteTempCover(previousTempFileRef.current);
        previousTempFileRef.current = null;
      }
    };
  }, []);

  // 60FPS Canvas Drawing & Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const drawCanvas = () => {
      frame++;
      ctx.imageSmoothingEnabled = false;
      const w = canvas.width;
      const h = canvas.height;

      // 1. CASSETTE TAPE MODE
      if (mode === 'cassette') {
        drawCassetteTape(ctx, w, h, frame, isPlaying);
        return;
      }

      // 2. SPOTIFY ART MODE (Pixelated Album Artwork)
      if (mode === 'pixelArt') {
        if (cachedCoverImageRef.current) {
          ctx.drawImage(cachedCoverImageRef.current, 0, 0, w, h);
        } else {
          ctx.fillStyle = themeColors.navy;
          ctx.fillRect(0, 0, w, h);
        }
        return;
      }

      // 3. PIXEL COVERS MODE (Shuffles with every song change!)
      if (isPixelCoversMode) {
        if (activePixelCover.type === 'canvas_saturn') {
          drawSaturnScene(ctx, w, h, frame, saturnImgRef.current);
          return;
        }

        if (activePixelCover.type === 'canvas_bunny') {
          drawMoonBunnyScene(ctx, w, h, frame, isPlaying, themeColors);
          return;
        }

        if (activePixelCover.type === 'canvas_synthwave') {
          drawSynthwaveScene(ctx, w, h, frame, isPlaying, (trackTitle || '') + (artistName || ''));
          return;
        }
      }

      // Fallback: draw Moon Bunny scene
      drawMoonBunnyScene(ctx, w, h, frame, isPlaying, themeColors);
    };

    const render = () => {
      drawCanvas();
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, mode, isPixelCoversMode, activePixelCover, hasCoverLoaded, themeColors, trackTitle, artistName]);

  // If in Pixel Covers mode and current shuffled cover is a retro animated GIF:
  if (isPixelCoversMode && activePixelCover.type === 'gif' && activePixelCover.src) {
    return (
      <div
        className="relative w-full h-full flex items-center justify-center bg-[#191244] border-2 border-[#191244] overflow-hidden select-none cursor-pointer"
        onClick={handleShuffleCover}
        title={`Pixel Cover: ${activePixelCover.name} (Click to shuffle)`}
      >
        <img
          src={activePixelCover.src}
          alt={activePixelCover.name}
          className="w-full h-full object-contain pixelated select-none pointer-events-none"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center bg-[#191244] border-2 border-[#191244] overflow-hidden select-none ${
        isPixelCoversMode ? 'cursor-pointer' : ''
      }`}
      onClick={handleShuffleCover}
      title={isPixelCoversMode ? `Pixel Cover: ${activePixelCover.name} (Click to shuffle)` : undefined}
    >
      <canvas
        ref={canvasRef}
        width={240}
        height={240}
        className="w-full h-full object-contain pixelated select-none pointer-events-none"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

// ==========================================
// SCENE DRAWING FUNCTIONS
// ==========================================

// 1. Saturn Galaxy Cover with Animated Twinkling Stars
function drawSaturnScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: number,
  saturnImg: HTMLImageElement | null
) {
  if (saturnImg && saturnImg.complete && saturnImg.naturalWidth > 0) {
    ctx.drawImage(saturnImg, 0, 0, w, h);
  } else {
    // Rich retro purple space background while loading
    ctx.fillStyle = '#261b4d';
    ctx.fillRect(0, 0, w, h);
  }

  // Draw twinkling stars
  SATURN_STARS.forEach((star) => {
    const twinkle = Math.sin(frame * star.speed + star.offset);
    if (twinkle < -0.3) return; // Star is in dim phase

    const brightness = (twinkle + 0.3) / 1.3; // 0 to 1
    const color = brightness > 0.65 ? star.peakColor : star.baseColor;
    ctx.fillStyle = color;

    const sx = Math.floor(star.x);
    const sy = Math.floor(star.y);

    if (star.size === 1) {
      ctx.fillRect(sx, sy, 2, 2);
    } else if (star.isGlint) {
      // Shimmering planet surface diamond glint
      const arm = brightness > 0.7 ? 3 : 2;
      ctx.fillRect(sx - 1, sy - 1, 3, 3);
      if (brightness > 0.5) {
        ctx.fillRect(sx - arm, sy, arm * 2 + 1, 1);
        ctx.fillRect(sx, sy - arm, 1, arm * 2 + 1);
      }
    } else {
      // 4-pointed retro pixel cross star (+)
      const arm = brightness > 0.75 ? 3 : brightness > 0.35 ? 2 : 1;
      const core = brightness > 0.6 ? 2 : 1;
      ctx.fillRect(sx - Math.floor(core / 2), sy - Math.floor(core / 2), core, core);
      ctx.fillRect(sx - arm, sy, arm * 2 + 1, 1);
      ctx.fillRect(sx, sy - arm, 1, arm * 2 + 1);
    }
  });
}

// 2. Moon Bunny Scene
function drawMoonBunnyScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: number,
  isPlaying: boolean,
  themeColors: { navy: string; pink: string; periwinkle: string; cream: string }
) {
  ctx.fillStyle = themeColors.navy;
  ctx.fillRect(0, 0, w, h);

  // Twinkling stars
  BUNNY_STARS.forEach((star) => {
    const twinkle = Math.sin(frame * star.speed + star.offset);
    if (twinkle < -0.6) return;
    const col = star.color === 'pink' ? themeColors.pink : themeColors.cream;
    ctx.fillStyle = col;
    const sx = Math.floor(star.x * 1.5);
    const sy = Math.floor(star.y * 1.5);
    const pixelSize = 3;
    if (star.type === 'dot') {
      ctx.fillRect(sx, sy, pixelSize, pixelSize);
    } else {
      ctx.fillRect(sx, sy - pixelSize, pixelSize, pixelSize);
      ctx.fillRect(sx - pixelSize, sy, pixelSize * 3, pixelSize);
      ctx.fillRect(sx, sy + pixelSize, pixelSize, pixelSize);
    }
  });

  // Crescent Moon
  const moonCenterX = Math.floor(w * 0.44);
  const moonCenterY = Math.floor(h * 0.52);
  const moonRadius = 68;
  const innerRadius = 54;
  const innerOffsetX = 24;
  const pSize = 4;
  ctx.fillStyle = themeColors.pink;

  for (let y = moonCenterY - moonRadius; y <= moonCenterY + moonRadius; y += pSize) {
    for (let x = moonCenterX - moonRadius; x <= moonCenterX + moonRadius; x += pSize) {
      const distOuter = Math.hypot(x - moonCenterX, y - moonCenterY);
      const distInner = Math.hypot(x - (moonCenterX + innerOffsetX), y - moonCenterY);
      if (distOuter <= moonRadius && distInner >= innerRadius) {
        ctx.fillRect(x, y, pSize, pSize);
      }
    }
  }

  // Sitting Bunny Silhouette
  ctx.strokeStyle = themeColors.periwinkle;
  ctx.fillStyle = themeColors.navy;
  ctx.lineWidth = 2.5;

  const bunnyX = moonCenterX + 2;
  const breath = isPlaying ? Math.sin(frame * 0.08) * 1.5 : 0;
  const bunnyY = moonCenterY - 14 + breath;

  ctx.beginPath();
  ctx.rect(bunnyX, bunnyY, 5, 14);
  ctx.rect(bunnyX + 6, bunnyY + 1, 5, 13);
  ctx.rect(bunnyX - 2, bunnyY + 13, 15, 12);
  ctx.fillStyle = themeColors.periwinkle;
  ctx.fillRect(bunnyX + 1, bunnyY + 17, 2, 2);
  ctx.fillStyle = themeColors.navy;
  ctx.rect(bunnyX - 5, bunnyY + 24, 21, 16);
  ctx.rect(bunnyX - 7, bunnyY + 28, 5, 6);
  ctx.rect(bunnyX + 14, bunnyY + 34, 4, 4);
  ctx.rect(bunnyX - 3, bunnyY + 39, 17, 7);
  ctx.fill();
  ctx.stroke();

  if (isPlaying && frame % 60 < 30) {
    ctx.fillStyle = themeColors.pink;
    ctx.fillRect(bunnyX + 16, bunnyY - 6, 3, 3);
    ctx.fillRect(bunnyX + 19, bunnyY - 9, 3, 3);
    ctx.fillRect(bunnyX + 22, bunnyY - 6, 3, 3);
  }
}

// 3. Synthwave Sunset Scene
function drawSynthwaveScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: number,
  isPlaying: boolean,
  seedStr: string
) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palettes = [
    { sky: '#1f132e', ground: '#361545', accent: '#ff7b90', star: '#fec5db' },
    { sky: '#0f172a', ground: '#1e1b4b', accent: '#38bdf8', star: '#e0f2fe' },
    { sky: '#18181b', ground: '#27272a', accent: '#a855f7', star: '#f3e8ff' },
    { sky: '#14213d', ground: '#000000', accent: '#fca311', star: '#ffffff' },
  ];
  const pal = palettes[Math.abs(hash) % palettes.length];

  ctx.fillStyle = pal.sky;
  ctx.fillRect(0, 0, w, h);

  // Retro Sun
  const sunRadius = Math.floor(w * 0.24);
  const sunX = Math.floor(w / 2);
  const sunY = Math.floor(h * 0.38);
  ctx.fillStyle = pal.accent;
  for (let y = -sunRadius; y <= sunRadius; y += 2) {
    for (let x = -sunRadius; x <= sunRadius; x += 2) {
      if (x * x + y * y <= sunRadius * sunRadius) {
        if (y > 4 && (y + Math.floor(frame * 0.05)) % 4 === 0) continue;
        ctx.fillRect(sunX + x, sunY + y, 2, 2);
      }
    }
  }

  // Mountain Silhouette
  ctx.fillStyle = pal.ground;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, Math.floor(h * 0.64));
  ctx.lineTo(Math.floor(w * 0.28), Math.floor(h * 0.46));
  ctx.lineTo(Math.floor(w * 0.6), Math.floor(h * 0.67));
  ctx.lineTo(Math.floor(w * 0.82), Math.floor(h * 0.5));
  ctx.lineTo(w, Math.floor(h * 0.6));
  ctx.lineTo(w, h);
  ctx.fill();

  // Twinkling Stars
  for (let i = 0; i < 14; i++) {
    const sx = ((Math.abs(hash * (i + 1) * 31)) % (w - 12)) + 6;
    const sy = ((Math.abs(hash * (i + 1) * 17)) % Math.floor(h * 0.36)) + 6;
    const twinkle = Math.sin(frame * 0.06 + i);
    if (twinkle > -0.2) {
      ctx.fillStyle = twinkle > 0.5 ? '#ffffff' : pal.star;
      const size = twinkle > 0.6 ? 3 : 2;
      ctx.fillRect(sx, sy, size, size);
    }
  }

  // Grid Horizon
  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, h - 20, w, 2);
  ctx.fillRect(0, h - 10, w, 2);
  ctx.fillRect(0, h - 3, w, 2);
}

// Procedural Synthwave for fallback album art
function drawSynthwaveLandscape(ctx: CanvasRenderingContext2D, w: number, h: number, seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palettes = [
    { sky: '#1f132e', ground: '#361545', accent: '#ff7b90', star: '#fec5db' },
    { sky: '#0f172a', ground: '#1e1b4b', accent: '#38bdf8', star: '#e0f2fe' },
    { sky: '#18181b', ground: '#27272a', accent: '#a855f7', star: '#f3e8ff' },
    { sky: '#14213d', ground: '#000000', accent: '#fca311', star: '#ffffff' },
  ];
  const pal = palettes[Math.abs(hash) % palettes.length];

  ctx.fillStyle = pal.sky;
  ctx.fillRect(0, 0, w, h);

  const sunRadius = Math.floor(w * 0.24);
  const sunX = Math.floor(w / 2);
  const sunY = Math.floor(h * 0.38);
  ctx.fillStyle = pal.accent;
  for (let y = -sunRadius; y <= sunRadius; y += 2) {
    for (let x = -sunRadius; x <= sunRadius; x += 2) {
      if (x * x + y * y <= sunRadius * sunRadius) {
        if (y > 4 && y % 4 === 0) continue;
        ctx.fillRect(sunX + x, sunY + y, 2, 2);
      }
    }
  }

  ctx.fillStyle = pal.ground;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, Math.floor(h * 0.64));
  ctx.lineTo(Math.floor(w * 0.28), Math.floor(h * 0.46));
  ctx.lineTo(Math.floor(w * 0.6), Math.floor(h * 0.67));
  ctx.lineTo(Math.floor(w * 0.82), Math.floor(h * 0.5));
  ctx.lineTo(w, Math.floor(h * 0.6));
  ctx.lineTo(w, h);
  ctx.fill();

  ctx.fillStyle = pal.star;
  for (let i = 0; i < 14; i++) {
    const sx = ((Math.abs(hash * (i + 1) * 31)) % (w - 8)) + 4;
    const sy = ((Math.abs(hash * (i + 1) * 17)) % Math.floor(h * 0.35)) + 4;
    ctx.fillRect(sx, sy, 2, 2);
  }

  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, h - 16, w, 2);
  ctx.fillRect(0, h - 8, w, 2);
  ctx.fillRect(0, h - 2, w, 2);
}

// 4. Animated Cassette Tape Mode
function drawCassetteTape(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: number,
  isPlaying: boolean
) {
  ctx.fillStyle = '#2c2269';
  ctx.fillRect(20, 30, w - 40, h - 60);

  ctx.strokeStyle = '#fec5db';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 30, w - 40, h - 60);

  ctx.fillStyle = '#ffe6f0';
  ctx.fillRect(35, 45, w - 70, h - 90);
  ctx.strokeStyle = '#191244';
  ctx.lineWidth = 2;
  ctx.strokeRect(35, 45, w - 70, h - 90);

  ctx.fillStyle = '#191244';
  ctx.fillRect(60, 85, w - 120, 50);

  const rotation = isPlaying ? frame * 0.05 : 0;
  drawSpool(ctx, 85, 110, 16, rotation);
  drawSpool(ctx, w - 85, 110, 16, rotation);

  ctx.strokeStyle = '#3d2e1e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(85, 118);
  ctx.lineTo(w - 85, 118);
  ctx.stroke();
}

function drawSpool(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = '#fffdf5';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#191244';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#191244';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    ctx.fillRect(Math.cos(a) * (r * 0.6) - 2, Math.sin(a) * (r * 0.6) - 2, 4, 4);
  }

  ctx.restore();
}
