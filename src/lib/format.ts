const TYPE_DOT_COLORS: Record<string, string> = {
  blanc: 'oklch(0.82 0.14 95)',
  rouge: 'oklch(0.45 0.18 25)',
  rosé: 'oklch(0.72 0.12 15)',
  rose: 'oklch(0.72 0.12 15)',
  orange: 'oklch(0.72 0.14 55)',
  effervescent: 'oklch(0.78 0.08 220)',
  champagne: 'oklch(0.78 0.08 220)',
};

export function formatType(type: string): string {
  return type.trim().toUpperCase();
}

export function getTypeDotColor(type: string): string {
  const key = type.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (TYPE_DOT_COLORS[key]) return TYPE_DOT_COLORS[key];
  for (const [name, color] of Object.entries(TYPE_DOT_COLORS)) {
    if (key.includes(name)) return color;
  }
  return 'oklch(0.68 0.13 65)';
}

export function formatStock(stock: number | null): string | null {
  if (stock === null) return null;
  return `${stock} BTL.`;
}

export function formatVolume(volume: number | null): string | null {
  if (volume === null) return null;
  const rounded = Number.isInteger(volume) ? volume : Math.round(volume);
  return `${rounded}cl`;
}

export function formatStockLine(stock: number | null, volume: number | null): string | null {
  const stockPart = formatStock(stock);
  const volumePart = formatVolume(volume);

  if (stockPart && volumePart) return `${stockPart} ${volumePart}`;
  return stockPart ?? volumePart;
}

export function formatPrice(price: number | null): string {
  if (price === null) return '—';
  const formatted = Number.isInteger(price) ? String(price) : price.toFixed(2).replace('.', ',');
  return `${formatted} €`;
}

export function formatScore(score: number | null): string | null {
  if (score === null || Number.isNaN(score)) return null;
  const rounded = Number.isInteger(score) ? score : Math.round(score);
  return `${rounded} / 100`;
}

export function formatMichelinScore(score: number | null): string | null {
  if (score === null || Number.isNaN(score)) return null;
  const rounded = Number.isInteger(score) ? score : Math.round(score);
  return rounded <= 1 ? `${rounded} grappe` : `${rounded} grappes`;
}

export function formatVintage(vintage: string | null): string | null {
  if (!vintage) return null;
  return vintage;
}

export function formatAging(aging: string): string | null {
  const value = aging.trim();
  if (!value) return null;

  if (/\d\s*ans$/i.test(value)) {
    return value;
  }

  if (/\d\s*an$/i.test(value)) {
    return value.replace(/\s*an$/i, ' ans');
  }

  if (value.includes('+') || value.includes('-')) {
    return `${value} ans`;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isNaN(parsed)) {
    return parsed <= 1 ? `${parsed} an` : `${parsed} ans`;
  }

  return `${value} ans`;
}

export function formatAppellation(appellation: string): string {
  return appellation.trim().toUpperCase();
}

export function formatGrape(grape: string): string {
  return grape.trim();
}

export function formatFoodPairing(foodPairing: string): string {
  return foodPairing.trim();
}

export function formatPlaceName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatCountryName(country: string): string {
  const normalized = country.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (normalized === 'france') return 'France';
  return formatPlaceName(country);
}

export function formatRegionName(region: string): string {
  return formatPlaceName(region);
}

export function formatCountryCount(count: number): string {
  return `${count} RÉGION${count > 1 ? 'S' : ''}`;
}

export function formatRegionCount(count: number): string {
  return `${count} CUVÉE${count > 1 ? 'S' : ''}`;
}

export function formatTotalReferences(count: number): string {
  return `${count} RÉFÉRENCE${count > 1 ? 'S' : ''}`;
}

export function formatReferenceCount(filtered: number, total: number): string {
  if (filtered === total) return formatTotalReferences(total);
  return `${filtered} SUR ${total} RÉFÉRENCE${total > 1 ? 'S' : ''}`;
}
