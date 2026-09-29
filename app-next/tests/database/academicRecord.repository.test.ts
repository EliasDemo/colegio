import type { PrismaClient } from '@prisma/client';
import { ACADEMIC_RECORD_INCLUDE, createAcademicRecordRepository } from '@/repositories/academicRecord.repository';
import { sampleRecord } from '../fixtures';

function prismaMock() {
  const tx = {
    academicResult: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(sampleRecord()),
      update: jest.fn().mockResolvedValue(sampleRecord({ version: 2 })),
    },
    academicResultHistory: { create: jest.fn().mockResolvedValue({}) },
  };
  const db = {
    academicResult: { findUnique: jest.fn().mockResolvedValue(sampleRecord()), count: jest.fn().mockResolvedValue(120) },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  return { db, tx, repository: createAcademicRecordRepository(db as unknown as PrismaClient) };
}

describe('AcademicRecordRepository', () => {
  it('busca por código con las relaciones necesarias y sin datos personales', async () => {
    const { db, repository } = prismaMock();
    const record = await repository.findByCode('REG-000001');
    expect(db.academicResult.findUnique).toHaveBeenCalledWith({ where: { code: 'REG-000001' }, include: ACADEMIC_RECORD_INCLUDE });
    expect(record?.code).toBe('REG-000001');
    expect(JSON.stringify(ACADEMIC_RECORD_INCLUDE)).not.toContain('identity');
  });

  it('cuenta los registros', async () => {
    const { repository } = prismaMock();
    await expect(repository.count()).resolves.toBe(120);
  });

  it('rectifica en una transacción: guarda historial y luego incrementa la versión', async () => {
    const { db, tx, repository } = prismaMock();
    const updated = await repository.rectify('REG-000001', { qualitativeGrade: 'AD', numericScore: 18, reason: 'Revisión' }, 'DOC-PSE-001');

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.academicResultHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ resultId: 1, version: 1, qualitativeGrade: 'A', changeReason: 'Revisión', changedByReference: 'DOC-PSE-001' }),
    });
    const updateArgs = tx.academicResult.update.mock.calls[0][0];
    expect(updateArgs.data.version).toEqual({ increment: 1 });
    expect(updateArgs.data.qualitativeGrade).toBe('AD');
    expect(updateArgs.data.numericScore.toFixed(2)).toBe('18.00');
    expect(tx.academicResultHistory.create.mock.invocationCallOrder[0]!).toBeLessThan(tx.academicResult.update.mock.invocationCallOrder[0]!);
    expect(updated.version).toBe(2);
  });
});
