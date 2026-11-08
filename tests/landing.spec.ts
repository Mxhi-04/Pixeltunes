import { expect, test } from '@playwright/test';

test('landing page renders SOTA hero, dynamic OS-aware download buttons, and interactive sections', async ({ page }) => {
  await page.goto('/?landing=1');

  // Verify Hero headline
  await expect(page.getByRole('heading', { level: 1 })).toContainText('YOUR MUSIC, REIMAGINED IN');

  // Verify Download Buttons presence
  const macBtn = page.getByRole('link', { name: /download for macos/i }).first();
  const winBtn = page.getByRole('link', { name: /download for windows/i }).first();
  await expect(macBtn).toBeVisible();
  await expect(winBtn).toBeVisible();

  // Verify that on Mac, Mac button is placed on the left / recommended
  const isMac = process.platform === 'darwin';
  if (isMac) {
    await expect(page.getByText('RECOMMENDED FOR YOUR MAC').first()).toBeVisible();
  }

  // Verify interactive demo controls
  const playDemoBtn = page.getByRole('button', { name: /play demo|pause lo-fi/i }).first();
  await expect(playDemoBtn).toBeVisible();
  await playDemoBtn.click();
  await expect(page.getByRole('button', { name: /pause lo-fi/i }).first()).toBeVisible();
  await playDemoBtn.click();
  await expect(page.getByRole('button', { name: /play demo/i }).first()).toBeVisible();

  // Verify 7 Themes Matrix interaction
  const gameboyThemeBtn = page.locator('#themes').getByRole('button', { name: /gameboy/i });
  await gameboyThemeBtn.scrollIntoViewIfNeeded();
  await gameboyThemeBtn.click();
  await expect(page.getByText('GAMEBOY CLASSIC RETRO PALETTE')).toBeVisible();

  // Verify FAQ is visible by default for the first item
  await expect(page.getByText(/you can use pixeltunes in 100% offline lo-fi mode/i)).toBeVisible();

  // Verify Navigation links
  await expect(page.getByRole('link', { name: 'PREVIEW' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'FEATURES' })).toBeVisible();
  await expect(page.getByRole('link', { name: '7 THEMES' })).toBeVisible();
});
