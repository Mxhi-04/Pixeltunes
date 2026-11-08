import { expect, test, type Page } from '@playwright/test';

const trackId = '3n3Ppam7vgaVa1iaRUc9Lp';
const albumId = '1ATL5GLyefJaxhQzSPVrLX';
const playlistId = '37i9dQZF1DX4WYpdgoIcn6';
const track = { id: trackId, uri: `spotify:track:${trackId}`, name: 'Test Track',
  artists: [{ name: 'Test Artist' }], album: { name: 'Test Album', images: [] }, duration_ms: 180000 };
const queuedTrack = { ...track, id: '4uLU6hMCjMI75M1A2tKUQC',
  name: 'Queued Track', uri: 'spotify:track:4uLU6hMCjMI75M1A2tKUQC' };
const device = { id: 'device-1', name: 'Mock Spotify', type: 'Computer', is_active: true,
  is_restricted: false, volume_percent: 45, supports_volume: true };

async function connectMock(page: Page) {
  const plays: unknown[] = [];
  const seeks: string[] = [];
  let failPlay = false;
  let playing = false;
  let progress = 4300;
  let status = 200;
  let requests = 0;
  let refreshes = 0;
  let likedStatus = 200;
  let requireFreshAccess = false;
  let revokeRefresh = false;
  const queued: string[] = [];
  await page.addInitScript(() => localStorage.setItem('spotify_web_refresh_token', 'mock-refresh'));
  await page.route('https://accounts.spotify.com/api/token', async (route) => {
    refreshes++;
    if (revokeRefresh) {
      await route.fulfill({ status: 400, json: { error: 'invalid_grant' } });
      return;
    }
    await route.fulfill({ json: { access_token: `mock-access-${refreshes}`, expires_in: 3600 } });
  });
  await page.route('https://api.spotify.com/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (requireFreshAccess && request.headers().authorization !== 'Bearer mock-access-2') {
      return route.fulfill({ status: 401, json: { error: 'Expired access token' } });
    }
    switch (url.pathname) {
      case '/v1/me': return route.fulfill({ json: { id: 'mock-user', display_name: 'Test Listener' } });
      case '/v1/me/tracks': return route.fulfill({ status: likedStatus, json: { items: [{ track }] } });
      case '/v1/me/player/devices': return route.fulfill({ json: { devices: [device] } });
      case '/v1/me/player': {
        requests++;
        return route.fulfill({
          status, headers: status === 429 ? { 'Retry-After': '4' } : undefined,
          json: { device, item: track, progress_ms: progress, is_playing: playing, repeat_state: 'off', shuffle_state: false },
        });
      }
      case '/v1/me/player/queue':
        if (request.method() === 'POST') {
          queued.push(url.searchParams.get('uri')!);
          return route.fulfill({ status: 204 });
        }
        return route.fulfill({ json: { currently_playing: track, queue: queued.map(() => queuedTrack) } });
      case '/v1/me/player/play':
        plays.push(request.postDataJSON());
        if (failPlay) return route.fulfill({ status: 403, json: { error: 'Premium required' } });
        playing = true;
        return route.fulfill({ status: 204 });
      case '/v1/me/player/pause':
        playing = false;
        return route.fulfill({ status: 204 });
      case '/v1/me/player/seek':
        seeks.push(url.searchParams.get('position_ms')!);
        progress = Number(url.searchParams.get('position_ms'));
        return route.fulfill({ status: 204 });
      default: return route.fulfill({ status: 404 });
    }
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'SPOTIFY', exact: true })).toBeVisible();
  return { plays, seeks, queued, expireAccess: () => { requireFreshAccess = true; },
    revokeSession: () => { requireFreshAccess = true; revokeRefresh = true; }, setStatus: (next: number) => { status = next; }, pollCount: () => requests,
    refreshCount: () => refreshes, rejectPlay: () => { failPlay = true; }, failLibrary: () => { likedStatus = 503; } };
}

