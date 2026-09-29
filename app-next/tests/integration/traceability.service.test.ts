/**
 * Prueba del TraceabilityService con repositorios y ledger en memoria.
 * Verifica la orquestación (orden de pasos, estados y recuperación) sin infraestructura.
 */
import type { BlockchainEvidence, TraceabilityEvent } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { FabricError } from '@/lib/fabric/errors';
import type { AcademicRecordRepository } from '@/repositories/academicRecord.repository';
import type { BlockchainEvidenceRepository } from '@/repositories/blockchainEvidence.repository';
import type { TraceabilityEventRepository } from '@/repositories/traceabilityEvent.repository';
import { EvidenceConflictError, EvidenceLinkError, RecordNotFoundError } from '@/services/errors';
import { createTraceabilityService } from '@/services/traceability.service';
import type { AcademicEvidence, AcademicLedger } from '@/types/blockchain';
import type { AcademicRecordWithRelations } from '@/types/academic';
import { sampleRecord, TEST_SECRET } from '../fixtures';

const silentLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const actor = { reference: 'ADM-PSE-001', role: 'ADMINISTRADOR' };

function createHarness() {
  let record: AcademicRecordWithRelations = sampleRecord();
  const evidenceRows = new Map<string, BlockchainEvidence>();
  const eventRows: TraceabilityEvent[] = [];
  const ledgerState = new Map<string, AcademicEvidence>();
  let txCounter = 0;
  let failNextConfirmation = false;

  const records = {
    findByCode: jest.fn(async (code: string) => (code === record.code ? record : null)),
    count: jest.fn(async () => 1),
    rectify: jest.fn(async (_code, change) => {
      record = { ...record, qualitativeGrade: change.qualitativeGrade, numericScore: new Prisma.Decimal(change.numericScore), version: record.version + 1 };
      return record;
    }),
  } as unknown as AcademicRecordRepository;

  const evidences = {
    findByResultAndVersion: jest.fn(async (resultId: number, version: number) =>
      [...evidenceRows.values()].find((e) => e.resultId === resultId && e.version === version) ?? null),
    listByResult: jest.fn(async () => [...evidenceRows.values()]),
    listPending: jest.fn(async () => []),
    savePending: jest.fn(async (input) => {
      const row = { id: evidenceRows.size + 1, algorithm: 'HMAC-SHA-256', txId: null, blockNumber: null, errorMessage: null, createdAt: new Date(), confirmedAt: null, ...input, status: 'PENDIENTE' } as BlockchainEvidence;
      evidenceRows.set(input.evidenceId, row);
      return row;
    }),
    markConfirmed: jest.fn(async (evidenceId: string, c) => {
      if (failNextConfirmation) {
        failNextConfirmation = false;
        throw new Error('MySQL no disponible');
      }
      const row = { ...evidenceRows.get(evidenceId)!, status: 'CONFIRMADO', txId: c.txId, blockNumber: c.blockNumber } as BlockchainEvidence;
      evidenceRows.set(evidenceId, row);
      return row;
    }),
    markFailed: jest.fn(async (evidenceId: string, errorMessage: string) => {
      const row = { ...evidenceRows.get(evidenceId)!, status: 'FALLIDO', errorMessage } as BlockchainEvidence;
      evidenceRows.set(evidenceId, row);
      return row;
    }),
  } as unknown as BlockchainEvidenceRepository;

  const events = {
    create: jest.fn(async (input) => {
      const row = { id: eventRows.length + 1, occurredAt: new Date(), evidenceId: null, txId: null, detail: null, ...input } as TraceabilityEvent;
      eventRows.push(row);
      return row;
    }),
    listByResult: jest.fn(async () => eventRows),
  } as unknown as TraceabilityEventRepository;

  const ledger: AcademicLedger = {
    evidenceExists: jest.fn(async (id: string) => ledgerState.has(id)),
    createEvidence: jest.fn(async (args) => {
      const txId = (++txCounter).toString(16).padStart(64, '0');
      const item: AcademicEvidence = { docType: 'academicEvidence', algorithm: 'HMAC-SHA-256', status: 'REGISTRADO', submitterMspId: 'NuevoHorizonteMSP', timestamp: new Date().toISOString(), txId, ...args };
      ledgerState.set(args.evidenceId, item);
      return { txId, blockNumber: BigInt(txCounter + 3), payload: item };
    }),
    readEvidence: jest.fn(async (id: string) => ledgerState.get(id)!),
    getEvidenceHistory: jest.fn(async (ref: string) => [...ledgerState.values()].filter((e) => e.recordReference === ref)),
  };

  const service = createTraceabilityService({
    records,
    evidences,
    events,
    ledger,
    getSecret: () => TEST_SECRET,
    ledgerTarget: () => ({ channelName: 'academicchannel', chaincodeName: 'academic-traceability' }),
    logger: silentLogger,
  });

  return {
    service,
    ledger,
    evidenceRows,
    eventRows,
    ledgerState,
    tamper: (score: string) => (record = { ...record, numericScore: new Prisma.Decimal(score) }),
    failNextConfirmation: () => (failNextConfirmation = true),
  };
}

