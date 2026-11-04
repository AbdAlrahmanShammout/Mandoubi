import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DependencyFailureException } from '@/common/exceptions/dependency-failure.exception';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const prisma = { $queryRaw: jest.fn() } as unknown as PrismaProviderService;
  const service = new HealthService(prisma);
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('reports liveness without calling the database', () => {
    expect(service.checkLiveness()).toEqual({ status: 'ok' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
  it('reports readiness when the database answers', async () => {
    jest.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([{ ready: 1 }]);
    await expect(service.checkReadiness()).resolves.toEqual({ status: 'ok' });
  });
  it('hides the dependency identity when readiness fails', async () => {
    jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('connect ECONNREFUSED 10.0.0.8:5432'));
    const readiness = service.checkReadiness();
    await expect(readiness).rejects.toBeInstanceOf(DependencyFailureException);
    await expect(readiness).rejects.toThrow('The service is not ready');
  });
});
