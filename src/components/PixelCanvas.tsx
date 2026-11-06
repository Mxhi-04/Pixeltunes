import React, { useEffect, useRef, useState } from 'react';

interface PixelCanvasProps {
  isPlaying: boolean;
  albumArtUrl?: string | null;
  mode: 'inspo' | 'pixelArt' | 'cassette';
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

  // Cached image element of the currently active pixel cover (0ms draw in requestAnimationFrame)
  const cachedCoverImageRef = useRef<HTMLImageElement | null>(null);
  const [hasCoverLoaded, setHasCoverLoaded] = useState(false);

  // Track the previous temporary cover file path on disk to delete it when song switches
  const previousTempFileRef = useRef<string | null>(null);
  const currentTrackKeyRef = useRef<string>('');

  const pixelSize = pixelResolution || 180;
  const trackKey = `${trackTitle}__${artistName}__${albumArtUrl || 'procedural'}__${pixelSize}`;

  // Generate pixel music cover for each song, display it, and delete previous cover to free space
  useEffect(() => {
    if (currentTrackKeyRef.current === trackKey && cachedCoverImageRef.current) {
      return;
    }
    currentTrackKeyRef.current = trackKey;

    let isCancelled = false;

    // Helper: Safely delete old temporary cover file from disk
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
      // 1. Delete previous track's cover file from disk to free up space
      await deleteOldCover();

      if (isCancelled) return;

      const offscreen = document.createElement('canvas');
      offscreen.width = pixelSize;
      offscreen.height = pixelSize;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;

      if (albumArtUrl) {
        // --- Spotify Album Artwork Pixelation (High Clarity & True Vibrant Colors) ---
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = albumArtUrl;

        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });

        if (isCancelled) return;

        // Downsample to high-clarity pixel grid (e.g. 180x180 - over 10x more pixels than 56x56)
        ctx.drawImage(img, 0, 0, pixelSize, pixelSize);
      } else {
        // --- Procedural 16-Bit Pixel Music Cover for Local / Lo-Fi Audio ---
        // Hash track title for deterministic palette & scenery
        let hash = 0;
        const seedStr = trackTitle + artistName;
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

        // Background Sky
        ctx.fillStyle = pal.sky;
        ctx.fillRect(0, 0, pixelSize, pixelSize);

        // Retro Sun / Moon
        const sunRadius = Math.floor(pixelSize * 0.24);
        const sunX = Math.floor(pixelSize / 2);
        const sunY = Math.floor(pixelSize * 0.38);
        ctx.fillStyle = pal.accent;
        for (let y = -sunRadius; y <= sunRadius; y += 2) {
          for (let x = -sunRadius; x <= sunRadius; x += 2) {
            if (x * x + y * y <= sunRadius * sunRadius) {
              // Sunset horizontal lines in lower half of sun
              if (y > 4 && y % 4 === 0) continue;
              ctx.fillRect(sunX + x, sunY + y, 2, 2);
            }
          }
        }

        // Mountain Silhouette
        ctx.fillStyle = pal.ground;
        ctx.beginPath();
        ctx.moveTo(0, pixelSize);
        ctx.lineTo(0, Math.floor(pixelSize * 0.64));
        ctx.lineTo(Math.floor(pixelSize * 0.28), Math.floor(pixelSize * 0.46));
        ctx.lineTo(Math.floor(pixelSize * 0.6), Math.floor(pixelSize * 0.67));
        ctx.lineTo(Math.floor(pixelSize * 0.82), Math.floor(pixelSize * 0.5));
        ctx.lineTo(pixelSize, Math.floor(pixelSize * 0.6));
        ctx.lineTo(pixelSize, pixelSize);
        ctx.fill();

        // Stars
        ctx.fillStyle = pal.star;
        for (let i = 0; i < 14; i++) {
          const sx = ((Math.abs(hash * (i + 1) * 31)) % (pixelSize - 8)) + 4;
          const sy = ((Math.abs(hash * (i + 1) * 17)) % Math.floor(pixelSize * 0.35)) + 4;
          ctx.fillRect(sx, sy, 2, 2);
        }

        // Retro Grid Horizon
        ctx.fillStyle = pal.accent;
        ctx.fillRect(0, pixelSize - 16, pixelSize, 2);
        ctx.fillRect(0, pixelSize - 8, pixelSize, 2);
        ctx.fillRect(0, pixelSize - 2, pixelSize, 2);
      }

      // Upscale cleanly to 240x240 display canvas with crisp nearest-neighbor pixelation
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 240;
      exportCanvas.height = 240;
      const exportCtx = exportCanvas.getContext('2d');
      if (!exportCtx) return;

      exportCtx.imageSmoothingEnabled = false;
      exportCtx.drawImage(offscreen, 0, 0, 240, 240);

      const dataUrl = exportCanvas.toDataURL('image/png');

      // 2. Save new pixel cover to temporary disk file via Electron IPC
      if (window.electronAPI?.saveTempCover) {
        try {
          const savedPath = await window.electronAPI.saveTempCover(dataUrl, trackKey);
          previousTempFileRef.current = savedPath;
        } catch (saveErr) {
          console.warn('Could not write temporary pixel cover file:', saveErr);
        }
      }

      // 3. Cache image element for 60fps rendering in canvas animation loop
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
  }, [trackKey, albumArtUrl, trackTitle, artistName, pixelSize]);

  // Clean up any temporary cover file when component unmounts
  useEffect(() => {
    return () => {
      if (previousTempFileRef.current && window.electronAPI?.deleteTempCover) {
        window.electronAPI.deleteTempCover(previousTempFileRef.current);
        previousTempFileRef.current = null;
      }
    };
  }, []);

  // Canvas Drawing & 60FPS Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    // Stars definition for Inspo Moon Bunny scene
    const stars = [
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

    const drawCanvas = () => {
      frame++;
      ctx.imageSmoothingEnabled = false;
      const w = canvas.width;
      const h = canvas.height;

      // Clear with dark navy
      ctx.fillStyle = themeColors.navy;
      ctx.fillRect(0, 0, w, h);

      // 1. PRIMARY MODE: PIXEL MUSIC COVER (100% Clean - No text or shapes drawn over artwork)
      if (mode === 'pixelArt') {
        if (cachedCoverImageRef.current) {
          ctx.drawImage(cachedCoverImageRef.current, 0, 0, w, h);
        } else {
          // Clean dark placeholder while generating
          ctx.fillStyle = themeColors.navy;
          ctx.fillRect(0, 0, w, h);
        }
        return;
      }

      // 2. CASSETTE TAPE MODE
      if (mode === 'cassette') {
        drawCassetteTape(ctx, w, h, frame, isPlaying);
        return;
      }

      // 3. INSPO MOON BUNNY SCENE
      stars.forEach((star) => {
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

      // Draw Crescent Moon
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
  }, [isPlaying, mode, hasCoverLoaded, themeColors]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#191244] border-2 border-[#191244] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={240}
        height={240}
        className="w-full h-full object-contain pixelated"
      />
    </div>
  );
};

// Helper: Mini rotating pixel vinyl disc in the corner
function drawMiniVinyl(ctx: CanvasRenderingContext2D, cx: number, cy: number, angle: number) {
  const r = 16;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Outer black record
  ctx.fillStyle = '#100b20';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Grooves
  ctx.strokeStyle = '#251b47';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
  ctx.stroke();

  // Center pink label
  ctx.fillStyle = '#fec5db';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Spindle hole
  ctx.fillStyle = '#100b20';
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Helper: Animated Cassette Tape Mode
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
