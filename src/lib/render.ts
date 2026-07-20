import type {
  CountryGroup,
  RegionGroup,
  Spirit,
  SpiritCategoryGroup,
  SpiritTypeGroup,
  Wine,
} from './types';
import {
  formatAbv,
  formatAging,
  formatAppellation,
  formatCountryCount,
  formatCountryName,
  formatFoodPairing,
  formatGrape,
  formatMichelinScore,
  formatPpm,
  formatPrice,
  formatRegionCount,
  formatRegionName,
  formatScore,
  formatSpiritCategoryCount,
  formatStockLine,
  formatType,
  formatVintage,
  getTypeDotColor,
  isPriceOnRequest,
} from './format';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface DetailItem {
  label: string;
  value: string;
  typeDot?: string;
}

interface ScoreItem {
  label: string;
  value: string;
}

function buildDetails(wine: Wine): DetailItem[] {
  const details: DetailItem[] = [];

  if (wine.type) {
    details.push({
      label: 'Type',
      value: formatType(wine.type),
      typeDot: getTypeDotColor(wine.type),
    });
  }

  if (wine.appellation) {
    details.push({ label: 'Appellation', value: formatAppellation(wine.appellation) });
  }

  if (wine.grape) {
    details.push({ label: 'Cépage(s)', value: formatGrape(wine.grape) });
  }

  const aging = formatAging(wine.aging);
  if (aging) {
    details.push({ label: 'Garde', value: aging });
  }

  if (wine.foodPairing) {
    details.push({ label: 'Accord', value: formatFoodPairing(wine.foodPairing) });
  }

  return details;
}

function buildScores(wine: Wine): ScoreItem[] {
  const scores: ScoreItem[] = [];

  const parker = formatScore(wine.scoreParker);
  if (parker) {
    scores.push({ label: 'Parker', value: parker });
  }

  const rvf = formatScore(wine.scoreRvf);
  if (rvf) {
    scores.push({ label: 'RVF', value: rvf });
  }

  const michelin = formatMichelinScore(wine.scoreMichelin);
  if (michelin) {
    scores.push({ label: 'Michelin', value: michelin });
  }

  return scores;
}

function renderComment(wine: Wine): string {
  if (!wine.comment) return '';

  return `
    <aside class="wine-row__comment" aria-label="Information complémentaire">
      <span class="wine-row__comment-marker" aria-hidden="true">✦</span>
      <span class="wine-row__comment-label">Note</span>
      <p class="wine-row__comment-text">${escapeHtml(wine.comment)}</p>
    </aside>
  `;
}

function renderDetail(item: DetailItem): string {
  const dot = item.typeDot
    ? `<span class="wine-detail__dot" style="background-color: ${item.typeDot}"></span>`
    : '';

  return `
    <div class="wine-detail">
      <dt class="wine-detail__label">${escapeHtml(item.label)}</dt>
      <dd class="wine-detail__value">${dot}${escapeHtml(item.value)}</dd>
    </div>
  `;
}

function renderScore(item: ScoreItem): string {
  return `
    <span class="wine-score">
      <span class="wine-score__label">${escapeHtml(item.label)}</span>
      <span class="wine-score__value">${escapeHtml(item.value)}</span>
    </span>
  `;
}

function renderScores(scores: ScoreItem[]): string {
  if (scores.length === 0) return '';

  return `
    <div class="wine-row__scores" aria-label="Notes critiques">
      <span class="wine-row__scores-heading">Notes</span>
      <div class="wine-row__scores-list">
        ${scores.map(renderScore).join('<span class="wine-row__scores-sep" aria-hidden="true">|</span>')}
      </div>
    </div>
  `;
}

