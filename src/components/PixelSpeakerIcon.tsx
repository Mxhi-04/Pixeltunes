import React from 'react';

interface PixelSpeakerIconProps extends React.SVGProps<SVGSVGElement> {
  level: number; // 0 to 5
  isMuted?: boolean;
  rimColor?: string;
  outlineColor?: string;
}

export const PixelSpeakerIcon: React.FC<PixelSpeakerIconProps> = ({
  level,
  isMuted = false,
  rimColor = '#ff7b90',
  outlineColor = '#191244',
  ...props
}) => {
  // Show wave 1 if volume level >= 1 and not muted
  const showWave1 = !isMuted && level >= 1;
  // Show wave 2 if volume level >= 3 and not muted
  const showWave2 = !isMuted && level >= 3;

  return (
    <svg
      width="26"
      height="16"
      viewBox="0 0 26 16"
      fill="none"
      style={{ shapeRendering: 'crispEdges' }}
      className="select-none"
      {...props}
    >
      {/* Speaker Horn & Body */}
      {/* Row 0 */}
      <rect x="8" y="0" width="1" height="1" fill={outlineColor} />
      <rect x="9" y="0" width="1" height="1" fill={rimColor} />
      <rect x="10" y="0" width="1" height="1" fill={outlineColor} />

      {/* Row 1 */}
      <rect x="7" y="1" width="1" height="1" fill={outlineColor} />
      <rect x="8" y="1" width="1" height="1" fill="#8a2842" />
      <rect x="9" y="1" width="1" height="1" fill={rimColor} />
      <rect x="10" y="1" width="1" height="1" fill={outlineColor} />

      {/* Row 2 */}
      <rect x="6" y="2" width="1" height="1" fill={outlineColor} />
      <rect x="7" y="2" width="1" height="1" fill="#cbd5e1" />
      <rect x="8" y="2" width="1" height="1" fill="#8a2842" />
      <rect x="9" y="2" width="1" height="1" fill="#94a3b8" />
      <rect x="10" y="2" width="1" height="1" fill={outlineColor} />

      {/* Row 3 */}
      <rect x="5" y="3" width="1" height="1" fill={outlineColor} />
      <rect x="6" y="3" width="2" height="1" fill="#cbd5e1" />
      <rect x="8" y="3" width="1" height="1" fill="#8a2842" />
      <rect x="9" y="3" width="1" height="1" fill="#94a3b8" />
      <rect x="10" y="3" width="1" height="1" fill={outlineColor} />

      {/* Row 4 */}
      <rect x="1" y="4" width="4" height="1" fill={outlineColor} />
      <rect x="5" y="4" width="3" height="1" fill="#cbd5e1" />
      <rect x="8" y="4" width="1" height="1" fill="#8a2842" />
      <rect x="9" y="4" width="1" height="1" fill="#94a3b8" />
      <rect x="10" y="4" width="1" height="1" fill={outlineColor} />

      {/* Row 5 */}
      <rect x="0" y="5" width="1" height="1" fill={outlineColor} />
      <rect x="1" y="5" width="7" height="1" fill="#cbd5e1" />
      <rect x="8" y="5" width="1" height="1" fill="#8a2842" />
      <rect x="9" y="5" width="1" height="1" fill="#94a3b8" />
      <rect x="10" y="5" width="1" height="1" fill={outlineColor} />

      {/* Row 6 */}
      <rect x="0" y="6" width="1" height="1" fill={outlineColor} />
      <rect x="1" y="6" width="7" height="1" fill="#cbd5e1" />
      <rect x="8" y="6" width="1" height="1" fill="#8a2842" />
      <rect x="9" y="6" width="1" height="1" fill="#94a3b8" />
      <rect x="10" y="6" width="2" height="1" fill={outlineColor} />

      {/* Row 7 */}
      <rect x="0" y="7" width="1" height="1" fill={outlineColor} />
      <rect x="1" y="7" width="7" height="1" fill="#cbd5e1" />
      <rect x="8" y="7" width="1" height="1" fill="#8a2842" />
      <rect x="9" y="7" width="1" height="1" fill="#94a3b8" />
      <rect x="10" y="7" width="1" height="1" fill={outlineColor} />
      <rect x="11" y="7" width="1" height="1" fill="#334155" />
      <rect x="12" y="7" width="1" height="1" fill={outlineColor} />

      {/* Row 8 */}
      <rect x="0" y="8" width="1" height="1" fill={outlineColor} />
      <rect x="1" y="8" width="1" height="1" fill="#cbd5e1" />
      <rect x="2" y="8" width="6" height="1" fill="#94a3b8" />
      <rect x="8" y="8" width="1" height="1" fill="#8a2842" />
      <rect x="9" y="8" width="1" height="1" fill={rimColor} />
      <rect x="10" y="8" width="1" height="1" fill={outlineColor} />
      <rect x="11" y="8" width="1" height="1" fill="#334155" />
      <rect x="12" y="8" width="1" height="1" fill={outlineColor} />

      {/* Row 9 */}
      <rect x="0" y="9" width="1" height="1" fill={outlineColor} />
      <rect x="1" y="9" width="1" height="1" fill="#cbd5e1" />
      <rect x="2" y="9" width="6" height="1" fill="#94a3b8" />
      <rect x="8" y="9" width="1" height="1" fill="#8a2842" />
      <rect x="9" y="9" width="1" height="1" fill={rimColor} />
      <rect x="10" y="9" width="2" height="1" fill={outlineColor} />

      {/* Row 10 */}
      <rect x="0" y="10" width="1" height="1" fill={outlineColor} />
      <rect x="1" y="10" width="4" height="1" fill="#cbd5e1" />
      <rect x="5" y="10" width="3" height="1" fill="#94a3b8" />
      <rect x="8" y="10" width="1" height="1" fill="#8a2842" />
      <rect x="9" y="10" width="1" height="1" fill={rimColor} />
      <rect x="10" y="10" width="1" height="1" fill={outlineColor} />

      {/* Row 11 */}
      <rect x="1" y="11" width="4" height="1" fill={outlineColor} />
      <rect x="5" y="11" width="1" height="1" fill="#cbd5e1" />
      <rect x="6" y="11" width="2" height="1" fill="#94a3b8" />
      <rect x="8" y="11" width="2" height="1" fill="#8a2842" />
      <rect x="10" y="11" width="1" height="1" fill={outlineColor} />

      {/* Row 12 */}
      <rect x="5" y="12" width="1" height="1" fill={outlineColor} />
      <rect x="6" y="12" width="1" height="1" fill="#cbd5e1" />
      <rect x="7" y="12" width="1" height="1" fill="#94a3b8" />
      <rect x="8" y="12" width="2" height="1" fill="#8a2842" />
      <rect x="10" y="12" width="1" height="1" fill={outlineColor} />

      {/* Row 13 */}
      <rect x="6" y="13" width="1" height="1" fill={outlineColor} />
      <rect x="7" y="13" width="1" height="1" fill="#cbd5e1" />
      <rect x="8" y="13" width="2" height="1" fill="#8a2842" />
      <rect x="10" y="13" width="1" height="1" fill={outlineColor} />

      {/* Row 14 */}
      <rect x="7" y="14" width="1" height="1" fill={outlineColor} />
      <rect x="8" y="14" width="1" height="1" fill="#8a2842" />
      <rect x="9" y="14" width="1" height="1" fill={rimColor} />
      <rect x="10" y="14" width="1" height="1" fill={outlineColor} />

      {/* Muted ✕ Symbol */}
      {(isMuted || level === 0) && (
        <g>
          <rect x="14" y="5" width="1" height="1" fill={outlineColor} />
          <rect x="18" y="5" width="1" height="1" fill={outlineColor} />
          <rect x="15" y="6" width="1" height="1" fill="#e11d48" />
          <rect x="17" y="6" width="1" height="1" fill="#e11d48" />
          <rect x="16" y="7" width="1" height="1" fill="#e11d48" />
          <rect x="15" y="8" width="1" height="1" fill="#e11d48" />
          <rect x="17" y="8" width="1" height="1" fill="#e11d48" />
          <rect x="14" y="9" width="1" height="1" fill={outlineColor} />
          <rect x="18" y="9" width="1" height="1" fill={outlineColor} />
        </g>
      )}

      {/* Sound Wave 1 (Inner Arc) */}
      {showWave1 && (
        <g>
          <rect x="14" y="5" width="2" height="1" fill={outlineColor} />
          <rect x="14" y="6" width="1" height="1" fill={outlineColor} />
          <rect x="15" y="6" width="1" height="1" fill="#ffd269" />
          <rect x="16" y="6" width="1" height="1" fill={outlineColor} />
          <rect x="15" y="7" width="1" height="1" fill={outlineColor} />
          <rect x="16" y="7" width="1" height="1" fill="#ffd269" />
          <rect x="17" y="7" width="1" height="1" fill={outlineColor} />
          <rect x="15" y="8" width="1" height="1" fill={outlineColor} />
          <rect x="16" y="8" width="1" height="1" fill="#ffd269" />
          <rect x="17" y="8" width="1" height="1" fill={outlineColor} />
          <rect x="14" y="9" width="1" height="1" fill={outlineColor} />
          <rect x="15" y="9" width="1" height="1" fill="#ffd269" />
          <rect x="16" y="9" width="1" height="1" fill={outlineColor} />
          <rect x="14" y="10" width="2" height="1" fill={outlineColor} />
        </g>
      )}

      {/* Sound Wave 2 (Outer Arc) */}
      {showWave2 && (
        <g>
          <rect x="19" y="3" width="2" height="1" fill={outlineColor} />
          <rect x="19" y="4" width="1" height="1" fill={outlineColor} />
          <rect x="20" y="4" width="1" height="1" fill="#ffd269" />
          <rect x="21" y="4" width="1" height="1" fill={outlineColor} />
          <rect x="19" y="5" width="1" height="1" fill={outlineColor} />
          <rect x="20" y="5" width="1" height="1" fill="#ffd269" />
          <rect x="21" y="5" width="1" height="1" fill={outlineColor} />
          <rect x="20" y="6" width="1" height="1" fill={outlineColor} />
          <rect x="21" y="6" width="1" height="1" fill="#ffd269" />
          <rect x="22" y="6" width="1" height="1" fill={outlineColor} />
          <rect x="20" y="7" width="1" height="1" fill={outlineColor} />
          <rect x="21" y="7" width="1" height="1" fill="#ffd269" />
          <rect x="22" y="7" width="1" height="1" fill={outlineColor} />
          <rect x="20" y="8" width="1" height="1" fill={outlineColor} />
          <rect x="21" y="8" width="1" height="1" fill="#ffd269" />
          <rect x="22" y="8" width="1" height="1" fill={outlineColor} />
          <rect x="20" y="9" width="1" height="1" fill={outlineColor} />
          <rect x="21" y="9" width="1" height="1" fill="#ffd269" />
          <rect x="22" y="9" width="1" height="1" fill={outlineColor} />
          <rect x="19" y="10" width="1" height="1" fill={outlineColor} />
          <rect x="20" y="10" width="1" height="1" fill="#ffd269" />
          <rect x="21" y="10" width="1" height="1" fill={outlineColor} />
          <rect x="19" y="11" width="1" height="1" fill={outlineColor} />
          <rect x="20" y="11" width="1" height="1" fill="#ffd269" />
          <rect x="21" y="11" width="1" height="1" fill={outlineColor} />
          <rect x="19" y="12" width="2" height="1" fill={outlineColor} />
        </g>
      )}
    </svg>
  );
};

