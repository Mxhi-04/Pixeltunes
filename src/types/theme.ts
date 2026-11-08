import themes from './themes.json';

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

export const THEMES: Record<string, RetroTheme> = themes;
