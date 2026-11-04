/**
 * Identity and audit fields shared by every persisted aggregate.
 */
export abstract class BaseEntity {
  id!: number;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;
}
