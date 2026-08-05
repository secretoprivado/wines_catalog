import { formatPrice, formatVintage } from './format';
import { getSpiritKey, getWineKey } from './selection';
import type { Spirit, Wine } from './types';

export const ORDER_EMAIL = 'cavesecretoprivado@proton.me';

export interface OrderItem {
  key: string;
  label: string;
  price: number | null;
  stock: number | null;
  quantity: number;
  kind: 'wine' | 'spirit';
}

export function formatWineLabel(wine: Wine): string {
  const parts = [wine.domain.trim()];
  if (wine.cuvee.trim()) parts.push(wine.cuvee.trim());
  const vintage = formatVintage(wine.vintage);
  if (vintage) parts.push(vintage);
  return parts.join(', ');
}

export function formatSpiritLabel(spirit: Spirit): string {
  const parts = [spirit.distillery.trim()];
  if (spirit.label.trim()) parts.push(spirit.label.trim());
  const vintage = formatVintage(spirit.vintage);
  if (vintage) parts.push(vintage);
  return parts.join(', ');
}

export function getMaxQuantity(stock: number | null): number {
  if (stock === null) return 99;
  return Math.max(0, stock);
}

export function resolveSelectedOrderItems(
  wines: Wine[],
  spirits: Spirit[],
  selectedKeys: Set<string>,
  quantities: Map<string, number>,
): OrderItem[] {
  const items: OrderItem[] = [];

  for (const wine of wines) {
    const key = getWineKey(wine);
    if (!selectedKeys.has(key)) continue;

    const max = getMaxQuantity(wine.stock);
    const defaultQty = max > 0 ? 1 : 0;
    const quantity = clampQuantity(quantities.get(key) ?? defaultQty, max);

    items.push({
      key,
      label: formatWineLabel(wine),
      price: wine.price,
      stock: wine.stock,
      quantity,
      kind: 'wine',
    });
  }

  for (const spirit of spirits) {
    const key = getSpiritKey(spirit);
    if (!selectedKeys.has(key)) continue;

    const max = getMaxQuantity(spirit.stock);
    const defaultQty = max > 0 ? 1 : 0;
    const quantity = clampQuantity(quantities.get(key) ?? defaultQty, max);

    items.push({
      key,
      label: formatSpiritLabel(spirit),
      price: spirit.price,
      stock: spirit.stock,
      quantity,
      kind: 'spirit',
    });
  }

  return items;
}

export function clampQuantity(quantity: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max(0, Math.floor(quantity)), max);
}

export function computeOrderTotal(items: OrderItem[]): number | null {
  const active = items.filter((item) => item.quantity > 0);
  if (active.length === 0) return 0;

  let total = 0;
  for (const item of active) {
    if (item.price === null) return null;
    total += item.price * item.quantity;
  }

  return total;
}

export function buildOrderBodyText(items: OrderItem[]): string {
  const active = items.filter((item) => item.quantity > 0);
  const lines = active.map((item) => {
    const unitPrice = item.price !== null ? formatPrice(item.price) : null;
    const lineTotal = item.price !== null ? formatPrice(item.price * item.quantity) : null;

    const parts = [`- ${item.label} — ${item.quantity} btl.`];
    if (unitPrice) parts.push(`${unitPrice}/btl.`);
    if (lineTotal) parts.push(lineTotal);
    return parts.join(' — ');
  });

  const total = computeOrderTotal(active);
  const bodyParts = [
    'Bonjour,',
    '',
    'Je souhaite commander les références suivantes :',
    '',
    ...lines,
  ];

  if (total !== null && active.length > 0) {
    bodyParts.push('', `Total : ${formatPrice(total)}`);
  }

  return bodyParts.join('\n');
}

export function buildOrderMailtoUrl(items: OrderItem[]): string {
  const params = new URLSearchParams();
  params.set('subject', 'commande');
  params.set('body', buildOrderBodyText(items));

  return `mailto:${ORDER_EMAIL}?${params.toString()}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function orderInputId(key: string): string {
  return `order-qty-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

export function renderOrderModalItem(item: OrderItem): string {
  const max = getMaxQuantity(item.stock);
  const outOfStock = max <= 0;
  const unitPrice = item.price !== null ? formatPrice(item.price) : '—';
  const lineTotal =
    item.price !== null && item.quantity > 0
      ? formatPrice(item.price * item.quantity)
      : '—';
  const stockHint =
    item.stock === null
      ? 'Stock non indiqué'
      : outOfStock
        ? 'Rupture de stock'
        : `${item.stock} en stock`;

  const inputId = orderInputId(item.key);

  return `
    <div class="order-item${outOfStock ? ' order-item--unavailable' : ''}" data-order-key="${escapeHtml(item.key)}"${item.price !== null ? ` data-order-price="${item.price}"` : ''}>
      <div class="order-item__info">
        <p class="order-item__label">${escapeHtml(item.label)}</p>
        <p class="order-item__meta">
          <span class="order-item__price">${escapeHtml(unitPrice)}</span>
          <span class="order-item__stock">${escapeHtml(stockHint)}</span>
        </p>
      </div>
      <div class="order-item__controls">
        <label class="order-item__qty-label" for="${inputId}">Qté</label>
        <input
          class="order-item__qty-input"
          type="number"
          id="${inputId}"
          name="quantity"
          value="${item.quantity}"
          min="0"
          max="${max}"
          step="1"
          inputmode="numeric"
          data-order-qty-key="${escapeHtml(item.key)}"
          ${outOfStock ? 'disabled' : ''}
        />
        <span class="order-item__line-total" aria-live="polite">${escapeHtml(lineTotal)}</span>
      </div>
    </div>
  `;
}

export function renderOrderModalList(items: OrderItem[]): string {
  if (items.length === 0) {
    return '<p class="order-modal__empty">Aucune référence dans votre sélection.</p>';
  }

  return items.map(renderOrderModalItem).join('');
}

export function formatOrderTotal(total: number | null, hasActiveItems: boolean): string {
  if (!hasActiveItems) return '—';
  if (total === null) return 'Prix partiel non calculable';
  return formatPrice(total);
}
