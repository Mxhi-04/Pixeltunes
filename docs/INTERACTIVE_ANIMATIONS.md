# PixelTunes Interactive Animations & Visual Architecture

Documentation of the motion design, canvas pixel physics, and authentic retro visual effects in PixelTunes.

## 1. Interactive Hero Pixel Grid (`InteractivePixelGrid.tsx`)

- **Canvas DPI Scaling**: Dynamically scaled with `window.devicePixelRatio` capped at `2x` for crisp rendering on Apple Retina and Windows high-DPI displays.
- **Continuous 7-Color Palette Lerp**: Smooth cubic Hermite interpolation between the 7 authentic retro palette color stops:
  - Inspo Pink (`#fec5db`)
  - Retro Gold (`#ffd269`)
  - Cyber Mint (`#9df0cf`)
  - Periwinkle Blue (`#8fa2d4`)
  - Neon Violet (`#af50ff`)
  - Sunset Coral (`#ff7b90`)
  - Bright Cyan (`#00f5d4`)
- **Exponential Particle Trail**: Velocity-scaled hover falloff with exponential intensity decay (`intensity *= 0.94`) for a silky trailing wake.
- **Accessibility**: Listens to `prefers-reduced-motion: reduce` to pause RAF loop and freeze decorative canvas animations.

## 2. Animated Cassette Tape Visual (`Footer.tsx`)

- **Cassette Floating Physics**: Subtle 4-second sinusoidal bobbing with gentle perspective tilt (`rotate(-1.5deg)` to `rotate(1.5deg)`).
- **Spool Mechanics**: Dual 6-spoke cogwheels rotating at 2.5s per cycle with magnetic tape bulk winding representation.
- **Center Window Meter**: Repeating linear tape stripe animation simulating magnetic tape transport during playback.

## 3. Brand Identity & Operating System Consistency

- **Official Apple Inc. Bitten Logo**: Crisp vector SVG rendering for macOS builds.
- **Official Microsoft Windows 4-Pane Grid**: Authentic 4-quadrant vector SVG rendering for Windows portable packages.
