import type {
  CatalogData,
  CountryGroup,
  Spirit,
  SpiritsCatalogData,
  SpiritTypeGroup,
  Wine,
} from './types';
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
  scoreMichelin: string[];
  stock: string[];
  volume: string[];
  foodPairing: string[];
  comment: string[];
  price: string[];
}

interface SpiritColumnAliases {
  alcoholType: string[];
  category: string[];
  origin: string[];
  distillery: string[];
  label: string[];
  abv: string[];
  volume: string[];
  rawMaterial: string[];
  aging: string[];
  ppm: string[];
  foodPairing: string[];
  vintage: string[];
  price: string[];
  comment: string[];
  stock: string[];
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
  aging: ['potentiel de garde', 'temps de garde', 'garde'],
  scoreParker: ['notes critiques parker', 'parker'],
  scoreRvf: ['notes critiques revue du vin de france', 'revue du vin de france', 'revue du vin', 'rvf'],
  scoreMichelin: [
    'grappes michelin du domaine',
    'grappes michelin',
    'michelin du domaine',
    'michelin',
  ],
  stock: ['qté', 'qte', 'stock', 'bouteilles', 'btl', 'quantité', 'quantite'],
  volume: ['contenant (cl)', 'contenant', 'volume', 'cl'],
  foodPairing: ['exemple de plat', 'type de plat', 'accord mets', 'accord'],
  comment: ['commentaire', 'comment', 'remarque'],
  price: ['prix unitaire en', 'prix unitaire', 'prix', 'price', 'tarif'],
};

const SPIRIT_COLUMN_ALIASES: SpiritColumnAliases = {
  alcoholType: ["type d'alcool", 'type alcool', 'alcool'],
  category: ['catégorie', 'categorie', 'category'],
  origin: ['origine', 'origin'],
  distillery: ['distillerie', 'distillery', 'producteur', 'domaine'],
  label: ['etiquette', 'étiquette', 'label', 'nom', 'référence', 'reference'],
  abv: ["degré d'alcool", 'degre', 'degré', 'abv', 'alcool %', '% vol'],
  volume: ['volume', 'contenant', 'cl'],
  rawMaterial: ['matière première', 'matiere premiere', 'raw material'],
  aging: ['vieillissement', 'élevage', 'elevage', 'aging', 'âge', 'age'],
  ppm: ['ppm', 'tourbe', 'peat'],
  foodPairing: ['accords mets', 'accord mets', 'accord', 'exemple de plat'],
  vintage: ['millésime', 'millesime', 'vintage', 'année', 'annee'],
  price: ['prix', 'price', 'tarif'],
  comment: ['commentaire', 'comment', 'remarque'],
  stock: ['qté', 'qte', 'stock', 'bouteilles', 'btl', 'quantité', 'quantite'],
};

const DEFAULT_SPIRITS_GID = '337014678';

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
      (header) => header.length > 0 && header.includes(normalizedAlias),
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
  let cleaned = trimmed.replace(/[^\d,.-]/g, '');
  if (!cleaned) return null;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(',', '.');
  }
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Alcohol %: prefer formatted cell text; treat (0, 1) as a Sheets percent fraction. */
function parseAbv(value: string | number | null): number | null {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  if (parsed > 0 && parsed < 1) return parsed * 100;
  return parsed;
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

function sortSpirits(spirits: Spirit[]): Spirit[] {
  return spirits.sort((a, b) => {
    const distilleryCompare = a.distillery.localeCompare(b.distillery, 'fr');
    if (distilleryCompare !== 0) return distilleryCompare;
    const labelCompare = a.label.localeCompare(b.label, 'fr');
    if (labelCompare !== 0) return labelCompare;
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
      scoreMichelin: parseNumber(getRowValue(row, columnMap.scoreMichelin)),
      stock: parseNumber(getRowValue(row, columnMap.stock)),
      volume: parseNumber(getRowValue(row, columnMap.volume)),
      foodPairing: parseText(getRowValue(row, columnMap.foodPairing)),
      comment: parseText(getRowValue(row, columnMap.comment)),
      price: parseNumber(getRowValue(row, columnMap.price)),
    });
  }

  return wines;
}

