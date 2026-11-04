import { InvoiceItemEntity } from '@/modules/invoice/entity/invoice-item.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { sumMoney } from '@/modules/product/helpers/syp-price.helper';

/**
 * Amount stored in one currency.
 */
export interface MoneyTotal {
  readonly currency: InvoiceCurrency;
  readonly amount: string;
}

/**
 * Sums snapshotted line amounts, keeping each currency separate.
 */
export function invoiceTotals(items: readonly InvoiceItemEntity[]): MoneyTotal[] {
  const grouped = new Map<InvoiceCurrency, string[]>();
  for (const item of items) {
    const current = grouped.get(item.currency) ?? [];
    current.push(item.lineAmount);
    grouped.set(item.currency, current);
  }
  return [...grouped.entries()].map(([currency, amounts]) => ({ currency, amount: sumMoney(amounts) }));
}
