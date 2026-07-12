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
2. Add `PUBLIC_GOOGLE_SHEET_ID` in **one** of these places (Settings → Secrets and variables → Actions):
   - **Secrets** (recommended if you already created it there)

   Value: your Google Sheet ID

### Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and deploys automatically.

### Troubleshooting: Jekyll / YAML front matter error

If the build log mentions `jekyll`, `Invalid YAML front matter`, or paths like `src/pages/index.astro`, GitHub Pages is trying to build the repository with **Jekyll** instead of the Astro workflow.

Fix:

1. Open **Settings → Pages → Build and deployment**
2. Set **Source** to **GitHub Actions** (not "Deploy from a branch")
3. Re-run the **Deploy to GitHub Pages** workflow from the Actions tab

This project is an Astro static site. The published output is the `dist/` folder produced by `pnpm build`, not the raw source files in `src/`.

## Environment variables

| Variable | Description |
|----------|-------------|
| `PUBLIC_GOOGLE_SHEET_ID` | Google Sheet ID (injected at build time into the client bundle) |

> **Note:** This value is baked into the site during `pnpm build`. After adding or changing it on GitHub, re-run the **Deploy to GitHub Pages** workflow (or push a commit) so the build picks it up.

## License

MIT
