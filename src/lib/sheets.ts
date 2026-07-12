import type { CatalogData, CountryGroup, RegionGroup, Wine } from './types';
import { formatCountryName } from './format';

interface GvizCell {
  v: string | number | null;
  f?: string;
}

interface GvizRow {
  c: (GvizCell | null)[];
}

interface GvizTable {
  cols: { label: string }[];
  rows: GvizRow[];
}

interface GvizResponse {
  table: GvizTable;
}

interface ColumnAliases {
  country: string[];
  region: string[];
  domain: string[];
  cuvee: string[];
  vintage: string[];
  type: string[];
  appellation: string[];
  grape: string[];
  aging: string[];
  scoreParker: string[];
  scoreRvf: string[];
  stock: string[];
  foodPairing: string[];
  price: string[];
}

const COLUMN_ALIASES: ColumnAliases = {
  country: ['pays', 'country', 'nation'],
  region: ['région', 'region', 'règion', 'cave secreto privado'],
  domain: ['domaine', 'producteur', 'domain', 'producer'],
  cuvee: ['cuvée', 'cuvee', 'wine', 'nom'],
  vintage: ['millésime', 'millesime', 'vintage', 'année', 'annee'],
  type: ['type', 'couleur', 'color'],
  appellation: ['appellation', 'aoc', 'aop'],
  grape: ['cépage(s)', 'cepage(s)', 'cépage', 'cepage', 'grape', 'variety', 'variété', 'variete'],
  aging: ['temps de garde', 'garde'],
  scoreParker: ['notes critiques parker', 'parker'],
  scoreRvf: ['notes critiques revue du vin de france', 'revue du vin de france', 'revue du vin', 'rvf'],
  stock: ['qté', 'qte', 'stock', 'bouteilles', 'btl', 'quantité', 'quantite'],
  foodPairing: ['type de plat', 'plat', 'accord'],
  price: ['prix unitaire en', 'prix unitaire', 'prix', 'price', 'tarif'],
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const exactIndex = normalizedHeaders.findIndex(
      (header) => header.length > 0 && header === normalizedAlias,
    );
    if (exactIndex !== -1) return exactIndex;
  }

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const partialIndex = normalizedHeaders.findIndex(
      (header) =>
        header.length > 0 &&
        (header.includes(normalizedAlias) || normalizedAlias.includes(header)),
    );
    if (partialIndex !== -1) return partialIndex;
  }

  return -1;
}

function getCellValue(cell: GvizCell | null): string | number | null {
  if (!cell) return null;
  return cell.v;
}

function getRowValue(row: GvizRow, index: number): string | number | null {
  if (index === -1) return null;
  return getCellValue(row.c[index]);
}

