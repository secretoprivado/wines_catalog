import type { CountryGroup, RegionGroup, Wine } from './types';
import {
  formatAging,
  formatAppellation,
  formatCountryCount,
  formatCountryName,
  formatFoodPairing,
  formatGrape,
  formatPrice,
  formatRegionCount,
  formatScore,
  formatStockLine,
  formatType,
  formatVintage,
  getTypeDotColor,
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

  const parker = formatScore(wine.scoreParker);
  if (parker) {
    details.push({ label: 'Parker', value: parker });
  }

  const rvf = formatScore(wine.scoreRvf);
  if (rvf) {
    details.push({ label: 'RVF', value: rvf });
  }

  if (wine.foodPairing) {
    details.push({ label: 'Accord', value: formatFoodPairing(wine.foodPairing) });
  }

  return details;
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

function renderWineRow(wine: Wine): string {
  const vintage = formatVintage(wine.vintage);
  const stock = formatStockLine(wine.stock, wine.volume);
  const details = buildDetails(wine);

  const vintageHtml = vintage
    ? `<span class="wine-row__vintage">${escapeHtml(vintage)}</span>`
    : '';

  const cuveeHtml = wine.cuvee
    ? `<em class="wine-row__cuvee">${escapeHtml(wine.cuvee)}</em>`
    : '';

  const stockHtml = stock
    ? `<span class="wine-row__stock">${escapeHtml(stock)}</span>`
    : '';

  const detailsHtml =
    details.length > 0
      ? `<dl class="wine-row__details">${details.map(renderDetail).join('')}</dl>`
      : '';

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
          <span class="wine-row__price">${escapeHtml(formatPrice(wine.price))}</span>
        </div>
      </div>
      ${detailsHtml}
    </article>
  `;
}

function renderRegionSection(group: RegionGroup): string {
  const wines = group.wines.map(renderWineRow).join('');

  return `
    <section class="region-section">
      <header class="region-section__header">
        <h3 class="region-section__title">${escapeHtml(group.region)}</h3>
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

export function renderCatalog(countries: CountryGroup[]): string {
  if (countries.length === 0) {
    return '<p class="catalog-message">Aucune référence disponible pour le moment.</p>';
  }

  return countries.map(renderCountrySection).join('');
}

export function renderLoading(): string {
  return '<p class="catalog-message catalog-message--loading">Chargement du catalogue…</p>';
}

export function renderError(message: string): string {
  return `<p class="catalog-message catalog-message--error">${escapeHtml(message)}</p>`;
}