test('guests can normalize Spotify links and reject lookalike, unsafe, and unsupported URLs', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /continue in lo-fi/i }).click();
  await page.getByRole('button', { name: '+ SPOTIFY', exact: true }).click();
  const field = page.getByLabel('Spotify link or URI');
  const externalLink = page.getByRole('link', { name: /open in spotify/i });
  for (const unsafe of [
    `https://open.spotify.com.evil.test/track/${trackId}`,
    `https://evil.test@open.spotify.com/track/${trackId}`,
    `http://open.spotify.com/track/${trackId}`,
    'javascript:alert(1)',
    `https://open.spotify.com/artist/${trackId}`,
    'spotify:track:short',
  ]) {
    await field.fill(unsafe);
    await expect(externalLink).toHaveCount(0);
    await expect(page.getByText(/enter an open.spotify.com/i)).toBeVisible();
  }
  await field.fill(` https://open.spotify.com/intl-de/track/${trackId}?si=tracking `);
  await expect(externalLink).toHaveAttribute('href', `https://open.spotify.com/track/${trackId}`);
  await expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.getByRole('button', { name: 'Play link' })).toHaveCount(0);
});

test('Spotify Connect sends exact play payloads for track, album, and playlist links', async ({ page }) => {
  const mocked = await connectMock(page);
  await page.getByRole('button', { name: 'SPOTIFY', exact: true }).click();
  const field = page.getByLabel('Spotify link or URI');
  for (const value of [
    `https://open.spotify.com/track/${trackId}?si=abc`,
    `spotify:album:${albumId}`,
    `https://open.spotify.com/embed/playlist/${playlistId}`,
  ]) {
    await field.fill(value);
    await page.getByRole('button', { name: 'Play link' }).click();
    await expect(page.getByText('Playback started on your Spotify device.')).toBeVisible();
  }
  expect(mocked.plays).toEqual([
    { uris: [`spotify:track:${trackId}`] },
    { context_uri: `spotify:album:${albumId}` },
    { context_uri: `spotify:playlist:${playlistId}` },
  ]);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('main-play-btn')).toHaveAttribute('title', 'Pause');
  await expect(page.getByRole('link', { name: 'Open current track in Spotify' }))
    .toHaveAttribute('href', `https://open.spotify.com/track/${trackId}`);
});

