# 📻 PIXELTUNES — Aesthetic Retro Pixel Music Player

[![Vercel](https://img.shields.io/badge/Vercel-Live%20Demo-black?style=for-the-badge&logo=vercel)](https://pixeltunes.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/Mxhi-04/pixeltunes)

🎮 **Live Web Application:** [https://pixeltunes.vercel.app](https://pixeltunes.vercel.app)  
📦 **GitHub Repository:** [https://github.com/Mxhi-04/pixeltunes](https://github.com/Mxhi-04/pixeltunes)

An authentic retro, pixel-art music player inspired by nostalgic 90s OS aesthetics, featuring dynamic Spotify Connect controls, 8-bit synthesizer audio fallback, animated pixel art scenes, custom pixel cursors with click sparks, border-fitted playlist queue, and real-time spectrum analysis. Built for both desktop (macOS Electron) and the Web (Vercel).

---

## ✨ Features

- **Iconic Retro UI:**
  - Double-framed pixel window styled after early Mac / classic desktop operating systems with locked 720×410 retro geometry.
  - Pastel pink (`#fec5db`), soft periwinkle blue (`#8fa2d4`), and deep indigo navy (`#191244`) palette precisely crafted to match the inspiration artwork.
  - Three glossy candy buttons on top-left.
  - Retro typography using Google Pixel fonts (`Press Start 2P`, `Silkscreen`, `Pixelify Sans`).
  - Custom solid white 18px retro cursor with dynamic click sparks and soft click sound effects.

- **🎵 Full Spotify Integration:**
  - Seamless auto-play: wake Spotify in background and play immediately without opening Spotify first.
  - Client-side **OAuth 2.0 PKCE** flow with automatic token refresh (no backend secrets required).
  - Basic & advanced controls:
    - **Play / Pause / Next / Previous / Stop**
    - **Progress Scrubber (Click / Seek anywhere along track)**
    - **Volume Slider & Mute Toggle**
    - **Shuffle & Repeat Cycle**
  - Real-time polling of current Spotify playback (track title, artist name, album name, duration, active device).
  - Border-fitted playlist view displaying currently playing song and upcoming tracks with click-to-play without glitching.

- **🎨 Multi-Mode Pixel Art Screen:**
  - **Spotify Pixel Cover:** Live canvas shader that takes whatever album cover is currently playing on Spotify, downsizes it to authentic pixel art, and applies retro palette quantization.
  - **Playlist View:** Flush border-fitted track list with live progress and instant playback selection.

- **📻 Built-in 8-Bit Lo-Fi Radio:**
  - Even without connecting Spotify, the player is 100% playable out of the box with procedural Web Audio synth tracks.
  - Real-time pixel equalizer visualizer bars.

---

## 🚀 Running Locally

### Web Browser Mode (Vite)
```bash
npm install
npm run dev
```

### Desktop App (macOS Electron)
```bash
npm run electron
# or for full production build
npm run app
```

---

## 🌐 Deploy to Vercel

```bash
vercel deploy --prod
```

---

## 🎧 Connecting to Spotify (30 Seconds Setup)

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Log in and click **"Create app"**:
   - **App Name:** `Pixel Music Player`
   - **App Description:** `Aesthetic Retro Pixel Player`
   - **Redirect URI:** `http://localhost:5173/` (or click the **COPY** button inside the in-app Spotify modal)
   - Which API/SDKs are you planning to use: check **Web API**.
3. Save the app and copy your **Client ID**.
4. In the Pixel Player, click **"+ CONNECT SPOTIFY"**, paste your Client ID, and click **"CONNECT SPOTIFY"**.
5. Once authorized, play music on your Spotify app (desktop, web, or mobile) — your Pixel Player will mirror and control playback seamlessly!
