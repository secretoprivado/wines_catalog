import type { Spirit, Wine } from './types';

const STORAGE_KEY = 'wines_catalog_selection';

let memoryFallback = new Set<string>();

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function readStoredKeys(): string[] {
  if (!canUseStorage()) return [...memoryFallback];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((key) => typeof key === 'string') : [];
  } catch {
    return [...memoryFallback];
  }
}

function writeStoredKeys(keys: Set<string>): void {
  memoryFallback = new Set(keys);

  if (!canUseStorage()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // Ignore quota or privacy mode errors.
  }
}

export function getWineKey(wine: Wine): string {
  return [wine.domain, wine.cuvee, wine.vintage, wine.country, wine.region, wine.appellation]
    .map((part) => (part ?? '').trim())
    .join('|');
}

export function getSpiritKey(spirit: Spirit): string {
  return [
    spirit.distillery,
    spirit.label,
    spirit.vintage,
    spirit.alcoholType,
    spirit.category,
    spirit.origin,
  ]
    .map((part) => (part ?? '').trim())
    .join('|');
}

export function loadSelection(): Set<string> {
  return new Set(readStoredKeys());
}

export function saveSelection(keys: Set<string>): void {
  writeStoredKeys(keys);
}

export function isSelected(key: string, keys: Set<string>): boolean {
  return keys.has(key);
}

export function toggleSelection(key: string, keys: Set<string>): boolean {
  const next = new Set(keys);
  if (next.has(key)) {
    next.delete(key);
    saveSelection(next);
    return false;
  }

  next.add(key);
  saveSelection(next);
  return true;
}

export function removeSelection(key: string, keys: Set<string>): void {
  const next = new Set(keys);
  next.delete(key);
  saveSelection(next);
}
