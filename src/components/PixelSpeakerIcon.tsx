import React from 'react';

interface PixelSpeakerIconProps extends React.SVGProps<SVGSVGElement> {
  level: number; // 0 to 5
  isMuted?: boolean;
}

export const PixelSpeakerIcon: React.FC<PixelSpeakerIconProps> = ({
  level,
  isMuted = false,
  fill = 'currentColor',
  ...props
}) => {
  const showWave1 = !isMuted && level >= 1;
  const showWave2 = !isMuted && level >= 3;

  return (
    <svg
      viewBox="0 0 16 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ shapeRendering: 'crispEdges' }}
      className="select-none"
      {...props}
    >
      <g fill={fill}>
        {/* Magnet / Driver */}
        <rect x="1" y="4" width="3" height="4" />

        {/* Cone expanding out */}
        <rect x="4" y="3" width="1" height="6" />
        <rect x="5" y="2" width="1" height="8" />
        <rect x="6" y="1" width="1" height="10" />
        <rect x="7" y="0" width="1" height="12" />

        {/* Sound Wave 1 (Inner Arc) */}
        {showWave1 && (
          <>
            <rect x="9" y="4" width="1" height="1" />
            <rect x="10" y="5" width="1" height="2" />
            <rect x="9" y="7" width="1" height="1" />
          </>
        )}

        {/* Sound Wave 2 (Outer Arc) */}
        {showWave2 && (
          <>
            <rect x="12" y="2" width="1" height="1" />
            <rect x="13" y="3" width="1" height="1" />
            <rect x="14" y="4" width="1" height="4" />
            <rect x="13" y="8" width="1" height="1" />
            <rect x="12" y="9" width="1" height="1" />
          </>
        )}

        {/* Muted ✕ Indicator */}
        {(isMuted || level === 0) && (
          <>
            <rect x="10" y="4" width="1" height="1" />
            <rect x="14" y="4" width="1" height="1" />
            <rect x="11" y="5" width="1" height="1" />
            <rect x="13" y="5" width="1" height="1" />
            <rect x="12" y="6" width="1" height="1" />
            <rect x="11" y="7" width="1" height="1" />
            <rect x="13" y="7" width="1" height="1" />
            <rect x="10" y="8" width="1" height="1" />
            <rect x="14" y="8" width="1" height="1" />
          </>
        )}
      </g>
    </svg>
  );
};
