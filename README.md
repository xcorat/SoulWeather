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
2. Enter your birth date, time, and **birth location** (searchable city list)
3. The selected city's IANA time zone (e.g. `Asia/Kolkata`) is used to convert
   your local birth time to UTC with DST handled automatically. If you skip the
   location, the browser's default zone is used.
4. Click **Draw chart**
5. The outer ring shows today's transits; they update every minute

## City data

The location picker is backed by [`public/cities.json`](public/cities.json), a
trimmed copy of the [GeoNames `cities15000`](https://download.geonames.org/export/dump/)
dump (CC BY 4.0 — name, country, lat/lon, IANA time zone). A small curated
starter file (~130 popular cities, ~10 KB) is committed by default so the app
works out of the box; to replace it with the full ~25 000-city dataset run:

```bash
npm run build:cities      # downloads & rebuilds public/cities.json (~1 MB)
```

The fetcher is `scripts/build-cities.mjs` and uses only Node built-ins.

---

## Hosting

### GitHub Pages (automatic, free)

The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that
builds and publishes the app on every push to `main`.

**One-time setup** (only needed once per repo):

1. Go to **Settings → Pages** in this repository.
2. Under **Source**, select **GitHub Actions**.
3. Save.

After the next push to `main` the workflow will run and the app will be live at:

```
https://xcorat.github.io/SoulWeather/
```

You can also trigger a deploy manually from the **Actions** tab → *Deploy to GitHub Pages* → **Run workflow**.

---

### Cloudflare Pages (automatic, free)

No code changes needed — Cloudflare reads the same build output.

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create application → Pages → Connect to Git**.
2. Authorise Cloudflare to access your GitHub account and pick the `SoulWeather` repository.
3. Set the build settings:
   | Setting | Value |
   |---------|-------|
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | *(leave blank)* |
4. Click **Save and Deploy**.

Cloudflare will deploy automatically on every push to `main` (or your production branch). The app will be available at a `*.pages.dev` URL and you can attach a custom domain from the dashboard.

> **Tip:** both providers are free for public repositories and personal/hobby projects.

