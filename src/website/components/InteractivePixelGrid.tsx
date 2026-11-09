import React, { useEffect, useRef } from 'react';

// Authentic 7-color retro 16-bit palette in a continuous smooth loop
const PALETTE: [number, number, number][] = [
  [254, 197, 219], // Inspo Pink (#fec5db)
  [255, 210, 105], // Retro Gold (#ffd269)
  [157, 240, 207], // Cyber Mint (#9df0cf)
  [143, 162, 212], // Periwinkle Blue (#8fa2d4)
  [175, 80, 255],  // Neon Violet (#af50ff)
  [255, 123, 144], // Sunset Coral (#ff7b90)
  [0, 245, 212],   // Bright Cyan (#00f5d4)
];

// Helper to get smoothly interpolated RGB along the palette loop for any value t
function getPaletteColor(t: number): [number, number, number] {
  const norm = ((t % 1) + 1) % 1;
  const scaled = norm * PALETTE.length;
  const index1 = Math.floor(scaled) % PALETTE.length;
  const index2 = (index1 + 1) % PALETTE.length;
  const fraction = scaled - Math.floor(scaled);

  const c1 = PALETTE[index1];
  const c2 = PALETTE[index2];

  // Smooth Hermite / ease-in-out interpolation between palette stops
  const smooth = fraction * fraction * (3 - 2 * fraction);

  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * smooth),
    Math.round(c1[1] + (c2[1] - c1[1]) * smooth),
    Math.round(c1[2] + (c2[2] - c1[2]) * smooth),
  ];
}

interface PixelCell {
  x: number;
  y: number;
  intensity: number; // 0 to 1
  r: number;
  g: number;
  b: number;
  targetR: number;
  targetG: number;
  targetB: number;
}

interface InteractivePixelGridProps {
  className?: string;
  cellSize?: number; // default ~26px
}

export const InteractivePixelGrid: React.FC<InteractivePixelGridProps> = ({
  className = '',
  cellSize = 26,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Check reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId: number;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let grid: PixelCell[] = [];

    // Continuous palette progression phase
    let palettePhase = 0;

    // Track mouse coordinates
    const mouse = {
      x: -1000,
      y: -1000,
      prevX: -1000,
      prevY: -1000,
      isHovered: false,
    };

    const initGrid = () => {
      const rect = container.getBoundingClientRect();
      width = Math.ceil(rect.width);
      height = Math.ceil(rect.height);

      if (width === 0 || height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);

      cols = Math.ceil(width / cellSize) + 1;
      rows = Math.ceil(height / cellSize) + 1;

      grid = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const initialColor = PALETTE[(c + r) % PALETTE.length];
          grid.push({
            x: c * cellSize,
            y: r * cellSize,
            intensity: 0,
            r: initialColor[0],
            g: initialColor[1],
            b: initialColor[2],
            targetR: initialColor[0],
            targetG: initialColor[1],
            targetB: initialColor[2],
          });
        }
      }
    };

    initGrid();

    // Resize observer for responsive layout
    const resizeObserver = new ResizeObserver(() => {
      initGrid();
    });
    resizeObserver.observe(container);

    // Track mouse globally across window so hover works even over children/text/buttons
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if mouse is within hero bounds (with a gentle 30px margin)
      if (x >= -30 && x <= rect.width + 30 && y >= -30 && y <= rect.height + 30) {
        mouse.x = x;
        mouse.y = y;
        mouse.isHovered = true;

        if (mouse.prevX !== -1000 && mouse.prevY !== -1000) {
          const dx = mouse.x - mouse.prevX;
          const dy = mouse.y - mouse.prevY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Advance palette smoothly based on mouse movement speed
          palettePhase += dist * 0.0018;
        }

        mouse.prevX = mouse.x;
        mouse.prevY = mouse.y;
      } else {
        mouse.isHovered = false;
        mouse.x = -1000;
        mouse.y = -1000;
      }
    };

    const handlePointerLeave = () => {
      mouse.isHovered = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    // Animation loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Subtle ambient time drift for the color loop
      palettePhase += 0.0006;

      // Influence radius around mouse (about 4.5 cells)
      const hoverRadius = cellSize * 4.8;
      const hoverRadiusSq = hoverRadius * hoverRadius;

      // Random gentle ambient retro sparkles
      if (!prefersReducedMotion && Math.random() < 0.05) {
        const randomIndex = Math.floor(Math.random() * grid.length);
        const cell = grid[randomIndex];
        if (cell && cell.intensity < 0.1) {
          cell.intensity = 0.35 + Math.random() * 0.3;
          const [ar, ag, ab] = getPaletteColor(palettePhase + Math.random() * 0.5);
          cell.targetR = ar;
          cell.targetG = ag;
          cell.targetB = ab;
        }
      }

      const totalCells = grid.length;
      for (let i = 0; i < totalCells; i++) {
        const cell = grid[i];

        // Check distance to mouse
        if (mouse.isHovered) {
          const centerX = cell.x + cellSize / 2;
          const centerY = cell.y + cellSize / 2;
          const dx = centerX - mouse.x;
          const dy = centerY - mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < hoverRadiusSq) {
            const dist = Math.sqrt(distSq);
            // Non-linear cubic falloff for a silky, blooming center glow
            const proximity = 1 - dist / hoverRadius;
            const targetIntensity = Math.pow(proximity, 1.25);

            if (targetIntensity > cell.intensity) {
              cell.intensity = targetIntensity;

              // Waveform ripple offset based on distance from mouse
              const rippleOffset = (dist / hoverRadius) * 0.15;
              const [tr, tg, tb] = getPaletteColor(palettePhase + rippleOffset);
              cell.targetR = tr;
              cell.targetG = tg;
              cell.targetB = tb;
            }
          }
        }

        // Smooth color interpolation (LERP towards target color)
        cell.r += (cell.targetR - cell.r) * 0.1;
        cell.g += (cell.targetG - cell.g) * 0.1;
        cell.b += (cell.targetB - cell.b) * 0.1;

        // Smooth intensity decay (exponential ease-out for silky fading trail)
        if (cell.intensity > 0.003) {
          cell.intensity *= 0.94;
        } else {
          cell.intensity = 0;
        }

        const cr = Math.round(cell.r);
        const cg = Math.round(cell.g);
        const cb = Math.round(cell.b);

        // Render illuminated cell fill
        if (cell.intensity > 0.01) {
          const fillAlpha = cell.intensity * 0.48;
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${fillAlpha})`;
          ctx.fillRect(cell.x + 1, cell.y + 1, cellSize - 2, cellSize - 2);

          // Center pixel glint at peak intensity
          if (cell.intensity > 0.38) {
            const glintAlpha = (cell.intensity - 0.38) * 0.6;
            ctx.fillStyle = `rgba(255, 255, 255, ${glintAlpha})`;
            const inset = Math.floor(cellSize * 0.32);
            const glintSize = Math.max(3, Math.floor(cellSize * 0.36));
            ctx.fillRect(cell.x + inset, cell.y + inset, glintSize, glintSize);
          }
        }

        // Authentic 16-bit hairline pixel grid stroke
        // Subtle resting lines (0.04 alpha) and bright glowing lines when hovered
        const strokeAlpha = Math.max(0.04, cell.intensity * 0.65);
        ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${strokeAlpha})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, cellSize - 1, cellSize - 1);
      }

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, [cellSize]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden ${className}`}
      style={{ zIndex: 1 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};