describe('TraceabilityService', () => {
  it('registra la evidencia, guarda el TX_ID y crea el evento de trazabilidad', async () => {
    const h = createHarness();
    const result = await h.service.registerAcademicRecordEvidence('REG-000001', actor);

    expect(result.evidenceId).toBe('EVD-REG-000001-V1');
    expect(result.evidence).toMatch(/^[0-9a-f]{64}$/);
    expect(h.ledger.createEvidence).toHaveBeenCalledWith(expect.objectContaining({ recordReference: 'REG-000001', eventType: 'REGISTRO', actorReference: 'ADM-PSE-001' }));
    expect(h.evidenceRows.get('EVD-REG-000001-V1')).toMatchObject({ status: 'CONFIRMADO', txId: result.txId });
    expect(h.eventRows.at(-1)).toMatchObject({ eventType: 'REGISTRO', status: 'CONFIRMADO', txId: result.txId });
  });

  it('no envía datos personales al ledger', async () => {
    const h = createHarness();
    await h.service.registerAcademicRecordEvidence('REG-000001', actor);
    const sent = JSON.stringify((h.ledger.createEvidence as jest.Mock).mock.calls[0][0]);
    expect(sent).not.toMatch(/Docente|De Prueba|15\.50|Matemática/);
  });

  it('es idempotente: un segundo registro de la misma versión no crea otra transacción', async () => {
    const h = createHarness();
    const first = await h.service.registerAcademicRecordEvidence('REG-000001', actor);
    const second = await h.service.registerAcademicRecordEvidence('REG-000001', actor);
    expect(second).toMatchObject({ alreadyRegistered: true, txId: first.txId });
    expect(h.ledger.createEvidence).toHaveBeenCalledTimes(1);
  });

  it('verifica INTEGRO y detecta ALTERADO tras una modificación directa', async () => {
    const h = createHarness();
    await h.service.registerAcademicRecordEvidence('REG-000001', actor);
    await expect(h.service.verifyAcademicRecord('REG-000001', actor)).resolves.toMatchObject({ status: 'INTEGRO', localCopyConsistent: true });

    h.tamper('20.00');
    const altered = await h.service.verifyAcademicRecord('REG-000001', actor);
    expect(altered.status).toBe('ALTERADO');
    expect(altered.computedEvidence).not.toBe(altered.onChain?.evidence);
    await expect(h.service.registerAcademicRecordEvidence('REG-000001', actor)).rejects.toBeInstanceOf(EvidenceConflictError);
  });

  it('informa NO_REGISTRADO cuando no hay evidencia anclada', async () => {
    const h = createHarness();
    await expect(h.service.verifyAcademicRecord('REG-000001', actor)).resolves.toMatchObject({ status: 'NO_REGISTRADO' });
  });

  it('caso 3: registro inexistente', async () => {
    const h = createHarness();
    await expect(h.service.registerAcademicRecordEvidence('REG-999999', actor)).rejects.toBeInstanceOf(RecordNotFoundError);
    expect(h.ledger.createEvidence).not.toHaveBeenCalled();
  });

  it('caso 1: si Fabric falla, el intento queda FALLIDO en MySQL y puede reintentarse', async () => {
    const h = createHarness();
    (h.ledger.createEvidence as jest.Mock).mockRejectedValueOnce(new FabricError('PEER_UNAVAILABLE', 'peer caído'));

    await expect(h.service.registerAcademicRecordEvidence('REG-000001', actor)).rejects.toBeInstanceOf(FabricError);
    expect(h.evidenceRows.get('EVD-REG-000001-V1')).toMatchObject({ status: 'FALLIDO', txId: null });
    expect(h.eventRows.at(-1)).toMatchObject({ status: 'FALLIDO' });

    const retry = await h.service.registerAcademicRecordEvidence('REG-000001', actor);
    expect(h.evidenceRows.get('EVD-REG-000001-V1')).toMatchObject({ status: 'CONFIRMADO', txId: retry.txId });
  });

  it('caso 2: si falla la escritura del TX_ID, el reintento reconcilia sin duplicar la transacción', async () => {
    const h = createHarness();
    h.failNextConfirmation();

    await expect(h.service.registerAcademicRecordEvidence('REG-000001', actor)).rejects.toBeInstanceOf(EvidenceLinkError);
    expect(h.ledgerState.has('EVD-REG-000001-V1')).toBe(true);
    expect(h.evidenceRows.get('EVD-REG-000001-V1')?.status).toBe('PENDIENTE');

    const retry = await h.service.registerAcademicRecordEvidence('REG-000001', actor);
    expect(retry.reconciled).toBe(true);
    expect(h.ledger.createEvidence).toHaveBeenCalledTimes(1);
    expect(h.evidenceRows.get('EVD-REG-000001-V1')).toMatchObject({ status: 'CONFIRMADO', txId: retry.txId });
  });

  it('la rectificación crea una nueva versión On-chain y conserva la anterior', async () => {
    const h = createHarness();
    await h.service.registerAcademicRecordEvidence('REG-000001', actor);
    const rectified = await h.service.rectifyAcademicRecord('REG-000001', { qualitativeGrade: 'AD', numericScore: 18, reason: 'Revisión de rúbrica' }, actor);

    expect(rectified).toMatchObject({ evidenceId: 'EVD-REG-000001-V2', eventType: 'RECTIFICACION' });
    expect([...h.ledgerState.keys()]).toEqual(['EVD-REG-000001-V1', 'EVD-REG-000001-V2']);
    await expect(h.service.verifyAcademicRecord('REG-000001', actor)).resolves.toMatchObject({ status: 'INTEGRO' });

    const report = await h.service.getTraceability('REG-000001');
    expect(report.onChain?.map((e) => e.version)).toEqual([1, 2]);
    expect(report.events.map((e) => e.eventType)).toEqual(['REGISTRO', 'RECTIFICACION', 'VERIFICACION']);
  });

  it('rechaza actores que no sean seudónimos', async () => {
    const h = createHarness();
    await expect(h.service.registerAcademicRecordEvidence('REG-000001', { reference: 'Juan Pérez', role: 'ADMIN' })).rejects.toThrow();
  });
});
