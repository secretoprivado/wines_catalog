import { formatCountryName, formatRegionName } from './format';
import type { Spirit, Wine } from './types';

export const CATALOG_SECTION_WINES = 'vins';
export const CATALOG_SECTION_SPIRITS = 'spiritueux';

export interface CatalogFilters {
  catalogSection: string;
  search: string;
  country: string;
  region: string;
  type: string;
}

export const EMPTY_FILTERS: CatalogFilters = {
  catalogSection: CATALOG_SECTION_WINES,
  search: '',
  country: '',
  region: '',
  type: '',
};

function normalizeCatalogSection(value: string | null): string {
  return value === CATALOG_SECTION_SPIRITS ? CATALOG_SECTION_SPIRITS : CATALOG_SECTION_WINES;
}

export function filtersFromSearchParams(params: URLSearchParams): CatalogFilters {
  return {
    catalogSection: normalizeCatalogSection(params.get('catalog')),
    search: params.get('q') ?? '',
    country: params.get('country') ?? '',
    region: params.get('region') ?? '',
    type: params.get('type') ?? '',
  };
}

export function filtersToSearchParams(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();

  params.set('catalog', normalizeCatalogSection(filters.catalogSection));
  if (filters.search.trim()) {
    params.set('q', filters.search.trim());
  }
  if (filters.country) {
    params.set('country', filters.country);
  }
  if (filters.region) {
    params.set('region', filters.region);
  }
  if (filters.type) {
    params.set('type', filters.type);
  }

  return params;
}

export interface RegionGroupOption {
  country: string;
  regions: string[];
}

export interface CatalogSectionOption {
  value: string;
  label: string;
}

export interface FilterOptions {
  catalogSections: CatalogSectionOption[];
  countries: string[];
  regionsByCountry: RegionGroupOption[];
  types: string[];
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function isFrance(country: string): boolean {
  return normalizeText(country) === 'france';
}

function compareCountries(a: string, b: string): number {
  const aIsFrance = isFrance(a);
  const bIsFrance = isFrance(b);
  if (aIsFrance && !bIsFrance) return -1;
  if (!aIsFrance && bIsFrance) return 1;
  return formatCountryName(a).localeCompare(formatCountryName(b), 'fr');
}

function compareRegions(a: string, b: string): number {
  return formatRegionName(a).localeCompare(formatRegionName(b), 'fr');
}

export function isWinesSection(filters: CatalogFilters): boolean {
  return filters.catalogSection === CATALOG_SECTION_WINES;
}

export function isSpiritsSection(filters: CatalogFilters): boolean {
  return filters.catalogSection === CATALOG_SECTION_SPIRITS;
}

function buildRegionsByCountry(wines: Wine[], countryFilter: string): RegionGroupOption[] {
  const source = countryFilter ? wines.filter((wine) => wine.country === countryFilter) : wines;
  const countryMap = new Map<string, Set<string>>();

  for (const wine of source) {
    if (!wine.country || !wine.region) continue;
    if (!countryMap.has(wine.country)) {
      countryMap.set(wine.country, new Set());
    }
    countryMap.get(wine.country)!.add(wine.region);
  }

  return Array.from(countryMap.entries())
    .sort(([a], [b]) => compareCountries(a, b))
    .map(([country, regionSet]) => ({
      country,
      regions: [...regionSet].sort(compareRegions),
    }));
}

function wineSearchBlob(wine: Wine): string {
  return normalizeText(
    [
      wine.country,
      wine.region,
      wine.domain,
      wine.cuvee,
      wine.vintage,
      wine.appellation,
      wine.grape,
      wine.type,
      wine.foodPairing,
      wine.comment,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

function spiritSearchBlob(spirit: Spirit): string {
  return normalizeText(
    [
      spirit.alcoholType,
      spirit.category,
      spirit.origin,
      spirit.distillery,
      spirit.label,
      spirit.vintage,
      spirit.rawMaterial,
      spirit.aging,
      spirit.ppm,
      spirit.foodPairing,
      spirit.comment,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.country !== '' ||
    filters.region !== '' ||
    filters.type !== ''
  );
}

export function buildCatalogSections(): CatalogSectionOption[] {
  return [
    { value: CATALOG_SECTION_WINES, label: 'Vins' },
    { value: CATALOG_SECTION_SPIRITS, label: 'Spiritueux' },
  ];
}

function buildTypes(wines: Wine[], spirits: Spirit[], filters: CatalogFilters): string[] {
  if (isWinesSection(filters)) {
    const wineSource = wines.filter((wine) => {
      if (filters.country && wine.country !== filters.country) return false;
      if (filters.region && wine.region !== filters.region) return false;
      return true;
    });

    return [...new Set(wineSource.map((wine) => wine.type).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'fr'),
    );
  }

  // Spiritueux tab includes all spirits sheet entries (spiritueux + vins mutés)
  const categories = spirits.map((spirit) => spirit.category).filter(Boolean);

  return [...new Set(categories)].sort((a, b) => a.localeCompare(b, 'fr'));
}

export function buildFilterOptions(
  wines: Wine[],
  spirits: Spirit[],
  filters: CatalogFilters,
): FilterOptions {
  const catalogSections = buildCatalogSections();
  const countries = isWinesSection(filters)
    ? [...new Set(wines.map((wine) => wine.country).filter(Boolean))].sort(compareCountries)
    : [];
  const regionsByCountry = isWinesSection(filters)
    ? buildRegionsByCountry(wines, filters.country)
    : [];
  const types = buildTypes(wines, spirits, filters);

  return { catalogSections, countries, regionsByCountry, types };
}

export function applyFilters(wines: Wine[], filters: CatalogFilters): Wine[] {
  if (!isWinesSection(filters)) return [];

  const search = normalizeText(filters.search);

  return wines.filter((wine) => {
    if (filters.country && wine.country !== filters.country) return false;
    if (filters.region && wine.region !== filters.region) return false;
    if (filters.type && wine.type !== filters.type) return false;
    if (search && !wineSearchBlob(wine).includes(search)) return false;
    return true;
  });
}

export function applySpiritFilters(spirits: Spirit[], filters: CatalogFilters): Spirit[] {
  if (!isSpiritsSection(filters)) return [];

  const search = normalizeText(filters.search);

  return spirits.filter((spirit) => {
    if (filters.type && spirit.category !== filters.type) return false;
    if (search && !spiritSearchBlob(spirit).includes(search)) return false;
    return true;
  });
}

export function countSectionTotal(
  wines: Wine[],
  spirits: Spirit[],
  catalogSection: string,
): number {
  if (catalogSection === CATALOG_SECTION_WINES) return wines.length;
  if (catalogSection === CATALOG_SECTION_SPIRITS) return spirits.length;
  return 0;
}
