/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace', 'cursive'],
        silkscreen: ['"Silkscreen"', 'monospace', 'cursive'],
        pixelify: ['"Pixelify Sans"', 'monospace', 'cursive'],
        vt323: ['"VT323"', 'monospace'],
        digital: ['"DSEG7Classic"', 'monospace'],
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        retro: {
          pink: '#fec5db',
          pinkLight: '#ffe6f0',
          pinkDark: '#f494bc',
          periwinkle: '#8fa2d4',
          periwinkleLight: '#b4c4ec',
          periwinkleDark: '#6b7eb8',
          navy: '#191244',
          navyDeep: '#100b2e',
          navyLight: '#2c2269',
          cream: '#fffdf5',
          gold: '#ffd269',
          mint: '#9df0cf'
        }
      },
      boxShadow: {
        'pixel-sm': '2px 2px 0px 0px rgba(0,0,0,0.85)',
        'pixel': '4px 4px 0px 0px rgba(0,0,0,0.85)',
        'pixel-lg': '6px 6px 0px 0px rgba(0,0,0,0.85)',
        'pixel-pink': '4px 4px 0px 0px #f494bc',
        'pixel-navy': '4px 4px 0px 0px #191244',
        'pixel-inset': 'inset 2px 2px 0px 0px rgba(255,255,255,0.4), inset -2px -2px 0px 0px rgba(0,0,0,0.4)',
      }
    },
  },
  plugins: [],
}

