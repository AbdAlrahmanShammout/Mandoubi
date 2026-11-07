import { Injectable } from '@nestjs/common';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { Page, normalizePage } from '@/common/paging/page';
import { InvoiceService } from '@/modules/invoice/invoice.service';
import { NotificationAudience } from '@/modules/notification/enum/notification-audience.enum';
import { NotificationKind } from '@/modules/notification/enum/notification-kind.enum';
import { NotificationService } from '@/modules/notification/notification.service';
import { OrderEntity } from '@/modules/order/entity/order.entity';
import { OrderLineInput, OrderableProduct, prepareOrderInvoices } from '@/modules/order/helpers/prepare-order-invoices.helper';
import { OrderRepository, OrderSearchInput } from '@/modules/order/repository/order.repository';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { ProductService } from '@/modules/product/product.service';

/**
 * Pharmacy submission that is split into one invoice per category.
 */
interface SubmitOrderInput {
  readonly pharmacyId: number;
  readonly items: readonly OrderLineInput[];
}

/**
 * Splits a pharmacy submission and keeps the captured invoices readable.
 */
@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly invoiceService: InvoiceService,
    private readonly productService: ProductService,
    private readonly notificationService: NotificationService,
    private readonly transactionRunner: TransactionRunner,
  ) {}
  /**
   * Creates one order and one invoice per category present in the lines.
   */
  async submitOrder(input: SubmitOrderInput): Promise<OrderEntity> {
    const products = await this.loadProducts(input.items);
    const prepared = prepareOrderInvoices({ lines: input.items, products, now: new Date() });
    const orderId = await this.transactionRunner.run(async (context) => {
      const order = await this.orderRepository.create({ pharmacyId: input.pharmacyId }, context);
      for (const invoice of prepared) {
        await this.invoiceService.createInvoice({ orderId: order.id, category: invoice.category, items: invoice.items }, context);
      }
      await this.notificationService.notify({
        audience: NotificationAudience.ADMIN,
        audienceId: null,
        kind: NotificationKind.ORDER_SUBMITTED,
        title: 'New order',
        body: `Order ${order.id} was submitted`,
        resourceType: 'order',
        resourceId: order.id,
      }, context);
      return order.id;
    });
    return this.getOrderById(orderId);
  }
  /**
   * Lists every submitted order for review.
   */
  async listOrders(): Promise<OrderEntity[]> {
    return this.orderRepository.list();
  }
  /**
   * Searches orders on the server and returns one page plus the match count.
   */
  async searchOrders(input: Omit<OrderSearchInput, 'limit' | 'offset'> & { readonly limit?: number; readonly offset?: number }): Promise<Page<OrderEntity>> {
    const page = normalizePage(input.limit, input.offset);
    const createdFrom = input.createdFrom;
    const createdTo = input.createdTo;
    const result = await this.orderRepository.search({ ...input, createdFrom, createdTo, ...page });
    return { ...result, ...page };
  }
  /**
   * Lists the orders that belong to one pharmacy.
   */
  async listOrdersForPharmacy(pharmacyId: number): Promise<OrderEntity[]> {
    return this.orderRepository.listByPharmacyId(pharmacyId);
  }
  /**
   * Loads one order, its pharmacy, and its invoices.
   */
  async getOrderById(id: number): Promise<OrderEntity> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new ResourceNotFoundException('Order', id);
    }
    return order;
  }
  /**
   * Loads an order only when it belongs to the signed-in pharmacy.
   */
  async getOrderForPharmacy(orderId: number, pharmacyId: number): Promise<OrderEntity> {
    const order = await this.getOrderById(orderId);
    if (order.pharmacyId !== pharmacyId) {
      throw new ResourceNotFoundException('Order', orderId);
    }
    return order;
  }
  private async loadProducts(items: readonly OrderLineInput[]): Promise<OrderableProduct[]> {
    const products = await Promise.all(items.map((item) => this.productService.getProductById(item.productId)));
    return products.map((product) => toOrderableProduct(product));
  }
}

function toOrderableProduct(product: ProductEntity): OrderableProduct {
  const primary = product.stocks?.find((stock) => stock.isPrimary);
  if (!primary) {
    throw new InvalidStateException({ message: 'The product has no primary warehouse', code: 'PRIMARY_WAREHOUSE_MISSING' });
  }
  return {
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    status: product.status,
    availability: product.availability,
    category: product.category,
    saleUnit: product.saleUnit,
    minimumOrderQuantity: product.minimumOrderQuantity,
    maximumOrderQuantity: product.maximumOrderQuantity,
    invoiceCurrency: product.invoiceCurrency,
    pharmacyPriceUsd: product.pharmacyPriceUsd,
    pharmacyPriceSyp: product.pharmacyPriceSyp,
    consumerPriceUsd: product.consumerPriceUsd,
    consumerPriceSyp: product.consumerPriceSyp,
    offerActive: product.offerActive,
    offerPaidUnits: product.offerPaidUnits,
    offerFreeUnits: product.offerFreeUnits,
    offerStartsAt: product.offerStartsAt,
    offerEndsAt: product.offerEndsAt,
    primaryWarehouseId: primary.warehouseId,
    availableQuantity: primary.quantity - primary.reservedQuantity,
  };
}
