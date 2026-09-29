import type { PrismaClient } from '@prisma/client';
import { createAcademicRecordRepository, RESULTADO_INCLUDE } from '@/repositories/academicRecord.repository';
import { sampleRecord } from '../fixtures';

function prismaMock() {
  const tx = {
    resultadoAcademico: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(sampleRecord()),
      update: jest.fn().mockResolvedValue(sampleRecord({ versionActual: 2, estado: 'RECTIFICADO' })),
    },
    historialResultado: { create: jest.fn().mockResolvedValue({}) },
  };
  const db = {
    resultadoAcademico: { findUnique: jest.fn().mockResolvedValue(sampleRecord()), count: jest.fn().mockResolvedValue(147) },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  return { db, tx, repository: createAcademicRecordRepository(db as unknown as PrismaClient) };
}

describe('AcademicRecordRepository', () => {
  it('busca por código con las relaciones del modelo del Hito 2', async () => {
    const { db, repository } = prismaMock();
    const record = await repository.findByCode('REG-0011');
    expect(db.resultadoAcademico.findUnique).toHaveBeenCalledWith({ where: { codigo: 'REG-0011' }, include: RESULTADO_INCLUDE });
    expect(record?.matricula.estudiante.tokenEstudiante).toBe('STU-54134667DA103F7B');
  });

  it('cuenta los registros', async () => {
    const { repository } = prismaMock();
    await expect(repository.count()).resolves.toBe(147);
  });

  it('rectifica en una transacción: historial con motivo y luego nueva versión RECTIFICADO', async () => {
    const { db, tx, repository } = prismaMock();
    const updated = await repository.rectify('REG-0011', { newScore: 17, reasonCode: 'ERROR_DIGITACION', reasonDetail: 'Revisión' }, 1n);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.historialResultado.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ resultadoId: 11n, version: 2, tipoCambio: 'RECTIFICACION', motivoCodigo: 'ERROR_DIGITACION', motivoDetalle: 'Revisión', realizadoPor: 1n }),
    });
    const hist = tx.historialResultado.create.mock.calls[0][0].data;
    expect(hist.puntajeAnterior.toFixed(2)).toBe('19.00');
    expect(hist.puntajeNuevo.toFixed(2)).toBe('17.00');
    const updateArgs = tx.resultadoAcademico.update.mock.calls[0][0];
    expect(updateArgs.data).toMatchObject({ versionActual: 2, estado: 'RECTIFICADO' });
    expect(tx.historialResultado.create.mock.invocationCallOrder[0]!).toBeLessThan(tx.resultadoAcademico.update.mock.invocationCallOrder[0]!);
    expect(updated.versionActual).toBe(2);
  });
});
