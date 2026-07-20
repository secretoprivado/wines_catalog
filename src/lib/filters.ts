import { formatCountryName, formatRegionName } from './format';
import type { Spirit, Wine } from './types';

export interface CatalogFilters {
  search: string;
  country: string;
  region: string;
  type: string;
  inStockOnly: boolean;
}

export const EMPTY_FILTERS: CatalogFilters = {
  search: '',
  country: '',
  region: '',
  type: '',
  inStockOnly: false,
};

export interface RegionGroupOption {
  country: string;
  regions: string[];
}

export interface FilterOptions {
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
    filters.type !== '' ||
    filters.inStockOnly
  );
}

export function hasWineGeographyFilters(filters: CatalogFilters): boolean {
  return filters.country !== '' || filters.region !== '';
}

function buildTypes(wines: Wine[], spirits: Spirit[], filters: CatalogFilters): string[] {
  const wineSource = wines.filter((wine) => {
    if (filters.country && wine.country !== filters.country) return false;
    if (filters.region && wine.region !== filters.region) return false;
    return true;
  });

  const wineTypes = wineSource.map((wine) => wine.type).filter(Boolean);
  const spiritTypes = hasWineGeographyFilters(filters)
    ? []
    : spirits.flatMap((spirit) => [spirit.category, spirit.alcoholType].filter(Boolean));

  return [...new Set([...wineTypes, ...spiritTypes])].sort((a, b) => a.localeCompare(b, 'fr'));
}

export function buildFilterOptions(
  wines: Wine[],
  spirits: Spirit[],
  filters: CatalogFilters,
): FilterOptions {
  const countries = [...new Set(wines.map((wine) => wine.country).filter(Boolean))].sort(
    compareCountries,
  );

  const regionsByCountry = buildRegionsByCountry(wines, filters.country);
  const types = buildTypes(wines, spirits, filters);

  return { countries, regionsByCountry, types };
}

export function applyFilters(wines: Wine[], filters: CatalogFilters): Wine[] {
  const search = normalizeText(filters.search);

  return wines.filter((wine) => {
    if (filters.country && wine.country !== filters.country) return false;
    if (filters.region && wine.region !== filters.region) return false;
    if (filters.type && wine.type !== filters.type) return false;
    if (filters.inStockOnly && (wine.stock === null || wine.stock <= 0)) return false;
    if (search && !wineSearchBlob(wine).includes(search)) return false;
    return true;
  });
}

export function applySpiritFilters(spirits: Spirit[], filters: CatalogFilters): Spirit[] {
  if (hasWineGeographyFilters(filters)) return [];

  const search = normalizeText(filters.search);

  return spirits.filter((spirit) => {
    if (
      filters.type &&
      spirit.category !== filters.type &&
      spirit.alcoholType !== filters.type
    ) {
      return false;
    }
    if (filters.inStockOnly && (spirit.stock === null || spirit.stock <= 0)) return false;
    if (search && !spiritSearchBlob(spirit).includes(search)) return false;
    return true;
  });
}
