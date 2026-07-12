import type { RegionGroup, Wine } from './types';
import {
  formatAppellation,
  formatGrape,
  formatPrice,
  formatRegionCount,
  formatScore,
  formatStock,
  formatType,
  getTypeDotColor,
} from './format';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMetadata(wine: Wine): string {
  const parts: string[] = [];

  if (wine.type) {
    const dotColor = getTypeDotColor(wine.type);
    parts.push(
      `<span class="wine-meta__type"><span class="wine-meta__dot" style="background-color: ${dotColor}"></span>${escapeHtml(formatType(wine.type))}</span>`,
    );
  }

  if (wine.appellation) {
    parts.push(`<span>${escapeHtml(formatAppellation(wine.appellation))}</span>`);
  }

  if (wine.grape) {
    parts.push(`<span>${escapeHtml(formatGrape(wine.grape))}</span>`);
  }

  const score = formatScore(wine.score);
  if (score) {
    parts.push(`<span>${escapeHtml(score)}</span>`);
  }

  return parts.join('<span class="wine-meta__sep">·</span>');
}

function renderWineRow(wine: Wine): string {
  const metadata = renderMetadata(wine);

  return `
    <article class="wine-row">
      <div class="wine-row__domain">
        <h3 class="wine-row__domain-name">${escapeHtml(wine.domain)}</h3>
        ${metadata ? `<div class="wine-meta">${metadata}</div>` : ''}
      </div>
      <div class="wine-row__cuvee">
        <em>${escapeHtml(wine.cuvee)}</em>
      </div>
      <div class="wine-row__commerce">
        <span class="wine-row__stock">${escapeHtml(formatStock(wine.stock))}</span>
        <span class="wine-row__price">${escapeHtml(formatPrice(wine.price))}</span>
      </div>
    </article>
  `;
}

function renderRegionSection(group: RegionGroup): string {
  const wines = group.wines.map(renderWineRow).join('');

  return `
    <section class="region-section">
      <header class="region-section__header">
        <h2 class="region-section__title">${escapeHtml(group.region)}</h2>
        <span class="region-section__count">${escapeHtml(formatRegionCount(group.wines.length))}</span>
      </header>
      <div class="region-section__wines">
        ${wines}
      </div>
    </section>
  `;
}

export function renderCatalog(regions: RegionGroup[]): string {
  if (regions.length === 0) {
    return '<p class="catalog-message">Aucune référence disponible pour le moment.</p>';
  }

  return regions.map(renderRegionSection).join('');
}

export function renderLoading(): string {
  return '<p class="catalog-message catalog-message--loading">Chargement du catalogue…</p>';
}

export function renderError(message: string): string {
  return `<p class="catalog-message catalog-message--error">${escapeHtml(message)}</p>`;
}