function parseSpiritRows(
  rows: string[][],
  columnMap: Record<keyof SpiritColumnAliases, number>,
): Spirit[] {
  let currentAlcoholType = '';
  let currentCategory = '';
  const spirits: Spirit[] = [];

  for (const row of rows) {
    const alcoholTypeValue = getCsvValue(row, columnMap.alcoholType);
    const categoryValue = getCsvValue(row, columnMap.category);
    const distilleryValue = getCsvValue(row, columnMap.distillery);
    const labelValue = getCsvValue(row, columnMap.label);

    const hasAlcoholTypeOnRow = Boolean(alcoholTypeValue);
    const hasCategoryOnRow = Boolean(categoryValue);
    const hasDistilleryOnRow = Boolean(distilleryValue);
    const hasLabelOnRow = Boolean(labelValue);

    if (hasAlcoholTypeOnRow) {
      if (alcoholTypeValue !== currentAlcoholType) {
        currentAlcoholType = alcoholTypeValue;
        currentCategory = '';
      }
    }

    if (hasCategoryOnRow) {
      currentCategory = categoryValue;
    }

    if (!currentAlcoholType || !currentCategory) continue;
    if (!hasDistilleryOnRow && !hasLabelOnRow) continue;

    const distillery = distilleryValue;
    const label = labelValue;
    if (!distillery && !label) continue;

    spirits.push({
      alcoholType: currentAlcoholType,
      category: currentCategory,
      origin: parseText(getCsvValue(row, columnMap.origin)),
      distillery,
      label,
      abv: parseAbv(getCsvValue(row, columnMap.abv)),
      volume: parseNumber(getCsvValue(row, columnMap.volume)),
      rawMaterial: parseText(getCsvValue(row, columnMap.rawMaterial)),
      aging: parseText(getCsvValue(row, columnMap.aging)),
      ppm: parseText(getCsvValue(row, columnMap.ppm)),
      foodPairing: parseText(getCsvValue(row, columnMap.foodPairing)),
      vintage: parseVintage(getCsvValue(row, columnMap.vintage)),
      price: parseNumber(getCsvValue(row, columnMap.price)),
      comment: parseText(getCsvValue(row, columnMap.comment)),
      stock: parseNumber(getCsvValue(row, columnMap.stock)),
    });
  }

  return spirits;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char === '\r') {
      // ignore CR (handle CRLF)
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function getCsvValue(row: string[], index: number): string {
  if (index === -1 || index >= row.length) return '';
  return row[index]?.trim() ?? '';
}

async function fetchCsvSheet(
  sheetId: string,
  gid: string,
): Promise<{ headers: string[]; rows: string[][] }> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Impossible de charger le catalogue spiritueux.');
  }

  const text = await response.text();
  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    throw new Error('Impossible de charger le catalogue spiritueux.');
  }

  const matrix = parseCsv(text).filter((row) => row.some((cell) => cell.trim() !== ''));
  if (matrix.length === 0) {
    throw new Error('Feuille spiritueux vide.');
  }

  const [headerRow, ...dataRows] = matrix;
  return { headers: headerRow, rows: dataRows };
}

export function groupWinesByCountryAndRegion(wines: Wine[]): CountryGroup[] {
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

export function groupSpiritsByTypeAndCategory(spirits: Spirit[]): SpiritTypeGroup[] {
  const typeMap = new Map<string, Map<string, Spirit[]>>();

  for (const spirit of spirits) {
    const typeKey = spirit.alcoholType || 'Non renseigné';
    if (!typeMap.has(typeKey)) {
      typeMap.set(typeKey, new Map());
    }

    const categoryMap = typeMap.get(typeKey)!;
    const existing = categoryMap.get(spirit.category) ?? [];
    existing.push(spirit);
    categoryMap.set(spirit.category, existing);
  }

  return Array.from(typeMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([alcoholType, categoryMap]) => ({
      alcoholType,
      categories: Array.from(categoryMap.entries())
        .sort(([a], [b]) => a.localeCompare(b, 'fr'))
        .map(([category, categorySpirits]) => ({
          category,
          spirits: sortSpirits(categorySpirits),
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

async function fetchGvizTable(sheetId: string, sheetName?: string): Promise<GvizTable> {
  const params = new URLSearchParams({ tqx: 'out:json' });
  if (sheetName) {
    params.set('sheet', sheetName);
  }

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Impossible de charger le catalogue.');
  }

  const text = await response.text();
  return parseGvizResponse(text).table;
}

export async function fetchCatalog(sheetId: string): Promise<CatalogData> {
  if (!sheetId) {
    throw new Error('Identifiant Google Sheet manquant.');
  }

  const table = await fetchGvizTable(sheetId);
  const headers = table.cols.map((col) => col.label);

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
    scoreMichelin: findColumnIndex(headers, COLUMN_ALIASES.scoreMichelin),
    stock: findColumnIndex(headers, COLUMN_ALIASES.stock),
    volume: findColumnIndex(headers, COLUMN_ALIASES.volume),
    foodPairing: findColumnIndex(headers, COLUMN_ALIASES.foodPairing),
    comment: findColumnIndex(headers, COLUMN_ALIASES.comment),
    price: findColumnIndex(headers, COLUMN_ALIASES.price),
  };

  if (columnMap.region === -1 || columnMap.domain === -1 || columnMap.cuvee === -1) {
    throw new Error('Colonnes requises manquantes (Région, Domaine, Cuvée).');
  }

  const wines = parseRows(table.rows, columnMap);
  const countries = groupWinesByCountryAndRegion(wines);

  return {
    wines,
    countries,
    totalCount: wines.length,
  };
}

export async function fetchSpiritsCatalog(
  sheetId: string,
  gid = DEFAULT_SPIRITS_GID,
): Promise<SpiritsCatalogData> {
  if (!sheetId) {
    throw new Error('Identifiant Google Sheet manquant.');
  }

  const { headers, rows } = await fetchCsvSheet(sheetId, gid);

  const columnMap = {
    alcoholType: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.alcoholType),
    category: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.category),
    origin: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.origin),
    distillery: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.distillery),
    label: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.label),
    abv: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.abv),
    volume: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.volume),
    rawMaterial: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.rawMaterial),
    aging: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.aging),
    ppm: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.ppm),
    foodPairing: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.foodPairing),
    vintage: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.vintage),
    price: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.price),
    comment: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.comment),
    stock: findColumnIndex(headers, SPIRIT_COLUMN_ALIASES.stock),
  };

  if (
    columnMap.alcoholType === -1 ||
    columnMap.category === -1 ||
    columnMap.distillery === -1 ||
    columnMap.label === -1
  ) {
    throw new Error(
      "Colonnes requises manquantes (Type d'alcool, Catégorie, Distillerie, Étiquette).",
    );
  }

  const spirits = parseSpiritRows(rows, columnMap);
  const types = groupSpiritsByTypeAndCategory(spirits);

  return {
    spirits,
    types,
    totalCount: spirits.length,
  };
}
