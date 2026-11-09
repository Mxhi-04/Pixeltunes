import React, { useEffect, useRef, useState, useMemo } from 'react';
import { getPixelCoverForTrack, PixelCover } from '../../types/covers';

interface PixelCanvasProps {
  isPlaying: boolean;
  reducedMotion: boolean;
  albumArtUrl?: string | null;
  albumArtLink?: string;
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
  reducedMotion,
  albumArtUrl,
  albumArtLink,
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
  const [failedArtworkUrl, setFailedArtworkUrl] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<{ url: string; image: HTMLImageElement } | null>(null);
  const { navy, pink, periwinkle, cream } = themeColors;

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

  const coverUrl = activePixelCover.src;
  const showAnimatedGif = isPixelCoversMode && activePixelCover.type === 'gif' && !reducedMotion;

  useEffect(() => {
    if (!isPixelCoversMode || !coverUrl || showAnimatedGif) return;
    const image = new Image();
    image.onload = () => setCoverImage({ url: coverUrl, image });
    image.src = coverUrl;
    return () => { image.onload = null; };
  }, [isPixelCoversMode, coverUrl, showAnimatedGif]);

  const showSpotifyArtwork = mode === 'pixelArt' && albumArtUrl &&
    albumArtUrl !== failedArtworkUrl && albumArtUrl.startsWith('https://');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { width, height } = canvas;
    const colors = { navy, pink, periwinkle, cream };
    const cover = coverImage?.url === coverUrl ? coverImage?.image : undefined;
    const animate = !reducedMotion && (mode === 'cassette' ? isPlaying : isPixelCoversMode);
    const start = performance.now();
    let frameId = 0;

    const render = (now: number) => {
      const frame = animate ? (now - start) / (1000 / 60) + 1 : 1;
      ctx.imageSmoothingEnabled = false;
      if (mode === 'cassette') {
        drawCassetteTape(ctx, width, height, frame, isPlaying && !reducedMotion);
      } else if (mode === 'pixelArt') {
        const art = document.createElement('canvas');
        art.width = pixelResolution;
        art.height = pixelResolution;
        const artCtx = art.getContext('2d');
        if (!artCtx) return;
        drawSynthwaveLandscape(artCtx, pixelResolution, pixelResolution, trackTitle + artistName);
        ctx.drawImage(art, 0, 0, width, height);
      } else if (activePixelCover.type === 'canvas_saturn') {
        drawSaturnScene(ctx, width, height, frame, cover ?? null);
      } else if (activePixelCover.type === 'canvas_synthwave') {
        drawSynthwaveScene(ctx, width, height, frame, isPlaying && !reducedMotion, trackTitle + artistName);
      } else if (cover && activePixelCover.type === 'gif') {
        // Canvas uses the default frame of animated image sources.
        ctx.fillStyle = navy;
        ctx.fillRect(0, 0, width, height);
        const ratio = Math.min(width / cover.naturalWidth, height / cover.naturalHeight);
        const w = cover.naturalWidth * ratio;
        const h = cover.naturalHeight * ratio;
        ctx.drawImage(cover, (width - w) / 2, (height - h) / 2, w, h);
      } else {
        drawMoonBunnyScene(ctx, width, height, frame, isPlaying && !reducedMotion, colors);
      }

      if (animate) frameId = requestAnimationFrame(render);
    };

    render(start);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, mode, isPixelCoversMode, activePixelCover, coverUrl, coverImage, showSpotifyArtwork,
    navy, pink, periwinkle, cream, trackTitle, artistName, reducedMotion, pixelResolution]);

  const art = showAnimatedGif ? (
    <img src={coverUrl} alt="" className="w-full h-full object-contain pixelated pointer-events-none" />
  ) : (
    <canvas ref={canvasRef} width={240} height={240}
      className="w-full h-full object-contain pixelated pointer-events-none" aria-hidden="true" />
  );
  const frameClass = 'relative w-full h-full flex items-center justify-center bg-[#191244] border-2 border-[#191244] overflow-hidden';

  if (showSpotifyArtwork) {
    const artwork = <img src={albumArtUrl} alt={`Cover art for ${trackTitle}`}
      className="max-w-full max-h-full rounded object-contain" style={{ imageRendering: 'auto' }}
      onError={() => setFailedArtworkUrl(albumArtUrl)} />;
    return albumArtLink ? (
      <a href={albumArtLink} target="_blank" rel="noopener noreferrer" className={`${frameClass} z-[41]`}>{artwork}</a>
    ) : <div className={`${frameClass} z-[41]`}>{artwork}</div>;
  }

  return isPixelCoversMode ? (
    <button type="button" className={frameClass} onClick={handleShuffleCover}
      title={`Pixel Cover: ${activePixelCover.name}`} aria-label={`Shuffle pixel cover (current: ${activePixelCover.name})`}>
      {art}
    </button>
  ) : <div className={frameClass}>{art}</div>;

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
