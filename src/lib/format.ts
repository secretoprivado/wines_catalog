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

export function formatStock(stock: number): string {
  return `${stock} BTL.`;
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

export function formatAppellation(appellation: string): string {
  return appellation.trim().toUpperCase();
}

export function formatGrape(grape: string): string {
  return grape.trim().toUpperCase();
}

export function formatRegionCount(count: number): string {
  return `${count} CUVÉE${count > 1 ? 'S' : ''}`;
}

export function formatTotalReferences(count: number): string {
  return `${count} RÉFÉRENCE${count > 1 ? 'S' : ''}`;
}
