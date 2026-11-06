export type PlayerScale = 'mini' | 'standard' | 'large' | 'xlarge';

export interface ScaleConfig {
  id: PlayerScale;
  label: string;
  subLabel: string;
  width: number;
  height: number;
  maxW: string;
}

export const SCALES: Record<PlayerScale, ScaleConfig> = {
  mini: {
    id: 'mini',
    label: 'MINI',
    subLabel: 'Compact (0.75x)',
    width: 540,
    height: 308,
    maxW: 'w-[720px]',
  },
  standard: {
    id: 'standard',
    label: '1x',
    subLabel: 'Standard (1.0x)',
    width: 720,
    height: 410,
    maxW: 'w-[720px]',
  },
  large: {
    id: 'large',
    label: '1.3x',
    subLabel: 'Large (1.33x)',
    width: 960,
    height: 546,
    maxW: 'w-[720px]',
  },
  xlarge: {
    id: 'xlarge',
    label: '1.7x',
    subLabel: 'Hi-Fi (1.67x)',
    width: 1200,
    height: 683,
    maxW: 'w-[720px]',
  },
};