function renderWineRow(wine: Wine): string {
  const vintage = formatVintage(wine.vintage);
  const stock = formatStockLine(wine.stock, wine.volume);
  const details = buildDetails(wine);
  const scores = buildScores(wine);

  const vintageHtml = vintage
    ? `<span class="wine-row__vintage">${escapeHtml(vintage)}</span>`
    : '';

  const cuveeHtml = wine.cuvee
    ? `<em class="wine-row__cuvee">${escapeHtml(wine.cuvee)}</em>`
    : '';

  const stockHtml = stock
    ? `<span class="wine-row__stock">${escapeHtml(stock)}</span>`
    : '';

  const commentHtml = renderComment(wine);

  const detailsHtml =
    details.length > 0
      ? `<dl class="wine-row__details">${details.map(renderDetail).join('')}</dl>`
      : '';

  const scoresHtml = renderScores(scores);

  return `
    <article class="wine-row">
      <div class="wine-row__header">
        <div class="wine-row__domain">
          <h3 class="wine-row__domain-name">${escapeHtml(wine.domain)}</h3>
        </div>
        <div class="wine-row__title">
          ${cuveeHtml}
          ${vintageHtml}
        </div>
        <div class="wine-row__commerce">
          ${stockHtml}
          <span class="wine-row__price${isPriceOnRequest(wine.price) ? ' wine-row__price--on-request' : ''}">${escapeHtml(formatPrice(wine.price))}</span>
        </div>
      </div>
      ${commentHtml}
      ${detailsHtml}
      ${scoresHtml}
    </article>
  `;
}

function renderRegionSection(group: RegionGroup): string {
  const wines = group.wines.map(renderWineRow).join('');

  return `
    <section class="region-section">
      <header class="region-section__header">
        <h3 class="region-section__title">${escapeHtml(formatRegionName(group.region))}</h3>
        <span class="region-section__count">${escapeHtml(formatRegionCount(group.wines.length))}</span>
      </header>
      <div class="region-section__wines">
        ${wines}
      </div>
    </section>
  `;
}

function renderCountrySection(group: CountryGroup): string {
  const regions = group.regions.map(renderRegionSection).join('');

  return `
    <section class="country-section">
      <header class="country-section__header">
        <h2 class="country-section__title">${escapeHtml(formatCountryName(group.country))}</h2>
        <span class="country-section__count">${escapeHtml(formatCountryCount(group.regions.length))}</span>
      </header>
      <div class="country-section__regions">
        ${regions}
      </div>
    </section>
  `;
}

export function renderCatalog(countries: CountryGroup[], emptyMessage?: string): string {
  if (countries.length === 0) {
    if (emptyMessage === '') return '';
    return `<p class="catalog-message">${escapeHtml(
      emptyMessage ?? 'Aucune référence disponible pour le moment.',
    )}</p>`;
  }

  return countries.map(renderCountrySection).join('');
}

function buildSpiritDetails(spirit: Spirit): DetailItem[] {
  const details: DetailItem[] = [];

  if (spirit.origin) {
    details.push({ label: 'Origine', value: spirit.origin.trim() });
  }

  const abv = formatAbv(spirit.abv);
  if (abv) {
    details.push({ label: 'Degré', value: abv });
  }

  if (spirit.rawMaterial) {
    details.push({ label: 'Matière', value: spirit.rawMaterial.trim() });
  }

  if (spirit.aging) {
    details.push({ label: 'Vieillissement', value: spirit.aging.trim() });
  }

  const ppm = formatPpm(spirit.ppm);
  if (ppm) {
    details.push({ label: 'Tourbe', value: ppm });
  }

  if (spirit.foodPairing) {
    details.push({ label: 'Accord', value: formatFoodPairing(spirit.foodPairing) });
  }

  return details;
}

function renderSpiritComment(spirit: Spirit): string {
  if (!spirit.comment) return '';

  return `
    <aside class="wine-row__comment" aria-label="Information complémentaire">
      <span class="wine-row__comment-marker" aria-hidden="true">✦</span>
      <span class="wine-row__comment-label">Note</span>
      <p class="wine-row__comment-text">${escapeHtml(spirit.comment)}</p>
    </aside>
  `;
}

