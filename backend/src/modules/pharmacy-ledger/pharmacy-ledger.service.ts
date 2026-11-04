import { Injectable } from '@nestjs/common';
import { PharmacyEntity } from '@/modules/pharmacy/entity/pharmacy.entity';
import { PharmacyService } from '@/modules/pharmacy/pharmacy.service';
import { buildPharmacyStatement, CurrencyStatement, UnpaidInvoice } from '@/modules/pharmacy-ledger/helpers/build-pharmacy-statement.helper';
import { PharmacyLedgerRepository } from '@/modules/pharmacy-ledger/repository/pharmacy-ledger.repository';

/**
 * Account statement for one pharmacy.
 */
export interface PharmacyStatement {
  readonly pharmacy: PharmacyEntity;
  readonly currencies: readonly CurrencyStatement[];
  readonly unpaidInvoices: readonly UnpaidInvoice[];
}

/**
 * Reads the pharmacy account from delivered invoices and payments.
 */
@Injectable()
export class PharmacyLedgerService {
  constructor(
    private readonly pharmacyLedgerRepository: PharmacyLedgerRepository,
    private readonly pharmacyService: PharmacyService,
  ) {}
  /**
   * Returns charges, receipts, collections, and the amount still due.
   */
  async getStatement(pharmacyId: number): Promise<PharmacyStatement> {
    const pharmacy = await this.pharmacyService.getPharmacyById(pharmacyId);
    const charges = await this.pharmacyLedgerRepository.listCharges(pharmacyId);
    const credits = await this.pharmacyLedgerRepository.listCredits(pharmacyId);
    const statement = buildPharmacyStatement({ charges, credits, now: new Date() });
    return { pharmacy, ...statement };
  }
}
