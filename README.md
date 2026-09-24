# TNSTREAMING

A responsive, client-side streaming discovery dashboard inspired by modern OTT interfaces.

## Features

- TMDB-powered movies and TV discovery
- Featured carousel and trending sections
- Search, genre, language, rating, and mood filters
- Watchlist, continue watching, ratings, comments, and profiles
- Episode-aware player controls
- Light theme and offline app-shell support
- Responsive desktop and mobile layouts

## Run locally

```powershell
python -m http.server 4173
```

Open <http://localhost:4173/>.

## Deploy on GitHub Pages

Pushes to `main` are published automatically through GitHub Actions. In the repository settings, set **Pages** to use **GitHub Actions** as the source once, then open:

<https://tamizh1309.github.io/TNSTREAMING/>

## Deploy on Render

Create a new **Static Site** in Render and connect `Tamizh1309/TNSTREAMING`. Render can read `render.yaml` automatically, or use these settings:

- Build command: `echo "TNSTREAMING static site ready"`
- Publish directory: `.`
- Auto-deploy: enabled

## Configuration

The TMDB key is currently configured in `script.js` for this static demo. Restrict that key to the intended domains in TMDB before publishing publicly.
