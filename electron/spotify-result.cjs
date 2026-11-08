const crypto = require('node:crypto');
const themes = require('../src/types/themes.json');

const results = {
  connected: {
    code: 200, label: 'LINK ESTABLISHED', title: 'Spotify connected',
    detail: 'Your Spotify library and playback controls are ready in PixelTunes.',
    next: 'Close this tab and return to the player.',
  },
  cancelled: {
    code: 400, label: 'SIGN-IN CANCELLED', title: 'Connection cancelled',
    detail: 'Spotify sign-in was cancelled.',
    next: 'Return to PixelTunes to try again.',
  },
  forbidden: {
    code: 403, label: 'ACCESS RESTRICTED', title: 'Spotify access denied',
    detail: 'Spotify approved sign-in but denied playback access. Ask the app owner to allow your account or use your own Spotify Client ID in Spotify Setup.',
    next: 'Return to PixelTunes to check Spotify Setup.',
  },
  unavailable: {
    code: 502, label: 'CONNECTION INTERRUPTED', title: 'Could not connect',
    detail: 'PixelTunes could not verify Spotify access. Check your connection and retry.',
    next: 'Return to PixelTunes to try again.',
  },
  expired: {
    code: 400, label: 'LINK EXPIRED', title: 'Sign-in expired',
    detail: 'This Spotify authorization request is invalid or expired.',
    next: 'Start a new sign-in from PixelTunes.',
  },
};

function sendSpotifyResult(res, outcome, themeId, motion) {
  const result = results[outcome];
  const { bodyBg, windowBg, titleBarBg, primaryBorder, controlBtnText } = Object.hasOwn(themes, themeId)
    ? themes[themeId] : themes.inspo;
  const nonce = crypto.randomBytes(16).toString('base64');
  const connected = outcome === 'connected';
  res.writeHead(result.code, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': `default-src 'none'; style-src 'nonce-${nonce}'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
    'X-Content-Type-Options': 'nosniff',
  }).end(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${result.title} · PixelTunes</title>
<link rel="icon" href="/callback/logo.png" type="image/png">
<style nonce="${nonce}">
  * { box-sizing: border-box; }
  body {
    min-height: 100vh; min-height: 100svh; margin: 0; display: grid; place-items: center;
    padding: 1.5rem; color: #191244; font-family: ui-monospace, Menlo, Consolas, monospace;
    background-color: ${bodyBg};
    background-image: radial-gradient(${windowBg}55 1px, transparent 1px);
    background-size: 24px 24px;
  }
  main {
    width: min(100%, 32rem); background: #fffdf5; border: 3px solid ${primaryBorder};
    box-shadow: 7px 7px 0 ${windowBg}; overflow: hidden;
  }
  header {
    padding: .85rem 1rem; display: flex; align-items: center; gap: .75rem;
    background: ${titleBarBg}; color: ${controlBtnText};
    border-bottom: 3px solid ${primaryBorder}; font-weight: bold; letter-spacing: .1em;
  }
  .lights { display: flex; gap: .25rem; }
  .lights i { width: .65rem; height: .65rem; border-radius: 50%; border: 1px solid #191244; background: #ff93ae; }
  .lights i:nth-child(2) { background: #ffd269; }
  .lights i:nth-child(3) { background: #9df0cf; }
  .content { padding: clamp(1.1rem, 5vw, 2.5rem); text-align: center; }
  .disc {
    width: 6.5rem; height: 6.5rem; margin: 0 auto 1.3rem; display: grid; place-items: center;
    border: 2px solid ${primaryBorder}; box-shadow: 4px 4px 0 ${windowBg}; background: ${titleBarBg};
  }
  .disc img { width: 88%; height: 88%; object-fit: contain; }
  .badge {
    display: inline-block; padding: .38rem .6rem; border: 1px solid #191244;
    background: ${connected ? '#9df0cf' : '#ffd269'}; font-size: .73rem; font-weight: bold; letter-spacing: .08em;
  }
  h1 { font-size: clamp(1.45rem, 5vw, 2.15rem); line-height: 1.15; margin: .9rem 0 .75rem; }
  p { font-size: .95rem; line-height: 1.65; margin: 0; }
  footer {
    border-top: 2px solid ${primaryBorder}; padding: .85rem 1.1rem; text-align: center;
    background: ${titleBarBg}; color: ${controlBtnText}; font-size: .82rem; line-height: 1.5;
  }
  @media (prefers-reduced-motion: no-preference) {
    body.motion main { animation: appear .4s cubic-bezier(.2,.75,.25,1) both; }
    body.motion .disc { animation: bounce .55s .12s ease-out both; }
    @keyframes appear { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes bounce {
      from { transform: scale(.84) rotate(-8deg); }
      65% { transform: scale(1.08) rotate(4deg); }
      to { transform: scale(1) rotate(0); }
    }
  }
</style>
</head>
<body class="${motion === 'off' ? '' : 'motion'}">
<main>
  <header><span class="lights" aria-hidden="true"><i></i><i></i><i></i></span> PIXELTUNES</header>
  <div class="content">
    <div class="disc"><img src="/callback/logo.png" alt="" width="92" height="92"></div>
    <span class="badge">${result.label}</span>
    <h1>${result.title}</h1>
    <p>${result.detail}</p>
  </div>
  <footer>${result.next}</footer>
</main>
</body>
</html>`);
}

module.exports = { results, sendSpotifyResult };
