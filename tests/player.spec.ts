import { expect, test, type Page } from '@playwright/test';

async function openGuest(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /continue in lo-fi/i }).click();
}

const settings = (page: Page) => page.getByTitle('Menu / Settings');
const play = (page: Page) => page.getByTestId('main-play-btn');
const position = (page: Page) => page.getByRole('slider', { name: 'Playback position' });
const trackPanel = (page: Page) => page.getByRole('region', { name: 'Lo-fi library' });

test('lo-fi play, pause, volume, keyboard seek, library, shuffle, and repeat work together', async ({ page }) => {
  await openGuest(page);
  await play(page).click();
  await expect(play(page)).toHaveAttribute('title', 'Pause');
  await expect.poll(async () => Number(await position(page).inputValue())).toBeGreaterThan(0);
  await play(page).click();
  await expect(play(page)).toHaveAttribute('title', 'Play');
  const before = Number(await position(page).inputValue());
  await position(page).press('ArrowRight');
  await expect(position(page)).toHaveValue(String(before + 5000));
  await page.getByRole('button', { name: 'Fast Forward 10s' }).click();
  await expect(position(page)).toHaveValue(String(before + 15000));
  await page.getByRole('button', { name: 'Volume 40%' }).click();
  await page.keyboard.press('m');
  await expect(page.getByText('0%', { exact: true })).toBeVisible();
  await page.keyboard.press('m');
  await expect(page.getByText('40%', { exact: true })).toBeVisible();

  await page.getByTestId('toggle-playlist-btn').click();
  const midnight = trackPanel(page).getByRole('button', { name: /midnight orbit/i });
  await midnight.focus();
  await midnight.press('Space');
  await expect(midnight).toHaveAttribute('aria-current', 'true');
  await expect(play(page)).toHaveAttribute('title', 'Pause');

  await page.getByRole('button', { name: 'Shuffle: OFF' }).click();
  await expect(page.getByRole('button', { name: 'Shuffle: ON' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Next Track' }).click();
  await expect(midnight).not.toHaveAttribute('aria-current', 'true');

  await page.getByRole('button', { name: 'Repeat: OFF' }).click();
  await page.getByRole('button', { name: 'Repeat: CONTEXT' }).click();
  await position(page).press('End');
  await expect.poll(async () => Number(await position(page).inputValue())).toBeLessThan(5000);
  await expect(play(page)).toHaveAttribute('title', 'Pause');
});

test('dialogs trap focus, block playback shortcuts, and restore focus on Escape', async ({ page }) => {
  await openGuest(page);
  await settings(page).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(play(page)).toHaveAttribute('title', 'Play');
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'APPLY & CLOSE', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: /back/i })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(settings(page)).toBeFocused();
});

test('all seven palettes render and settings persist across reload', async ({ page }) => {
  await openGuest(page);
  await settings(page).click();
  const paletteNames = ['Pastel Inspo (Original)', 'Bubblegum Dream', 'Cyber Vaporwave', 'GameBoy Classic',
    'Moonlight Arcade', 'Mint Circuit', 'Amber Terminal'];
  const colors = new Set<string>();
  for (const name of paletteNames) {
    const palette = page.getByRole('button', { name, exact: true });
    await palette.click();
    await expect(palette).toHaveAttribute('aria-pressed', 'true');
    colors.add(await page.locator('[data-theme]').evaluate((element) => getComputedStyle(element).backgroundColor));
  }
  expect(colors.size).toBe(paletteNames.length);
  const amberPalette = page.getByRole('button', { name: 'Amber Terminal', exact: true });
  await amberPalette.click();

  await page.getByRole('button', { name: /spotify art/i }).click();
  const retroCoverOff = page.getByRole('button', { name: 'OFF', exact: true });
  await retroCoverOff.click();
  await page.getByLabel('CRT scanlines:').uncheck();
  await page.getByLabel('8-bit audio FX:').uncheck();
  await page.getByRole('button', { name: /compact/i }).click();
  await page.reload();
  await page.getByRole('button', { name: /continue in lo-fi/i }).click();
  await expect(page.locator('[data-theme]')).toHaveAttribute('data-theme', 'amber');
  await expect(page.locator('.crt-overlay')).toHaveCount(0);
  await settings(page).click();
  await expect(page.getByLabel('8-bit audio FX:')).not.toBeChecked();
  await expect(page.getByRole('button', { name: /compact/i })).toHaveAttribute('aria-pressed', 'true');
});

test('motion preference freezes cassette and cover GIFs and tracks OS changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGuest(page);
  const root = page.locator('[data-motion]');
  await expect(root).toHaveAttribute('data-motion', 'off');
  const cover = page.getByRole('button', { name: /shuffle pixel cover/i });
  let title = '';
  for (let i = 0; i < 25; i++) {
    title = await cover.getAttribute('title') ?? '';
    if (title.includes('Nyan Cat')) break;
    await cover.click();
  }
  expect(title).toContain('Nyan Cat');
  await expect(cover.locator('img')).toHaveCount(0);
  await expect(cover.locator('canvas')).toBeVisible();
  await page.waitForTimeout(300);
  const frozen = await cover.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await expect.poll(() => cover.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(frozen);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(cover.locator('img')).toHaveJSProperty('complete', true);

  await settings(page).click();
  await page.getByRole('button', { name: /cassette/i }).click();
  await page.keyboard.press('Escape');
  await play(page).click();
  const cassette = page.locator('canvas[width="240"]');
  const pixels = () => cassette.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  const animatedFrame = await pixels();
  await expect.poll(pixels).not.toBe(animatedFrame);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(root).toHaveAttribute('data-motion', 'off');
  const staticFrame = await pixels();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await pixels()).toBe(staticFrame);
  await expect(page.locator('.animate-pixel-spark')).toHaveCount(0);
});

test('all 23 covers are reachable in one cycle and every GIF decodes', async ({ page }) => {
  await openGuest(page);
  await play(page).click();
  const cover = page.getByRole('button', { name: /shuffle pixel cover/i });
  await expect(cover).toHaveAttribute('title', 'Pixel Cover: Moon Bunny');
  const seen = new Set<string>();
  let gifs = 0;
  for (let i = 0; i < 23; i++) {
    const title = (await cover.getAttribute('title'))!;
    expect(seen.has(title)).toBe(false);
    seen.add(title);
    const gif = cover.locator('img');
    if (await gif.count()) {
      await expect.poll(() => gif.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(240);
      gifs++;
    }
    await cover.click();
  }
  expect(gifs).toBe(20);
  await expect(cover).toHaveAttribute('title', 'Pixel Cover: Moon Bunny');
});

test('narrow browser layout keeps controls inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 500 });
  await openGuest(page);
  const box = await play(page).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(280);
  await settings(page).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
