# La Cave Secretoprivado

A static wine catalog built with [Astro](https://astro.build), powered by a public Google Sheet and deployed to GitHub Pages.

Live site: **https://secretoprivado.github.io/wines_catalog/**

## Features

- Elegant catalog layout grouped by wine region
- Data fetched from Google Sheets on each page visit
- Responsive design with a refined serif/sans-serif typography pairing
- Automatic deployment via GitHub Actions

## Google Sheet setup

Create a sheet with the following columns (first row as headers):

| Region | Domaine | Cuvée | Type | Appellation | Cépage | Note | Stock | Prix |
|--------|---------|-------|------|-------------|--------|------|-------|------|

Column names are flexible — French and English aliases are supported (e.g. `Domain` instead of `Domaine`, `Grape` instead of `Cépage`).

Then:

1. Share the sheet as **Anyone with the link → Viewer**
2. Copy the sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

## Local development

```bash
pnpm install
cp .env.example .env
# Edit .env and set PUBLIC_GOOGLE_SHEET_ID
pnpm dev
```

Open http://localhost:4321/wines_catalog/

## Build

```bash
pnpm build
pnpm preview
```

## GitHub Pages deployment

### One-time setup

1. Go to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**
2. Go to **Settings → Secrets and variables → Actions → Variables** and add:
   - `PUBLIC_GOOGLE_SHEET_ID` — your Google Sheet ID

### Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and deploys automatically.

## Environment variables

| Variable | Description |
|----------|-------------|
| `PUBLIC_GOOGLE_SHEET_ID` | Google Sheet ID (embedded at build time for client-side fetch) |

## License

MIT