function parseNumber(value: string | number | null): number | null {
  if (value === null || value === '') return null;
  if (typeof value === 'number') return value;
  const trimmed = value.trim();
  if (trimmed === '/' || trimmed === '-') return null;
  const cleaned = trimmed.replace(/[^\d,.-]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseVintage(value: string | number | null): string | null {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return String(Math.round(parsed));
}

function parseText(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value).trim();
  if (text === '/' || text === '-') return '';
  return text;
}

function isFrance(country: string): boolean {
  const key = country.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  return key === 'france';
}

function compareCountries(a: string, b: string): number {
  const aIsFrance = isFrance(a);
  const bIsFrance = isFrance(b);
  if (aIsFrance && !bIsFrance) return -1;
  if (!aIsFrance && bIsFrance) return 1;
  return formatCountryName(a).localeCompare(formatCountryName(b), 'fr');
}

function sortWines(wines: Wine[]): Wine[] {
  return wines.sort((a, b) => {
    const domainCompare = a.domain.localeCompare(b.domain, 'fr');
    if (domainCompare !== 0) return domainCompare;
    const cuveeCompare = a.cuvee.localeCompare(b.cuvee, 'fr');
    if (cuveeCompare !== 0) return cuveeCompare;
    return (a.vintage ?? '').localeCompare(b.vintage ?? '', 'fr');
  });
}

function parseRows(
  rows: GvizRow[],
  columnMap: Record<keyof ColumnAliases, number>,
): Wine[] {
  let currentCountry = '';
  let currentRegion = '';
  let currentDomain = '';
  let currentCuvee = '';
  const wines: Wine[] = [];

  for (const row of rows) {
    const countryValue = getRowValue(row, columnMap.country);
    const regionValue = getRowValue(row, columnMap.region);
    const domainValue = getRowValue(row, columnMap.domain);
    const cuveeValue = getRowValue(row, columnMap.cuvee);

    const hasCountryOnRow = countryValue !== null && String(countryValue).trim() !== '';
    const hasRegionOnRow = regionValue !== null && String(regionValue).trim() !== '';
    const hasDomainOnRow = domainValue !== null && String(domainValue).trim() !== '';
    const hasCuveeOnRow = cuveeValue !== null && String(cuveeValue).trim() !== '';

    if (hasCountryOnRow) {
      const newCountry = String(countryValue).trim();
      if (newCountry !== currentCountry) {
        currentCountry = newCountry;
        currentRegion = '';
        currentDomain = '';
        currentCuvee = '';
      }
    }

    if (hasRegionOnRow) {
      const newRegion = String(regionValue).trim();
      if (newRegion !== currentRegion) {
        currentRegion = newRegion;
        currentDomain = '';
        currentCuvee = '';
      }
    }

    if (hasDomainOnRow) {
      const newDomain = String(domainValue).trim();
      if (newDomain !== currentDomain) {
        currentDomain = newDomain;
        currentCuvee = '';
      }
    }

    if (hasCuveeOnRow) {
      currentCuvee = String(cuveeValue).trim();
    }

    const vintageOnRow = parseVintage(getRowValue(row, columnMap.vintage));
    const hasVintageOnRow = vintageOnRow !== null;

    if (!currentRegion || !currentDomain) continue;
    if (!currentCuvee && !hasVintageOnRow) continue;
    if (!hasDomainOnRow && !hasCuveeOnRow && !hasVintageOnRow) continue;

    wines.push({
      country: currentCountry,
      region: currentRegion,
      domain: currentDomain,
      cuvee: currentCuvee,
      vintage: vintageOnRow,
      type: parseText(getRowValue(row, columnMap.type)),
      appellation: parseText(getRowValue(row, columnMap.appellation)),
      grape: parseText(getRowValue(row, columnMap.grape)),
      aging: parseText(getRowValue(row, columnMap.aging)),
      scoreParker: parseNumber(getRowValue(row, columnMap.scoreParker)),
      scoreRvf: parseNumber(getRowValue(row, columnMap.scoreRvf)),
      stock: parseNumber(getRowValue(row, columnMap.stock)),
      foodPairing: parseText(getRowValue(row, columnMap.foodPairing)),
      price: parseNumber(getRowValue(row, columnMap.price)),
    });
  }

  return wines;
}

function groupByCountryAndRegion(wines: Wine[]): CountryGroup[] {
  const countryMap = new Map<string, Map<string, Wine[]>>();

  for (const wine of wines) {
    const countryKey = wine.country || 'Non renseigné';
    if (!countryMap.has(countryKey)) {
      countryMap.set(countryKey, new Map());
    }

    const regionMap = countryMap.get(countryKey)!;
    const existing = regionMap.get(wine.region) ?? [];
    existing.push(wine);
    regionMap.set(wine.region, existing);
  }

  return Array.from(countryMap.entries())
    .sort(([a], [b]) => compareCountries(a, b))
    .map(([country, regionMap]) => ({
      country,
      regions: Array.from(regionMap.entries())
        .sort(([a], [b]) => a.localeCompare(b, 'fr'))
        .map(([region, regionWines]) => ({
          region,
          wines: sortWines(regionWines),
        })),
    }));
}

function parseGvizResponse(text: string): GvizResponse {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('Réponse Google Sheets invalide.');
  }
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as GvizResponse;
}

export async function fetchCatalog(sheetId: string): Promise<CatalogData> {
  if (!sheetId) {
    throw new Error('Identifiant Google Sheet manquant.');
  }

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Impossible de charger le catalogue.');
  }

  const text = await response.text();
  const data = parseGvizResponse(text);
  const headers = data.table.cols.map((col) => col.label);

  const columnMap = {
    country: findColumnIndex(headers, COLUMN_ALIASES.country),
    region: findColumnIndex(headers, COLUMN_ALIASES.region),
    domain: findColumnIndex(headers, COLUMN_ALIASES.domain),
    cuvee: findColumnIndex(headers, COLUMN_ALIASES.cuvee),
    vintage: findColumnIndex(headers, COLUMN_ALIASES.vintage),
    type: findColumnIndex(headers, COLUMN_ALIASES.type),
    appellation: findColumnIndex(headers, COLUMN_ALIASES.appellation),
    grape: findColumnIndex(headers, COLUMN_ALIASES.grape),
    aging: findColumnIndex(headers, COLUMN_ALIASES.aging),
    scoreParker: findColumnIndex(headers, COLUMN_ALIASES.scoreParker),
    scoreRvf: findColumnIndex(headers, COLUMN_ALIASES.scoreRvf),
    stock: findColumnIndex(headers, COLUMN_ALIASES.stock),
    foodPairing: findColumnIndex(headers, COLUMN_ALIASES.foodPairing),
    price: findColumnIndex(headers, COLUMN_ALIASES.price),
  };

  if (columnMap.region === -1 || columnMap.domain === -1 || columnMap.cuvee === -1) {
    throw new Error('Colonnes requises manquantes (Région, Domaine, Cuvée).');
  }

  const wines = parseRows(data.table.rows, columnMap);
  const countries = groupByCountryAndRegion(wines);

  return {
    wines,
    countries,
    totalCount: wines.length,
  };
}
