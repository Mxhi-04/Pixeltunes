import { useState, useEffect } from 'react';

export type DetectedOS = 'mac' | 'windows' | 'other';

export interface OSInfo {
  os: DetectedOS;
  isMac: boolean;
  isWindows: boolean;
  name: string;
  recommendedArch: 'arm64' | 'x64';
}

export function detectOS(): OSInfo {
  if (typeof window === 'undefined') {
    return { os: 'mac', isMac: true, isWindows: false, name: 'macOS', recommendedArch: 'arm64' };
  }

  const nav = window.navigator as any;
  const platform = (
    nav.userAgentData?.platform ||
    nav.platform ||
    nav.userAgent ||
    ''
  ).toLowerCase();

  const isMac = platform.includes('mac') || platform.includes('darwin') || platform.includes('iphone') || platform.includes('ipad');
  const isWindows = platform.includes('win');

  if (isWindows) {
    return {
      os: 'windows',
      isMac: false,
      isWindows: true,
      name: 'Windows',
      recommendedArch: 'x64',
    };
  }

  // Default to macOS as primary if Mac or ambiguous
  return {
    os: 'mac',
    isMac: true,
    isWindows: false,
    name: 'macOS',
    recommendedArch: 'arm64',
  };
}

export function useOperatingSystem(): OSInfo {
  const [info, setInfo] = useState<OSInfo>(() => detectOS());

  useEffect(() => {
    setInfo(detectOS());
  }, []);

  return info;
}

