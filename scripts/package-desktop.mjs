import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packager } from '@electron/packager';

const [, , platform, requestedArch] = process.argv;
const isMac = platform === 'darwin';
const arch = requestedArch ?? process.arch;
if (platform !== 'win32' && !isMac) throw new Error('Choose darwin or win32.');
if (isMac && process.platform !== 'darwin') throw new Error('The macOS bundle must be built on a Mac.');
if (!['x64', 'arm64'].includes(arch)) throw new Error('Choose x64 or arm64.');

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const sourcePackage = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const staging = await mkdtemp(join(tmpdir(), 'pixeltunes-package-'));

async function createMacIcon() {
  const iconset = join(staging, 'PixelTunes.iconset');
  const artwork = join(root, 'assets', 'pixeltunes-icon.png');
  const icon = join(staging, 'PixelTunes.icns');
  await mkdir(iconset);
  for (const size of [16, 32, 128, 256, 512]) {
    for (const scale of [1, 2]) {
      const pixels = String(size * scale);
      const suffix = scale === 2 ? '@2x' : '';
      const output = join(iconset, `icon_${size}x${size}${suffix}.png`);
      execFileSync('sips', ['-z', pixels, pixels, artwork, '--out', output]);
    }
  }
  execFileSync('iconutil', ['--convert', 'icns', '--output', icon, iconset]);
  return icon;
}

async function createWindowsIcon() {
  const sizes = [16, 32, 192];
  const images = await Promise.all(['favicon-16x16.png', 'favicon-32x32.png', 'icon-192.png']
    .map((file) => readFile(join(root, 'public', file))));
  const directory = Buffer.alloc(6 + images.length * 16);
  directory.writeUInt16LE(1, 2); // ICO image type
  directory.writeUInt16LE(images.length, 4);
  let offset = directory.length;
  for (const [index, image] of images.entries()) {
    const entry = 6 + index * 16;
    directory[entry] = sizes[index];
    directory[entry + 1] = sizes[index];
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(image.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  }
  const icon = join(staging, 'PixelTunes.ico');
  await writeFile(icon, Buffer.concat([directory, ...images]));
  return icon;
}

try {
  const appSource = join(staging, 'app');
  const icon = await (isMac ? createMacIcon() : createWindowsIcon());
  await mkdir(join(appSource, 'src', 'types'), { recursive: true });

  await Promise.all([
    cp(join(root, 'dist'), join(appSource, 'dist'), { recursive: true }),
    cp(join(root, 'electron'), join(appSource, 'electron'), { recursive: true }),
    cp(join(root, 'src/types/playerSizes.json'), join(appSource, 'src/types/playerSizes.json')),
    cp(join(root, 'src/types/themes.json'), join(appSource, 'src/types/themes.json')),
    cp(join(root, 'LICENSE'), join(appSource, 'LICENSE')),
    writeFile(join(appSource, 'package.json'), JSON.stringify({
      name: sourcePackage.name,
      version: sourcePackage.version,
      main: sourcePackage.main,
      config: { spotifyClientId: process.env.VITE_SPOTIFY_CLIENT_ID },
    })),
  ]);

  const [output] = await packager({
    dir: appSource,
    out: join(root, 'release'),
    name: 'PixelTunes',
    platform,
    arch,
    electronVersion: require('electron/package.json').version,
    electronZipDir: process.env.PIXELTUNES_ELECTRON_ZIP_DIR,
    icon: isMac ? [icon] : icon,
    asar: true,
    ...(isMac ? {
      appBundleId: 'io.github.mxhi04.pixeltunes',
      appCategoryType: 'public.app-category.music',
      extendInfo: { LSUIElement: true },
      osxSign: {
        identity: '-',
        identityValidation: false,
        preAutoEntitlements: false,
        continueOnError: false,
        optionsForFile: () => ({ hardenedRuntime: false }),
      },
    } : { win32metadata: { CompanyName: 'PixelTunes', ProductName: 'PixelTunes' } }),
    overwrite: true,
  });

  console.log(join(output, isMac ? 'PixelTunes.app' : 'PixelTunes.exe'));
} finally {
  await rm(staging, { recursive: true, force: true });
}
