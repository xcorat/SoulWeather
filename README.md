# Soul Weather 🌙

A Vedic astrology birth-chart web app built with **Svelte 5** and **Canvas**.

## Features

- **Dual-ring zodiac wheel** rendered on HTML Canvas:
  - **Inner ring** — natal (birth-chart) planetary positions
  - **Outer ring** — live transit (current) positions, auto-refreshed every minute
- **9 bodies**: Sun ☉, Moon ☽, Mercury ☿, Venus ♀, Mars ♂, Jupiter ♃, Saturn ♄, Rahu ☊, Ketu ☋
- **Vedic / Sidereal** positions using the Lahiri (Chitra-Paksha) ayanamsa
- **Planetary position tables** below the chart (sign + degree in sign)
- Birth data **persisted in `localStorage`** — no server needed

## Calculations

Pure-JavaScript ephemeris (`src/lib/ephemeris.js`), no WASM or external services required:

| Body | Method | Accuracy |
|------|--------|----------|
| Sun | Meeus Ch. 25 equation of center | ~1 arcmin |
| Moon | Meeus Ch. 47 30-term series | ~5 arcmin |
| Mercury – Saturn | Kepler solver with VSOP mean elements | ~1–2° |
| Rahu / Ketu | Mean ascending node + 180° | ~10 arcmin |

Sufficient for astrology across the range **1900–2100**.

## Getting started

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build in dist/
```

## Usage

1. Open the app in a browser
2. Enter your birth date, time, and UTC offset
3. Click **Draw chart**
4. The outer ring shows today's transits; they update every minute
