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

Create a local `.env` from `.env.example` and add a restricted TMDB key before loading live catalog data.

```powershell
npm install
npm run dev
```

Open <http://localhost:4173/>.

For a frontend-only shell, the previous Python command still serves the files, but `/api/tmdb/*` requires the Node server.

## Secure architecture

The browser calls the same-origin `/api/tmdb/*` proxy. The backend adds `TMDB_API_KEY` from the environment, applies timeouts and rate limiting, and never sends the key to the client.

Run the smoke tests with:

```powershell
npm test
```

The original prototype contained a client-side TMDB key in Git history. Rotate or revoke that key in TMDB before using this project publicly; removing it from the current source does not invalidate the old credential.

## Deploy on GitHub Pages

Pushes to `main` are published automatically through GitHub Actions. In the repository settings, set **Pages** to use **GitHub Actions** as the source once, then open:

<https://tamizh1309.github.io/TNSTREAMING/>

## Deploy on Render

Create a new **Web Service** in Render and connect `Tamizh1309/TNSTREAMING`. Render can read `render.yaml` automatically. Add `TMDB_API_KEY` as a secret environment variable before deploying.

## Configuration

The TMDB key is loaded only by the backend from `TMDB_API_KEY`. Rotate the key that was exposed by the original prototype before publishing publicly.
