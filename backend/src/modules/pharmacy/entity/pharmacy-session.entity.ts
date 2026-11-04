import { BaseEntity } from '@/common/base/base.entity';
import { PharmacySessionZodType } from '@/modules/pharmacy/zod/pharmacy-session.zod';

/**
 * One pharmacy sign-in. A null revokedAt means this session is the active one.
 */
export class PharmacySessionEntity extends BaseEntity {
  pharmacyId!: number;
  revokedAt!: Date | null;
  constructor(data: PharmacySessionZodType) {
    super();
    Object.assign(this, data);
  }
}