function renderSpiritRow(spirit: Spirit): string {
  const vintage = formatVintage(spirit.vintage);
  const stock = formatStockLine(spirit.stock, spirit.volume);
  const details = buildSpiritDetails(spirit);

  const vintageHtml = vintage
    ? `<span class="wine-row__vintage">${escapeHtml(vintage)}</span>`
    : '';

  const labelHtml = spirit.label
    ? `<em class="wine-row__cuvee">${escapeHtml(spirit.label)}</em>`
    : '';

  const stockHtml = stock
    ? `<span class="wine-row__stock">${escapeHtml(stock)}</span>`
    : '';

  const commentHtml = renderSpiritComment(spirit);

  const detailsHtml =
    details.length > 0
      ? `<dl class="wine-row__details">${details.map(renderDetail).join('')}</dl>`
      : '';

  return `
    <article class="wine-row">
      <div class="wine-row__header">
        <div class="wine-row__domain">
          <h3 class="wine-row__domain-name">${escapeHtml(spirit.distillery)}</h3>
        </div>
        <div class="wine-row__title">
          ${labelHtml}
          ${vintageHtml}
        </div>
        <div class="wine-row__commerce">
          ${stockHtml}
          <span class="wine-row__price${isPriceOnRequest(spirit.price) ? ' wine-row__price--on-request' : ''}">${escapeHtml(formatPrice(spirit.price))}</span>
        </div>
      </div>
      ${commentHtml}
      ${detailsHtml}
    </article>
  `;
}

function renderSpiritCategorySection(group: SpiritCategoryGroup): string {
  const spirits = group.spirits.map(renderSpiritRow).join('');

  return `
    <section class="region-section">
      <header class="region-section__header">
        <h3 class="region-section__title">${escapeHtml(formatRegionName(group.category))}</h3>
        <span class="region-section__count">${escapeHtml(formatSpiritCategoryCount(group.spirits.length))}</span>
      </header>
      <div class="region-section__wines">
        ${spirits}
      </div>
    </section>
  `;
}

function renderSpiritTypeSection(group: SpiritTypeGroup): string {
  const categories = group.categories.map(renderSpiritCategorySection).join('');

  // Categories only — the catalog section filter already names Spiritueux / Vins mutés
  return `
    <section class="country-section country-section--flat">
      <div class="country-section__regions">
        ${categories}
      </div>
    </section>
  `;
}

export function renderSpiritsCatalog(types: SpiritTypeGroup[], emptyMessage?: string): string {
  if (types.length === 0) {
    if (!emptyMessage) return '';
    return `<p class="catalog-message">${escapeHtml(emptyMessage)}</p>`;
  }

  return types.map(renderSpiritTypeSection).join('');
}

export function renderCatalogParts(options: {
  winesHtml: string;
  spiritsHtml: string;
  showWinesHeading: boolean;
  showSpiritsHeading: boolean;
  emptyMessage?: string;
}): string {
  const { winesHtml, spiritsHtml, showWinesHeading, showSpiritsHeading, emptyMessage } = options;
  const hasWines = winesHtml.trim().length > 0;
  const hasSpirits = spiritsHtml.trim().length > 0;

  if (!hasWines && !hasSpirits) {
    return `<p class="catalog-message">${escapeHtml(
      emptyMessage ?? 'Aucune référence disponible pour le moment.',
    )}</p>`;
  }

  const parts: string[] = [];

  if (hasWines) {
    if (showWinesHeading) {
      parts.push(`
        <header class="catalog-part-header">
          <p class="catalog-part-header__title">Vins</p>
        </header>
      `);
    }
    parts.push(`<div class="catalog-part">${winesHtml}</div>`);
  }

  if (hasSpirits) {
    if (showSpiritsHeading) {
      parts.push(`
        <header class="catalog-part-header${hasWines ? ' catalog-part-header--spaced' : ''}">
          <p class="catalog-part-header__title">Spiritueux</p>
        </header>
      `);
    }
    parts.push(`<div class="catalog-part">${spiritsHtml}</div>`);
  }

  return parts.join('');
}

export function renderLoading(): string {
  return '<p class="catalog-message catalog-message--loading">Chargement du catalogue…</p>';
}

export function renderError(message: string): string {
  return `<p class="catalog-message catalog-message--error">${escapeHtml(message)}</p>`;
}
