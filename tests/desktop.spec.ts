import { _electron as electron, expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const personalClientId = '0123456789abcdef0123456789abcdef';

test('Electron sandbox, window controls, and loopback OAuth work with an isolated profile', async ({ browser }, testInfo) => {
  const userData = testInfo.outputPath('profile');
  await mkdir(userData, { recursive: true });
  const { ELECTRON_RUN_AS_NODE, ...env } = process.env;
  const app = await electron.launch({ args: ['.', `--user-data-dir=${userData}`], env });
  try {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    const prefs = await app.evaluate(({ app, BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      const preferences = window.webContents.getLastWebPreferences();
      return { userData: app.getPath('userData'), sandbox: preferences.sandbox,
        contextIsolation: preferences.contextIsolation, nodeIntegration: preferences.nodeIntegration,
        webSecurity: preferences.webSecurity };
    });
    expect(prefs).toEqual({ userData, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true });
    const connect = page.getByRole('dialog', { name: 'Connect Spotify' });
    await expect(connect).toBeVisible();
    if (process.platform === 'darwin') {
      const visible = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible());
      const show = () => app.evaluate(({ app, Tray }) => {
        const original = Tray.prototype.getBounds;
        Tray.prototype.getBounds = function () {
          (globalThis as typeof globalThis & { testTray?: typeof this }).testTray = this;
          return original.call(this);
        };
        try { app.emit('activate'); } finally { Tray.prototype.getBounds = original; }
      });
      expect(await visible()).toBe(false);
      expect(await app.evaluate(({ app, nativeImage }) => {
        const icon = nativeImage.createFromPath(`${app.getAppPath()}/electron/assets/PixelTunesTemplate.png`);
        const bitmap = icon.toBitmap({ scaleFactor: 2 });
        return {
          template: icon.isTemplateImage(),
          scales: icon.getScaleFactors(),
          hasArtwork: bitmap.some((value, index) => index % 4 === 3 && value === 255),
          hasTransparentCorner: bitmap[3] === 0,
        };
      })).toEqual({ template: true, scales: [1, 2], hasArtwork: true, hasTransparentCorner: true });

      await show();
      await expect.poll(visible).toBe(true);
      await connect.getByRole('button', { name: /continue in lo-fi/i }).click();
      const play = page.getByTestId('main-play-btn');
      await play.click();
      await page.getByRole('button', { name: 'Hide to Menu Bar' }).click();
      await expect.poll(visible).toBe(false);
      await expect.poll(async () => Number(await page.getByRole('slider', { name: 'Playback position' }).inputValue()))
        .toBeGreaterThan(0);
      await show();
      await expect.poll(visible).toBe(true);
      await expect(play).toHaveAttribute('title', 'Pause');
      await page.getByRole('button', { name: 'Close Window' }).click();
      await expect.poll(visible).toBe(false);
      await show();
      await page.reload();
      await expect(connect).toBeVisible();
    }

    const callback = 'http://127.0.0.1:8888';
    for (const endpoint of ['/login', '/api/eval', '/api/capture', '/api/auth/refresh', '/api/auth/logout']) {
      const result = await fetch(callback + endpoint);
      expect(result.status).toBe(404);
      expect(result.headers.get('Access-Control-Allow-Origin')).toBeNull();
    }
    const forged = await fetch(callback + '/callback?code=forged&state=wrong');
    expect(forged.status).toBe(400);

    await app.evaluate(({ shell, safeStorage }) => {
      const state = globalThis as typeof globalThis & {
        testUrl?: string; testTokenBody?: string; allowSpotify?: boolean; testSavedSession?: string;
      };
      shell.openExternal = async (url) => { state.testUrl = url; };
      safeStorage.isAsyncEncryptionAvailable = async () => true;
      safeStorage.getSelectedStorageBackend = () => 'gnome_libsecret';
      safeStorage.encryptStringAsync = async (plainText) => {
        state.testSavedSession = plainText;
        return Buffer.from('fake-encrypted-blob');
      };
      safeStorage.decryptStringAsync = async () => ({ result: 'restored-refresh', shouldReEncrypt: false });
      globalThis.fetch = async (input, init) => {
        if (input === 'https://api.spotify.com/v1/me/player/devices') {
          return new Response(null, { status: state.allowSpotify ? 204 : 403 });
        }
        if (input === 'https://accounts.spotify.com/api/token') {
          state.testTokenBody = String(init?.body);
          return Response.json({ access_token: 'mock-native-token', refresh_token: 'mock-native-refresh', expires_in: 3600 });
        }
        return new Response(null, { status: 404 });
      };
    });
    await page.route('https://api.spotify.com/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/v1/me') return route.fulfill({ json: { id: 'native-user', display_name: 'Native Test' } });
      if (path === '/v1/me/tracks') return route.fulfill({ json: { items: [] } });
      return route.fulfill({ status: 204 });
    });
    await page.getByRole('button', { name: /connect spotify \(1-click\)/i }).click();
    const authorization = await app.evaluate(() => (globalThis as typeof globalThis & { testUrl: string }).testUrl);
    const params = new URL(authorization).searchParams;
    expect(params.get('redirect_uri')).toBe(callback + '/callback');
    expect(params.get('code_challenge_method')).toBe('S256');

    const denied = await fetch(callback + `/callback?code=denied-code&state=${params.get('state')}`);
    expect(denied.status).toBe(403);
    expect(new URL(denied.url).pathname).toBe('/callback/result');
    expect(denied.url).not.toContain('denied-code');
    await expect(connect.getByRole('status')).toContainText('Spotify approved sign-in but denied playback access');
    await expect(connect.getByRole('button', { name: /reopen spotify/i })).toHaveCount(0);

    await connect.getByRole('button', { name: 'Spotify Setup' }).click();
    const setup = page.getByRole('dialog', { name: 'Spotify', exact: true });
    await setup.getByLabel('Spotify Client ID').fill(personalClientId);
    await page.evaluate(() => {
      localStorage.setItem('pixeltunes_theme', 'mint');
      localStorage.setItem('pixeltunes_motion', 'off');
    });
    await app.evaluate(() => { (globalThis as typeof globalThis & { allowSpotify?: boolean }).allowSpotify = true; });
    await setup.getByRole('button', { name: /connect my spotify/i }).click();
    const personalParams = new URL(await app.evaluate(() =>
      (globalThis as typeof globalThis & { testUrl: string }).testUrl)).searchParams;
    expect(personalParams.get('client_id')).toBe(personalClientId);
    const accepted = await fetch(callback + `/callback?code=mock-code&state=${personalParams.get('state')}`);
    expect(accepted.status).toBe(200);
    expect(accepted.url).toBe(callback + '/callback/result?status=connected&theme=mint&motion=off');
    expect(accepted.headers.get('Content-Type')).toContain('text/html');
    expect(accepted.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    const result = await browser.newPage();
    await result.goto(accepted.url);
    await expect(result.getByRole('heading', { name: 'Spotify connected' })).toBeVisible();
    await expect(result.locator('body')).toHaveCSS('background-color', 'rgb(16, 39, 32)');
    await expect(result.locator('main')).toHaveCSS('animation-name', 'none');
    await expect.poll(() => result.locator('.disc img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await result.goto(callback + '/callback/result?status=connected');
    await result.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(result.locator('main')).toHaveCSS('animation-name', 'appear');
    await result.emulateMedia({ reducedMotion: 'reduce' });
    await expect(result.locator('main')).toHaveCSS('animation-name', 'none');
    await result.close();
    const replay = await fetch(callback + `/callback?code=mock-code&state=${personalParams.get('state')}`);
    expect(replay.status).toBe(400);

    const tokenBody = new URLSearchParams(await app.evaluate(() =>
      (globalThis as typeof globalThis & { testTokenBody: string }).testTokenBody));
    expect(createHash('sha256').update(tokenBody.get('code_verifier')!).digest('base64url'))
      .toBe(personalParams.get('code_challenge'));
    expect(tokenBody.get('client_id')).toBe(personalClientId);
    await expect.poll(async () => await readFile(`${userData}/spotify_refresh.token`, 'utf8').catch(() => ''))
      .toBe('fake-encrypted-blob');
    expect(JSON.parse(await app.evaluate(() =>
      (globalThis as typeof globalThis & { testSavedSession: string }).testSavedSession))).toEqual({
      clientId: personalClientId, refreshToken: 'mock-native-refresh',
    });

    await expect(page.getByRole('dialog', { name: 'Spotify background launch' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByTitle('Menu / Settings').click();
    await page.getByRole('button', { name: /compact/i }).click();
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getSize()))
      .toEqual([540, 308]);

    if (process.platform === 'darwin') {
      const labels = await app.evaluate(({ Tray, Menu }) => {
        const tray = (globalThis as typeof globalThis & { testTray: InstanceType<typeof Tray> }).testTray;
        const popup = tray.popUpContextMenu;
        let menu: InstanceType<typeof Menu> | undefined;
        tray.popUpContextMenu = (value) => { menu = value; };
        try { tray.emit('right-click'); } finally { tray.popUpContextMenu = popup; }
        const sizes = menu!.items.find((item) => item.label === 'Window Size')!.submenu!.items;
        sizes.find((item) => item.label.startsWith('Tiny'))!.click();
        return menu!.items.map((item) => item.label);
      });
      expect(labels).toEqual(expect.arrayContaining(['Window Size', 'Keep Player on Top', 'Open Spotify']));
      await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getSize()))
        .toEqual([480, 273]);
      await expect.poll(() => page.evaluate(() => localStorage.getItem('pixeltunes_scale'))).toBe('tiny');
    }

    await page.evaluate(() => window.electronAPI!.authLogout!());
    expect(await readFile(`${userData}/spotify_client_id`, 'utf8')).toBe(personalClientId);
    await page.evaluate(() => window.electronAPI!.authLogin!());
    const reconnectParams = new URL(await app.evaluate(() =>
      (globalThis as typeof globalThis & { testUrl: string }).testUrl)).searchParams;
    expect(reconnectParams.get('client_id')).toBe(personalClientId);
    await writeFile(`${userData}/spotify_refresh.token`, 'mock-encrypted-persisted-session');
    await page.evaluate(() => window.electronAPI!.authRefresh!());
    const refreshBody = new URLSearchParams(await app.evaluate(() =>
      (globalThis as typeof globalThis & { testTokenBody: string }).testTokenBody));
    expect(refreshBody.get('grant_type')).toBe('refresh_token');
    expect(refreshBody.get('refresh_token')).toBe('restored-refresh');
  } finally {
    await app.close();
  }
});
