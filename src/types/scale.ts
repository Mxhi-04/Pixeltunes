import playerSizes from './playerSizes.json';

export type PlayerScale = keyof typeof playerSizes;
export const SCALES = playerSizes;
export const PLAYER_SCALES = Object.keys(SCALES) as PlayerScale[];

export type PlayerLayoutMode = 'classic' | 'card';
export const PLAYER_LAYOUT_MODES: PlayerLayoutMode[] = ['classic', 'card'];
