import { Injectable } from '@nestjs/common';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { UnauthenticatedException } from '@/common/exceptions/unauthenticated.exception';
import { AssertActivePharmacySessionInput } from '@/modules/pharmacy/defs/pharmacy-session.defs';
import { PharmacySessionEntity } from '@/modules/pharmacy/entity/pharmacy-session.entity';
import { PharmacySessionRepository } from '@/modules/pharmacy/repository/pharmacy-session.repository';

/**
 * The single server session owned by a pharmacy account.
 */
@Injectable()
export class PharmacySessionService {
  constructor(
    private readonly pharmacySessionRepository: PharmacySessionRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}
  /**
   * Revokes the previous session and stores the new active one.
   */
  async openSession(pharmacyId: number): Promise<PharmacySessionEntity> {
    return this.transactionRunner.run(async (context) => {
      await this.pharmacySessionRepository.revokeActiveByPharmacyId(pharmacyId, context);
      return this.pharmacySessionRepository.create({ pharmacyId }, context);
    });
  }
  /**
   * Fails when the session is missing, revoked, or belongs to another pharmacy.
   */
  async assertActiveSession(input: AssertActivePharmacySessionInput): Promise<void> {
    const session = await this.pharmacySessionRepository.findById(input.sessionId);
    if (!session || session.revokedAt !== null || session.pharmacyId !== input.pharmacyId) {
      throw new UnauthenticatedException();
    }
  }
  /**
   * Revokes the pharmacy's active session so the current access token is rejected.
   */
  async closeSession(pharmacyId: number): Promise<void> {
    await this.pharmacySessionRepository.revokeActiveByPharmacyId(pharmacyId);
  }
}
