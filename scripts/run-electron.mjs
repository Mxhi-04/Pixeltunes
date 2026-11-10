import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));

// On macOS, ensure the dev Electron app bundle displays the PixelTunes icon in the Dock
if (process.platform === 'darwin') {
  try {
    const sourceIcns = join(root, 'electron', 'assets', 'icon.icns');
    const targetIcns = join(root, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'Resources', 'electron.icns');
    if (existsSync(sourceIcns) && existsSync(targetIcns)) {
      copyFileSync(sourceIcns, targetIcns);
    }
  } catch {}
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), ['.', ...process.argv.slice(2)], { env, stdio: 'inherit' });

child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => { process.exitCode = code ?? 1; });

