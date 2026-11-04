import { StatementCharge, StatementCredit } from '@/modules/pharmacy-ledger/helpers/build-pharmacy-statement.helper';

/**
 * Read model for a pharmacy account statement.
 */
export abstract class PharmacyLedgerRepository {
  /** Loads delivered invoice charges for one pharmacy. */
  abstract listCharges(pharmacyId: number): Promise<StatementCharge[]>;
  /** Loads payments recorded for one pharmacy. */
  abstract listCredits(pharmacyId: number): Promise<StatementCredit[]>;
}