test('Spotify artwork links to the track and a failed image falls back to generated art', async ({ page }) => {
  await connectMock(page);
  const artwork = 'https://i.scdn.co/image/pixeltunes-test-art';
  await page.route(artwork, (route) => route.fulfill({ contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="green"/></svg>' }));
  await page.route('https://api.spotify.com/v1/me/player?**', (route) => route.fulfill({
    json: { item: { ...track, album: { ...track.album, images: [{ url: artwork }] } },
      device, progress_ms: 0, is_playing: false, repeat_state: 'off', shuffle_state: false },
  }));
  await page.getByTitle('Menu / Settings').click();
  await page.getByRole('button', { name: /spotify art/i }).click();
  await page.keyboard.press('Escape');
  const image = page.getByRole('img', { name: 'Cover art for Test Track' });
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(40);
  await expect(page.getByRole('link', { name: 'Cover art for Test Track' })).toHaveAttribute('href',
    `https://open.spotify.com/track/${trackId}`);

  await page.unroute(artwork);
  await page.route(artwork, (route) => route.abort());
  await page.reload();
  await expect(page.getByRole('button', { name: 'SPOTIFY', exact: true })).toBeVisible();
  await expect(image).toHaveCount(0);
  await expect(page.locator('canvas[width="240"]')).toBeVisible();
});

test('a pasted track is queued without interrupting playback and appears in Up next', async ({ page }) => {
  const mocked = await connectMock(page);
  await page.getByRole('button', { name: 'SPOTIFY', exact: true }).click();
  await page.getByLabel('Spotify link or URI').fill(queuedTrack.uri);
  await page.getByRole('button', { name: 'Add to queue' }).click();
  await expect(page.getByText('Added to your Spotify queue.')).toBeVisible();
  expect(mocked.queued).toEqual([queuedTrack.uri]);
  expect(mocked.plays).toHaveLength(0);
  await page.keyboard.press('Escape');
  await page.getByTestId('toggle-playlist-btn').click();
  await page.getByRole('button', { name: 'Up next' }).click();
  const queue = page.getByRole('region', { name: 'Spotify queue' });
  await expect(queue.getByRole('link', { name: 'Open Queued Track in Spotify' }))
    .toHaveAttribute('href', `https://open.spotify.com/track/${queuedTrack.id}`);
});

test('an expired access token is refreshed and a revoked refresh token disconnects', async ({ page, context }) => {
  const mocked = await connectMock(page);
  await expect(page.getByTestId('main-play-btn')).toHaveAttribute('title', 'Play');
  mocked.expireAccess();
  await page.getByTestId('main-play-btn').click();
  await expect(page.getByTestId('main-play-btn')).toHaveAttribute('title', 'Pause');
  expect(mocked.refreshCount()).toBe(2);
  expect(mocked.plays).toHaveLength(1);

  const revokedPage = await context.newPage();
  const revoked = await connectMock(revokedPage);
  revoked.revokeSession();
  await revokedPage.getByTestId('main-play-btn').click();
  await expect(revokedPage.getByRole('dialog', { name: 'Connect Spotify' })).toContainText('Your Spotify session expired.');
  expect(await revokedPage.evaluate(() => localStorage.getItem('spotify_web_refresh_token'))).toBeNull();
});

test('Spotify playback keeps paused metadata, seeks with integer milliseconds, and reports failures', async ({ page }) => {
  const mocked = await connectMock(page);
  const play = page.getByTestId('main-play-btn');
  const position = page.getByRole('slider', { name: 'Playback position' });
  await expect(position).toHaveValue('4300');
  await expect(play).toHaveAttribute('title', 'Play');
  await expect(page.getByText('45%', { exact: true })).toBeVisible();
  await position.press('ArrowRight');
  await expect.poll(() => mocked.seeks).toEqual(['9300']);
  await expect(position).toHaveValue('9300');
  mocked.rejectPlay();
  await play.click();
  await expect(page.getByRole('status')).toContainText('Spotify could not complete');
  await expect(play).toHaveAttribute('title', 'Play');
  await expect(position).toHaveValue('9300');
});

test('rate-limited Spotify polling backs off and preserves the last confirmed track', async ({ page }) => {
  const mocked = await connectMock(page);
  await expect(page.getByRole('link', { name: 'Open current track in Spotify' })).toBeVisible();
  const initial = mocked.pollCount();
  mocked.setStatus(429);
  await expect.poll(() => mocked.pollCount()).toBeGreaterThan(initial);
  const requests = mocked.pollCount();
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 2300)));
  expect(mocked.pollCount()).toBe(requests);
  await expect(page.getByRole('link', { name: 'Open current track in Spotify' })).toBeVisible();
});

test('liked songs distinguish API errors and select only after Spotify accepts playback', async ({ page }) => {
  const mocked = await connectMock(page);
  await page.getByTestId('toggle-playlist-btn').click();
  await page.getByRole('button', { name: 'Liked songs', exact: true }).click();
  const region = page.getByRole('region', { name: 'Liked songs' });
  await expect(region.getByRole('button', { name: /test track/i })).toBeVisible();
  mocked.rejectPlay();
  await region.getByRole('button', { name: /test track/i }).click();
  await expect(region.getByRole('status')).toContainText('Could not play this track');
  mocked.failLibrary();
  await region.getByRole('button', { name: 'COVER', exact: true }).click();
  await page.getByTestId('toggle-playlist-btn').click();
  await page.getByRole('button', { name: 'Liked songs', exact: true }).click();
  await expect(region.getByRole('status')).toContainText('Could not load Liked Songs');
});

