# Web Shop Expo

Angular 17 storefront prototype for bakery product discovery and product detail ordering flows.

## Tech Stack

- Angular 17 (standalone components, signals)
- TypeScript 5
- SCSS
- Karma + Jasmine (unit tests)

## Features

- Category-driven products overview
- Product details route: `/products/:productId`
- Shared cart quantity state across overview and details pages
- Bakery switching (`Rosenborg`, `Maschmanns`)
- UI preset switching
- Local API proxy support for both bakeries

## Project Structure

- `src/app/pages/` page-level route components
- `src/app/components/` reusable UI components
- `src/app/services/` data + UI state services
- `src/app/config/bakeries.config.ts` bakery/api settings
- `proxy.conf.json` local development API proxy

## Prerequisites

- Node.js 20+ (recommended)
- npm 10+ (recommended)

## Getting Started

```bash
npm install
npm start
```

App runs at `http://localhost:4200`.

## Scripts

```bash
npm start          # Angular dev server with proxy.conf.json
npm run build      # Production build
npm test           # Unit tests (headless Chrome)
```

## Deployment (Vercel)

This repository is pre-configured for Vercel via [`vercel.json`](./vercel.json):

- `npm ci` install
- `npm run build` build
- output directory: `dist/web-shop-expo/browser`
- rewrites:
  - `/rosenborg-api/*` -> `https://www.rosenborgbakeri.no/shop/api/*`
  - `/maschmanns-api/*` -> `https://www.maschmanns.no/shop/api/*`
  - SPA fallback `/*` -> `/index.html`

### Deploy Steps

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import the repo in Vercel.
3. Keep defaults (the project-level `vercel.json` already sets build/output/rewrites).
4. Deploy.

## Notes

- Local development uses `proxy.conf.json`.
- Production on Vercel uses `vercel.json` rewrites for the same API paths.
- If API responses or CORS behavior change upstream, update rewrite destinations accordingly.
