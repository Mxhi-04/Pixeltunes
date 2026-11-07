import React from 'react';

interface PixelSpotifyLogoProps {
  size?: number;
  className?: string;
}

export const PixelSpotifyLogo: React.FC<PixelSpotifyLogoProps> = ({
  size = 28,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      style={{ shapeRendering: 'crispEdges' }}
    >
      {/* 16-bit Pixelated Outer Circle Outline (Dark Navy) */}
      <rect x="7" y="0" width="10" height="1" fill="#191244" />
      <rect x="5" y="1" width="2" height="1" fill="#191244" />
      <rect x="17" y="1" width="2" height="1" fill="#191244" />
      <rect x="3" y="2" width="2" height="1" fill="#191244" />
      <rect x="19" y="2" width="2" height="1" fill="#191244" />
      <rect x="2" y="3" width="1" height="2" fill="#191244" />
      <rect x="21" y="3" width="1" height="2" fill="#191244" />
      <rect x="1" y="5" width="1" height="2" fill="#191244" />
      <rect x="22" y="5" width="1" height="2" fill="#191244" />
      <rect x="0" y="7" width="1" height="10" fill="#191244" />
      <rect x="23" y="7" width="1" height="10" fill="#191244" />
      <rect x="1" y="17" width="1" height="2" fill="#191244" />
      <rect x="22" y="17" width="1" height="2" fill="#191244" />
      <rect x="2" y="19" width="1" height="2" fill="#191244" />
      <rect x="21" y="19" width="1" height="2" fill="#191244" />
      <rect x="3" y="21" width="2" height="1" fill="#191244" />
      <rect x="19" y="21" width="2" height="1" fill="#191244" />
      <rect x="5" y="22" width="2" height="1" fill="#191244" />
      <rect x="17" y="22" width="2" height="1" fill="#191244" />
      <rect x="7" y="23" width="10" height="1" fill="#191244" />

      {/* Vibrant Spotify Green Pixel Fill (#1ED760) */}
      <rect x="7" y="1" width="10" height="2" fill="#1ED760" />
      <rect x="4" y="3" width="16" height="2" fill="#1ED760" />
      <rect x="2" y="5" width="20" height="2" fill="#1ED760" />
      <rect x="1" y="7" width="22" height="10" fill="#1ED760" />
      <rect x="2" y="17" width="20" height="2" fill="#1ED760" />
      <rect x="4" y="19" width="16" height="2" fill="#1ED760" />
      <rect x="7" y="21" width="10" height="2" fill="#1ED760" />

      {/* Top Audio Arc (Dark Navy #191244) */}
      <rect x="5" y="7" width="3" height="2" fill="#191244" />
      <rect x="8" y="6" width="8" height="2" fill="#191244" />
      <rect x="16" y="7" width="3" height="2" fill="#191244" />

      {/* Middle Audio Arc (Dark Navy #191244) */}
      <rect x="6" y="11" width="3" height="2" fill="#191244" />
      <rect x="9" y="10" width="7" height="2" fill="#191244" />
      <rect x="15" y="11" width="3" height="2" fill="#191244" />

      {/* Bottom Audio Arc (Dark Navy #191244) */}
      <rect x="7" y="15" width="3" height="2" fill="#191244" />
      <rect x="10" y="14" width="5" height="2" fill="#191244" />
      <rect x="14" y="15" width="3" height="2" fill="#191244" />
    </svg>
  );
};