test('the Spotify drawer opens on playlists, loads additional pages, and plays a playlist', async ({ page }) => {
  const mocked = await connectMock(page);
  const secondId = '37i9dQZF1DXcBWIGoYBM5M';
  const offsets: string[] = [];
  await page.route('https://api.spotify.com/v1/me/playlists?**', async (route) => {
    const offset = new URL(route.request().url()).searchParams.get('offset')!;
    offsets.push(offset);
    const isFirst = offset === '0';
    const item = isFirst
      ? { id: playlistId, name: 'First Mix', uri: `spotify:playlist:${playlistId}` }
      : { id: secondId, name: 'Saved Mix', uri: `spotify:playlist:${secondId}` };
    await route.fulfill({ json: { items: [item], next: isFirst ? '/v1/me/playlists?offset=50&limit=50' : null } });
  });
  await page.getByTestId('toggle-playlist-btn').click();
  const drawer = page.getByRole('region', { name: 'Spotify playlists' });
  await expect(drawer.getByRole('button', { name: 'Play First Mix' })).toBeVisible();
  await drawer.getByRole('button', { name: 'Load more playlists' }).click();
  await expect(drawer.getByRole('button', { name: 'Play First Mix' })).toBeVisible();
  await expect(drawer.getByRole('link', { name: 'Open Saved Mix in Spotify' })).toHaveAttribute(
    'href', `https://open.spotify.com/playlist/${secondId}`);
  await drawer.getByRole('button', { name: 'Play Saved Mix' }).click();
  await expect.poll(() => mocked.plays).toEqual([{ context_uri: `spotify:playlist:${secondId}` }]);
  expect(offsets).toEqual(['0', '50']);
});

test('web OAuth checks state, exchanges a matching code once, and disconnects across reload', async ({ page }) => {
  let codeExchanges = 0;
  await page.route('https://accounts.spotify.com/authorize?**', async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:4173/callback');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/);
    await route.fulfill({ body: 'Mock Spotify consent', contentType: 'text/plain' });
  });
  await page.route('https://accounts.spotify.com/api/token', async (route) => {
    const body = new URLSearchParams(route.request().postData() || '');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code_verifier')).toMatch(/^[\w-]{86}$/);
    codeExchanges++;
    await route.fulfill({ json: { access_token: 'mock-access', refresh_token: 'mock-refresh', expires_in: 3600 } });
  });
  await page.route('https://api.spotify.com/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/v1/me') return route.fulfill({ json: { id: 'mock-user', display_name: 'Test Listener' } });
    if (path === '/v1/me/tracks') return route.fulfill({ json: { items: [] } });
    return route.fulfill({ status: 204 });
  });

  await page.goto('/callback?code=forged&state=wrong');
  await expect(page.getByText(/authorization request is invalid/i)).toBeVisible();
  expect(codeExchanges).toBe(0);
  await page.getByRole('button', { name: /connect spotify \(1-click\)/i }).click();
  await page.waitForURL('https://accounts.spotify.com/authorize?**');
  const state = new URL(page.url()).searchParams.get('state');
  expect(state).toMatch(/^[\w-]{43}$/);
  await page.goto(`/callback?code=mock-code&state=${state}`);
  await expect(page.getByRole('button', { name: 'SPOTIFY', exact: true })).toBeVisible();
  expect(codeExchanges).toBe(1);
  expect(new URL(page.url()).pathname).toBe('/');
  await page.getByRole('button', { name: 'SPOTIFY', exact: true }).click();
  await page.getByRole('button', { name: 'DISCONNECT', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('spotify_web_refresh_token'))).toBeNull();
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Connect Spotify' })).toBeVisible();
  expect(codeExchanges).toBe(1);
});
