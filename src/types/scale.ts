export type PlayerScale = 'mini' | 'standard' | 'large';

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
    label: 'COMPACT',
    subLabel: 'Mini (540×308)',
    width: 540,
    height: 308,
    maxW: 'w-[720px]',
  },
  standard: {
    id: 'standard',
    label: 'STANDARD',
    subLabel: 'Standard (720×410)',
    width: 720,
    height: 410,
    maxW: 'w-[720px]',
  },
  large: {
    id: 'large',
    label: 'EXPANDED',
    subLabel: 'Large (960×546)',
    width: 960,
    height: 546,
    maxW: 'w-[720px]',
  },
};
