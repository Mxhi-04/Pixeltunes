import React from 'react';

interface PixelShuffleIconProps extends React.SVGProps<SVGSVGElement> {
  active?: boolean;
  color?: string;
}

export const PixelShuffleIcon: React.FC<PixelShuffleIconProps> = ({
  active = false,
  color = '#191244',
  ...props
}) => {
  return (
    <svg
      width="13"
      height="11"
      viewBox="0 0 13 11"
      fill={color}
      style={{ shapeRendering: 'crispEdges' }}
      className="select-none"
      {...props}
    >
      <rect x="9" y="0" width="1" height="1" />
      <rect x="9" y="1" width="2" height="1" />
      <rect x="0" y="2" width="4" height="1" />
      <rect x="8" y="2" width="4" height="1" />
      <rect x="4" y="3" width="1" height="1" />
      <rect x="8" y="3" width="3" height="1" />
      <rect x="5" y="4" width="1" height="1" />
      <rect x="7" y="4" width="1" height="1" />
      <rect x="9" y="4" width="1" height="1" />
      <rect x="6" y="5" width="1" height="1" />
      <rect x="5" y="6" width="1" height="1" />
      <rect x="7" y="6" width="1" height="1" />
      <rect x="9" y="6" width="1" height="1" />
      <rect x="4" y="7" width="1" height="1" />
      <rect x="8" y="7" width="3" height="1" />
      <rect x="0" y="8" width="4" height="1" />
      <rect x="8" y="8" width="4" height="1" />
      <rect x="9" y="9" width="2" height="1" />
      <rect x="9" y="10" width="1" height="1" />
    </svg>
  );
};

interface PixelRepeatIconProps extends React.SVGProps<SVGSVGElement> {
  mode?: 'off' | 'context' | 'track';
  color?: string;
}

export const PixelRepeatIcon: React.FC<PixelRepeatIconProps> = ({
  mode = 'off',
  color = '#191244',
  ...props
}) => {
  const isOne = mode === 'track';

  return (
    <svg
      width="12"
      height="11"
      viewBox="0 0 12 11"
      fill={color}
      style={{ shapeRendering: 'crispEdges' }}
      className="select-none"
      {...props}
    >
      {/* Cycling Arrows Loop */}
      <rect x="8" y="0" width="1" height="1" />
      <rect x="8" y="1" width="2" height="1" />
      <rect x="3" y="2" width="8" height="1" />
      <rect x="2" y="3" width="1" height="1" />
      <rect x="8" y="3" width="2" height="1" />
      <rect x="1" y="4" width="1" height="1" />
      <rect x="8" y="4" width="1" height="1" />
      <rect x="10" y="4" width="1" height="1" />
      <rect x="1" y="5" width="1" height="1" />
      <rect x="10" y="5" width="1" height="1" />
      <rect x="1" y="6" width="1" height="1" />
      <rect x="3" y="6" width="1" height="1" />
      <rect x="10" y="6" width="1" height="1" />
      <rect x="2" y="7" width="2" height="1" />
      <rect x="9" y="7" width="1" height="1" />
      <rect x="1" y="8" width="8" height="1" />
      <rect x="2" y="9" width="2" height="1" />
      <rect x="3" y="10" width="1" height="1" />

      {/* Pixel "1" badge for single track repeat */}
      {isOne && (
        <g fill={color}>
          <rect x="6" y="3" width="1" height="1" />
          <rect x="5" y="4" width="2" height="1" />
          <rect x="6" y="5" width="1" height="2" />
          <rect x="5" y="7" width="3" height="1" />
        </g>
      )}
    </svg>
  );
};

