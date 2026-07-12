import type { CatalogData, RegionGroup, Wine } from './types';

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
  region: string[];
  domain: string[];
  cuvee: string[];
  vintage: string[];
  type: string[];
  appellation: string[];
  grape: string[];
  score: string[];
  scoreAlt: string[];
  stock: string[];
  price: string[];
}

const COLUMN_ALIASES: ColumnAliases = {
  region: ['region', 'région', 'règion'],
  domain: ['domaine', 'producteur', 'domain', 'producer'],
  cuvee: ['cuvée', 'cuvee', 'wine', 'nom'],
  vintage: ['millésime', 'millesime', 'vintage', 'année', 'annee'],
  type: ['type', 'couleur', 'color'],
  appellation: ['appellation', 'aoc', 'aop'],
  grape: ['cépage', 'cepage', 'grape', 'variety', 'variété', 'variete'],
  score: ['notes critiques parker', 'parker', 'note', 'score', 'rating', 'points'],
  scoreAlt: ['revue du vin de france', 'revue du vin', 'rvf'],
  stock: ['qté', 'qte', 'stock', 'bouteilles', 'btl', 'quantité', 'quantite'],
  price: ['prix unitaire', 'prix', 'price', 'tarif'],
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
      (header, index) => header.length > 0 && header === normalizedAlias,
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

function buildCuveeLabel(cuvee: string, vintage: string | null): string {
  if (!vintage) return cuvee;
  return `${cuvee} ${vintage}`;
}

function parseRows(
  rows: GvizRow[],
  columnMap: Record<keyof ColumnAliases, number>,
): Wine[] {
  let currentRegion = '';
  let currentDomain = '';
  let currentCuvee = '';
  const wines: Wine[] = [];

  for (const row of rows) {
    const regionValue = getRowValue(row, columnMap.region);
    const domainValue = getRowValue(row, columnMap.domain);
    const cuveeValue = getRowValue(row, columnMap.cuvee);

    if (regionValue !== null && String(regionValue).trim()) {
      currentRegion = String(regionValue).trim();
    }
    if (domainValue !== null && String(domainValue).trim()) {
      currentDomain = String(domainValue).trim();
    }
    if (cuveeValue !== null && String(cuveeValue).trim()) {
      currentCuvee = String(cuveeValue).trim();
    }

    if (!currentRegion || !currentDomain || !currentCuvee) continue;

    const vintage = parseVintage(getRowValue(row, columnMap.vintage));
    const score =
      parseNumber(getRowValue(row, columnMap.score)) ??
      parseNumber(getRowValue(row, columnMap.scoreAlt));

    wines.push({
      region: currentRegion,
      domain: currentDomain,
      cuvee: buildCuveeLabel(currentCuvee, vintage),
      type: String(getRowValue(row, columnMap.type) ?? '').trim(),
      appellation: String(getRowValue(row, columnMap.appellation) ?? '').trim(),
      grape: String(getRowValue(row, columnMap.grape) ?? '').trim(),
      score,
      stock: parseNumber(getRowValue(row, columnMap.stock)) ?? 0,
      price: parseNumber(getRowValue(row, columnMap.price)),
    });
  }

  return wines;
}

function groupByRegion(wines: Wine[]): RegionGroup[] {
  const regionMap = new Map<string, Wine[]>();

  for (const wine of wines) {
    const existing = regionMap.get(wine.region) ?? [];
    existing.push(wine);
    regionMap.set(wine.region, existing);
  }

  return Array.from(regionMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([region, regionWines]) => ({
      region,
      wines: regionWines.sort((a, b) => a.domain.localeCompare(b.domain, 'fr')),
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
    region: findColumnIndex(headers, COLUMN_ALIASES.region),
    domain: findColumnIndex(headers, COLUMN_ALIASES.domain),
    cuvee: findColumnIndex(headers, COLUMN_ALIASES.cuvee),
    vintage: findColumnIndex(headers, COLUMN_ALIASES.vintage),
    type: findColumnIndex(headers, COLUMN_ALIASES.type),
    appellation: findColumnIndex(headers, COLUMN_ALIASES.appellation),
    grape: findColumnIndex(headers, COLUMN_ALIASES.grape),
    score: findColumnIndex(headers, COLUMN_ALIASES.score),
    scoreAlt: findColumnIndex(headers, COLUMN_ALIASES.scoreAlt),
    stock: findColumnIndex(headers, COLUMN_ALIASES.stock),
    price: findColumnIndex(headers, COLUMN_ALIASES.price),
  };

  if (columnMap.region === -1 || columnMap.domain === -1 || columnMap.cuvee === -1) {
    throw new Error('Colonnes requises manquantes (Region, Domaine, Cuvée).');
  }

  const wines = parseRows(data.table.rows, columnMap);
  const regions = groupByRegion(wines);

  return {
    wines,
    regions,
    totalCount: wines.length,
  };
}
