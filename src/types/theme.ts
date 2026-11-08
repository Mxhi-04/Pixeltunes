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
  windowBorder?: string;
  windowText?: string;
  titleBarText?: string;
  cassetteBody?: string;
}

export type Theme = RetroTheme;

export const THEMES: Record<string, RetroTheme> = Object.fromEntries(
  Object.entries(themes).map(([k, t]) => [
    k,
    {
      ...t,
      windowBorder: t.primaryBorder,
      windowText: t.textColor,
      titleBarText: t.textColor,
      cassetteBody: t.controlBtnBg,
    },
  ])
);
