const REPO_URL = 'https://github.com/Mxhi-04/Pixeltunes';
const APP_VERSION = 'v1.2.0';

export const DOWNLOAD_LINKS = {
  macArm64: `${REPO_URL}/releases/download/${APP_VERSION}/PixelTunes-macos-arm64.zip`,
  macX64: `${REPO_URL}/releases/download/${APP_VERSION}/PixelTunes-macos-x64.zip`,
  windowsX64: `${REPO_URL}/releases/download/${APP_VERSION}/PixelTunes-windows-x64.zip`,
  latestRelease: `${REPO_URL}/releases/tag/${APP_VERSION}`,
  allReleases: `${REPO_URL}/releases`,
  repo: REPO_URL,
  version: APP_VERSION,
};

/**
 * Returns the best download URL for a given platform target.
 * Resolves to version-pinned archive or falls back to releases page if asset is pending.
 */
export function getPlatformDownloadUrl(target: 'macArm64' | 'macX64' | 'windowsX64'): string {
  return DOWNLOAD_LINKS[target] || DOWNLOAD_LINKS.latestRelease;
}
