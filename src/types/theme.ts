export interface RetroTheme {
  id: string;
  name: string;
  bodyBg: string;
  windowBg: string;
  titleBarBg: string;
  primaryBorder: string;
  textColor: string;
  accentPink: string;
  accentPeriwinkle: string;
  accentNavy: string;
  controlBtnBg: string;
  controlBtnText: string;
}

export const THEMES: Record<string, RetroTheme> = {
  inspo: {
    id: 'inspo',
    name: 'Pastel Inspo (Original)',
    bodyBg: '#120e29',
    windowBg: '#8fa2d4',
    titleBarBg: '#fec5db',
    primaryBorder: '#191244',
    textColor: '#191244',
    accentPink: '#fec5db',
    accentPeriwinkle: '#8fa2d4',
    accentNavy: '#191244',
    controlBtnBg: '#fec5db',
    controlBtnText: '#191244',
  },
  bubblegum: {
    id: 'bubblegum',
    name: 'Bubblegum Dream',
    bodyBg: '#1f132e',
    windowBg: '#ffb8d1',
    titleBarBg: '#b3f2dd',
    primaryBorder: '#361545',
    textColor: '#361545',
    accentPink: '#ff9ebb',
    accentPeriwinkle: '#a8d5e5',
    accentNavy: '#361545',
    controlBtnBg: '#b3f2dd',
    controlBtnText: '#361545',
  },
  vaporwave: {
    id: 'vaporwave',
    name: 'Cyber Vaporwave',
    bodyBg: '#090514',
    windowBg: '#472b7a',
    titleBarBg: '#ff53a5',
    primaryBorder: '#0b001a',
    textColor: '#00f6ff',
    accentPink: '#ff53a5',
    accentPeriwinkle: '#6b3ebd',
    accentNavy: '#0b001a',
    controlBtnBg: '#ff53a5',
    controlBtnText: '#0b001a',
  },
  gameboy: {
    id: 'gameboy',
    name: 'GameBoy Classic',
    bodyBg: '#1b2612',
    windowBg: '#8bac0f',
    titleBarBg: '#9bbc0f',
    primaryBorder: '#0f380f',
    textColor: '#0f380f',
    accentPink: '#9bbc0f',
    accentPeriwinkle: '#8bac0f',
    accentNavy: '#0f380f',
    controlBtnBg: '#9bbc0f',
    controlBtnText: '#0f380f',
  },
};

