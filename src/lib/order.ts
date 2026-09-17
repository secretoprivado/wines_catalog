import { formatPrice, formatVintage } from './format';
import { getSpiritKey, getWineKey } from './selection';
import type { Spirit, Wine } from './types';

export const ORDER_EMAIL = 'cavesecretoprivado@proton.me';
export const ORDER_CAVE_NAME = 'La Cave Secretoprivado';
export const ORDER_CAVE_TAGLINE = 'Cave Privée · Madrid';
export const ORDER_DETAILS_STORAGE_KEY = 'wines_catalog_order_details';

export interface OrderCustomerDetails {
  name: string;
  addressLine: string;
  postalCode: string;
  city: string;
}

export const EMPTY_ORDER_CUSTOMER_DETAILS: OrderCustomerDetails = {
  name: '',
  addressLine: '',
  postalCode: '',
  city: '',
};

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

let orderDetailsMemoryFallback: OrderCustomerDetails = { ...EMPTY_ORDER_CUSTOMER_DETAILS };

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function loadOrderCustomerDetails(): OrderCustomerDetails {
  if (!canUseStorage()) return { ...orderDetailsMemoryFallback };

  try {
    const raw = localStorage.getItem(ORDER_DETAILS_STORAGE_KEY);
    if (!raw) return { ...EMPTY_ORDER_CUSTOMER_DETAILS };
    const parsed = JSON.parse(raw) as Partial<OrderCustomerDetails>;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      addressLine: typeof parsed.addressLine === 'string' ? parsed.addressLine : '',
      postalCode: typeof parsed.postalCode === 'string' ? parsed.postalCode : '',
      city: typeof parsed.city === 'string' ? parsed.city : '',
    };
  } catch {
    return { ...orderDetailsMemoryFallback };
  }
}

export function saveOrderCustomerDetails(details: OrderCustomerDetails): void {
  orderDetailsMemoryFallback = { ...details };
  if (!canUseStorage()) return;

  try {
    localStorage.setItem(ORDER_DETAILS_STORAGE_KEY, JSON.stringify(details));
  } catch {
    // Ignore quota or privacy mode errors.
  }
}

export function isOrderCustomerDetailsComplete(details: OrderCustomerDetails): boolean {
  return (
    details.name.trim() !== '' &&
    details.addressLine.trim() !== '' &&
    details.postalCode.trim() !== '' &&
    details.city.trim() !== ''
  );
}

export interface OrderSummary {
  referenceCount: number;
  bottleCount: number;
}

export function summarizeOrder(items: OrderItem[]): OrderSummary {
  const active = items.filter((item) => item.quantity > 0);
  return {
    referenceCount: active.length,
    bottleCount: active.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function formatOrderDateTime(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

function formatOrderSummaryLine(summary: OrderSummary): string {
  const refs =
    summary.referenceCount === 1
      ? '1 référence'
      : `${summary.referenceCount} références`;
  const bottles =
    summary.bottleCount === 1 ? '1 bouteille' : `${summary.bottleCount} bouteilles`;
  return `${refs} · ${bottles}`;
}

const ORDER_SECTION_SEPARATOR = '---';

function renderOrderItemBlock(item: OrderItem, index: number): string {
  const qtyLine = `Qté : ${item.quantity} btl.`;

  if (item.price === null) {
    return `${index}. ${item.label}\n   ${qtyLine} · prix sur demande`;
  }

  const unitPrice = formatPrice(item.price);
  const lineTotal = formatPrice(item.price * item.quantity);
  return `${index}. ${item.label}\n   ${qtyLine} · ${unitPrice}/btl. · Sous-total TTC : ${lineTotal}`;
}

function renderOrderItems(sectionItems: OrderItem[], startIndex: number): string {
  if (sectionItems.length === 0) return '';

  return sectionItems
    .map((item, offset) => renderOrderItemBlock(item, startIndex + offset))
    .join('\n\n');
}

function renderOrderCategorySection(
  label: string,
  sectionItems: OrderItem[],
  startIndex: number,
): string {
  if (sectionItems.length === 0) return '';

  return `--- ${label}\n\n${renderOrderItems(sectionItems, startIndex)}`;
}

function formatDeliveryAddress(details: OrderCustomerDetails): string {
  const name = details.name.trim();
  const line = details.addressLine.trim();
  const postal = details.postalCode.trim();
  const city = details.city.trim();
  const cityLine = [postal, city].filter(Boolean).join(' ');

  const parts: string[] = [];
  if (name) parts.push(`Nom : ${name}`);
  parts.push('À livrer à :');
  if (line) parts.push(line);
  if (cityLine) parts.push(cityLine);

  return parts.join('\n');
}

const ORDER_PRICE_DISCLAIMER =
  'Montants indicatifs selon le catalogue en ligne. Disponibilité confirmée à réception. Frais de livraison et droits éventuels non inclus.';

export function buildOrderSubject(details: OrderCustomerDetails): string {
  const name = details.name.trim();
  if (!name) return 'Commande';
  return `Commande ${name}`;
}

export function buildOrderBodyText(
  items: OrderItem[],
  details: OrderCustomerDetails,
  orderedAt: Date = new Date(),
): string {
  const active = items.filter((item) => item.quantity > 0);
  const summary = summarizeOrder(active);
  const wines = active.filter((item) => item.kind === 'wine');
  const spirits = active.filter((item) => item.kind === 'spirit');

  const total = computeOrderTotal(active);
  const hasMissingPrice = active.some((item) => item.price === null);

  const bodyParts: string[] = [
    `Commande — ${ORDER_CAVE_NAME}`,
    ORDER_CAVE_TAGLINE,
    `Date : ${formatOrderDateTime(orderedAt)}`,
    '',
    'Bonjour,',
    '',
    'Je souhaite passer commande pour les références ci-dessous.',
    '',
    `Récapitulatif : ${formatOrderSummaryLine(summary)}`,
    '',
  ];

  const itemBlocks: string[] = [];
  if (wines.length > 0) itemBlocks.push(renderOrderCategorySection('vins', wines, 1));
  if (spirits.length > 0) {
    itemBlocks.push(renderOrderCategorySection('spiritueux', spirits, wines.length + 1));
  }

  if (itemBlocks.length > 0) {
    bodyParts.push(itemBlocks.join('\n\n'));
  }

  if (active.length > 0) {
    bodyParts.push('');
    if (total !== null) {
      bodyParts.push(`Total indicatif TTC : ${formatPrice(total)}`);
    } else {
      bodyParts.push(
        'Total indicatif : non calculable (prix manquant sur une ou plusieurs références)',
      );
    }

    if (hasMissingPrice && total !== null) {
      bodyParts.push('(Certaines lignes sont à confirmer — prix sur demande)');
    }

    bodyParts.push('');
  }

  bodyParts.push(
    ORDER_SECTION_SEPARATOR,
    '',
    formatDeliveryAddress(details),
    '',
    ORDER_PRICE_DISCLAIMER,
  );

  return bodyParts.join('\n');
}

export function buildOrderMailtoUrl(
  items: OrderItem[],
  details: OrderCustomerDetails,
  orderedAt: Date = new Date(),
): string {
  const params = new URLSearchParams();
  params.set('subject', buildOrderSubject(details));
  params.set('body', buildOrderBodyText(items, details, orderedAt));

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
        <span class="order-item__line-amount" aria-live="polite">
          <span class="order-item__line-total">${escapeHtml(lineTotal)}</span>${item.price !== null ? `<span class="order-item__line-ttc"${item.quantity > 0 ? '' : ' hidden'}>TTC</span>` : ''}
        </span>
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
