/**
 * TraceabilityService con repositorios y ledger en memoria.
 * Verifica la orquestación del flujo H2-06 (estados, idempotencia, encadenamiento y recuperación).
 */
import { Prisma, type EventoTrazabilidad, type EvidenciaBlockchain } from '@prisma/client';
import { FabricError } from '@/lib/fabric/errors';
import type { AcademicRecordRepository } from '@/repositories/academicRecord.repository';
import type { BlockchainEvidenceRepository } from '@/repositories/blockchainEvidence.repository';
import type { EventoConEvidencia, TraceabilityEventRepository } from '@/repositories/traceabilityEvent.repository';
import type { UsuarioRepository } from '@/repositories/usuario.repository';
import { ActorNotFoundError, EvidenceConflictError, EvidenceLinkError, RecordNotFoundError } from '@/services/errors';
import { createTraceabilityService, isCommitmentChainIntact } from '@/services/traceability.service';
import type { ResultadoConRelaciones } from '@/types/academic';
import type { AcademicEvidence, AcademicLedger } from '@/types/blockchain';
import { sampleRecord, TEST_SECRET } from '../fixtures';

const silentLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };

function createHarness() {
  let record: ResultadoConRelaciones = sampleRecord();
  const eventos = new Map<string, EventoTrazabilidad>();
  const evidencias = new Map<string, EvidenciaBlockchain>();
  const ledgerState = new Map<string, AcademicEvidence>();
  let tx = 0;
  let uuid = 0;
  let failNextConfirmation = false;

  const withEvidence = (e: EventoTrazabilidad): EventoConEvidencia => ({ ...e, evidencia: evidencias.get(e.id) ?? null });
  const dataTypes = ['CREACION', 'RECTIFICACION', 'REVOCACION'];

  const records = {
    findByCode: jest.fn(async (code: string) => (code === record.codigo ? record : null)),
    count: jest.fn(async () => 1),
    rectify: jest.fn(async (_code, change) => {
      record = { ...record, puntajeObtenido: new Prisma.Decimal(change.newScore), versionActual: record.versionActual + 1, estado: 'RECTIFICADO' };
      return record;
    }),
  } as unknown as AcademicRecordRepository;

  const events = {
    createPending: jest.fn(async (input) => {
      const row = { ...input, estadoEvento: 'PENDIENTE', errorDetalle: null, creadoEn: new Date(Date.now() + eventos.size), resultadoVerificacion: input.resultadoVerificacion ?? null } as EventoTrazabilidad;
      eventos.set(row.id, row);
      return row;
    }),
    resetToPending: jest.fn(async (id: string, compromisoHmac: string, compromisoAnterior: string | null) => {
      const row = { ...eventos.get(id)!, estadoEvento: 'PENDIENTE', compromisoHmac, compromisoAnterior } as EventoTrazabilidad;
      eventos.set(id, row);
      return row;
    }),
    markError: jest.fn(async (id: string, detail: string) => {
      const row = { ...eventos.get(id)!, estadoEvento: 'ERROR', errorDetalle: detail } as EventoTrazabilidad;
      eventos.set(id, row);
      return row;
    }),
    findDataEvent: jest.fn(async (ref: string, version: number) => {
      const found = [...eventos.values()].filter((e) => e.objetoRef === ref && e.version === version && dataTypes.includes(e.eventoTipo)).at(-1);
      return found ? withEvidence(found) : null;
    }),
    findById: jest.fn(async (id: string) => (eventos.has(id) ? withEvidence(eventos.get(id)!) : null)),
    listByObject: jest.fn(async () => [...eventos.values()].map(withEvidence)),
  } as unknown as TraceabilityEventRepository;

  const evidences = {
    recordConfirmation: jest.fn(async (eventoId: string, c) => {
      if (failNextConfirmation) {
        failNextConfirmation = false;
        throw new Error('MySQL no disponible');
      }
      const ev = { id: BigInt(evidencias.size + 1), eventoId, txId: c.txId, blockNumber: c.blockNumber, committedAt: new Date(), validacion: 'VALIDA', red: c.red, canal: c.canal, chaincode: c.chaincode } as EvidenciaBlockchain;
      evidencias.set(eventoId, ev);
      eventos.set(eventoId, { ...eventos.get(eventoId)!, estadoEvento: 'CONFIRMADO' });
      return ev;
    }),
    findByEventId: jest.fn(async (id: string) => evidencias.get(id) ?? null),
    countValid: jest.fn(async () => evidencias.size),
  } as unknown as BlockchainEvidenceRepository;

  const users = {
    findActor: jest.fn(async (username: string) => (username === 'admin.prototipo' ? { usuarioId: 1n, username, role: 'ADMIN' } : null)),
  } as unknown as UsuarioRepository;

  // Ledger en memoria que aplica las mismas reglas de encadenamiento que el chaincode.
  const ledger: AcademicLedger = {
    evidenceExists: jest.fn(async (id: string) => ledgerState.has(id)),
    createEvidence: jest.fn(async (args) => {
      if (ledgerState.has(args.eventId)) throw new Error(`El evento ${args.eventId} ya existe`);
      const txId = (++tx).toString(16).padStart(64, '0');
      const item: AcademicEvidence = {
        docType: 'academicEvent', algorithm: 'HMAC-SHA-256', status: 'REGISTRADO', submitterMspId: 'NuevoHorizonteMSP',
        timestamp: new Date(Date.now() + tx).toISOString(), txId, ...args,
      };
      ledgerState.set(args.eventId, item);
      return { txId, blockNumber: BigInt(tx + 4), payload: item };
    }),
    readEvidence: jest.fn(async (id: string) => ledgerState.get(id)!),
    getEvidenceHistory: jest.fn(async (_t, ref: string) => [...ledgerState.values()].filter((e) => e.objectRef === ref)),
  };

  const service = createTraceabilityService({
    records, events, evidences, users, ledger,
    getSecret: () => TEST_SECRET,
    ledgerTarget: () => ({ network: 'fabric-academic', channelName: 'academicchannel', chaincodeName: 'academic-traceability' }),
    newEventId: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}`,
    logger: silentLogger,
  });

  return {
    service, ledger, eventos, evidencias, ledgerState,
    tamper: (score: string) => (record = { ...record, puntajeObtenido: new Prisma.Decimal(score) }),
    failNextConfirmation: () => (failNextConfirmation = true),
  };
}

const ACTOR = 'admin.prototipo';

describe('TraceabilityService (flujo H2-06)', () => {
  it('registra: evento PENDIENTE (UUID) → Fabric → evidencia_blockchain con TX_ID → CONFIRMADO', async () => {
    const h = createHarness();
    const r = await h.service.registerAcademicRecordEvidence('REG-0011', ACTOR);

    expect(r).toMatchObject({ eventType: 'CREACION', previousCommitment: null, alreadyRegistered: false });
    expect(r.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(h.ledger.createEvidence).toHaveBeenCalledWith(expect.objectContaining({ objectType: 'RESULTADO', objectRef: 'REG-0011', eventType: 'CREACION', actorRole: 'ADMIN' }));
    expect(h.eventos.get(r.eventId)).toMatchObject({ estadoEvento: 'CONFIRMADO', compromisoHmac: r.commitment });
    expect(h.evidencias.get(r.eventId)).toMatchObject({ txId: r.txId, validacion: 'VALIDA' });
  });

  it('no envía datos académicos ni identidades al ledger', async () => {
    const h = createHarness();
    await h.service.registerAcademicRecordEvidence('REG-0011', ACTOR);
    const sent = JSON.stringify((h.ledger.createEvidence as jest.Mock).mock.calls[0][0]);
    expect(sent).not.toMatch(/STU-|DOC-|19\.00|EV-CTA|INFORME/);
  });

  it('es idempotente: reintentar una versión confirmada no crea otra transacción', async () => {
    const h = createHarness();
    const first = await h.service.registerAcademicRecordEvidence('REG-0011', ACTOR);
    const second = await h.service.registerAcademicRecordEvidence('REG-0011', ACTOR);
    expect(second).toMatchObject({ alreadyRegistered: true, txId: first.txId, eventId: first.eventId });
    expect(h.ledger.createEvidence).toHaveBeenCalledTimes(1);
  });

  it('verifica INTEGRO, registra la verificación y detecta ALTERADO tras una modificación directa', async () => {
    const h = createHarness();
    await h.service.registerAcademicRecordEvidence('REG-0011', ACTOR);
    const ok = await h.service.verifyAcademicRecord('REG-0011', ACTOR);
    expect(ok).toMatchObject({ status: 'INTEGRO', chainIntact: true, localCopyConsistent: true });
    expect(h.eventos.get(ok.verificationEventId!)).toMatchObject({ eventoTipo: 'VERIFICACION', resultadoVerificacion: 'INTEGRO', estadoEvento: 'CONFIRMADO' });

    h.tamper('20.00');
    const altered = await h.service.verifyAcademicRecord('REG-0011', ACTOR);
    expect(altered.status).toBe('ALTERADO');
    expect(h.eventos.get(altered.verificationEventId!)?.resultadoVerificacion).toBe('ALTERADO');
    await expect(h.service.registerAcademicRecordEvidence('REG-0011', ACTOR)).rejects.toBeInstanceOf(EvidenceConflictError);
  });

  it('informa NO_VERIFICABLE cuando no hay evidencia anclada', async () => {
    const h = createHarness();
    await expect(h.service.verifyAcademicRecord('REG-0011', ACTOR)).resolves.toMatchObject({ status: 'NO_VERIFICABLE' });
  });

  it('caso 3: registro inexistente', async () => {
    const h = createHarness();
    await expect(h.service.registerAcademicRecordEvidence('REG-9999', ACTOR)).rejects.toBeInstanceOf(RecordNotFoundError);
    expect(h.ledger.createEvidence).not.toHaveBeenCalled();
  });

  it('rechaza actores inexistentes', async () => {
    const h = createHarness();
    await expect(h.service.registerAcademicRecordEvidence('REG-0011', 'intruso')).rejects.toBeInstanceOf(ActorNotFoundError);
  });

  it('caso 1: si Fabric falla, el evento queda en ERROR y el reintento reutiliza el mismo UUID', async () => {
    const h = createHarness();
    (h.ledger.createEvidence as jest.Mock).mockRejectedValueOnce(new FabricError('PEER_UNAVAILABLE', 'peer caído'));

    await expect(h.service.registerAcademicRecordEvidence('REG-0011', ACTOR)).rejects.toBeInstanceOf(FabricError);
    const [failed] = [...h.eventos.values()];
    expect(failed).toMatchObject({ estadoEvento: 'ERROR', errorDetalle: 'peer caído' });
    expect(h.evidencias.size).toBe(0);

    const retry = await h.service.registerAcademicRecordEvidence('REG-0011', ACTOR);
    expect(retry.eventId).toBe(failed!.id);
    expect(h.eventos.size).toBe(1);
    expect(h.eventos.get(failed!.id)?.estadoEvento).toBe('CONFIRMADO');
  });

  it('caso 2: si falla la escritura del TX_ID, el reintento consulta el ledger por eventId y reconcilia', async () => {
    const h = createHarness();
    h.failNextConfirmation();

    await expect(h.service.registerAcademicRecordEvidence('REG-0011', ACTOR)).rejects.toBeInstanceOf(EvidenceLinkError);
    const [pending] = [...h.eventos.values()];
    expect(pending?.estadoEvento).toBe('PENDIENTE');
    expect(h.ledgerState.has(pending!.id)).toBe(true);

    const retry = await h.service.registerAcademicRecordEvidence('REG-0011', ACTOR);
    expect(retry.reconciled).toBe(true);
    expect(h.ledger.createEvidence).toHaveBeenCalledTimes(1);
    expect(h.evidencias.get(pending!.id)?.txId).toBe(retry.txId);
  });

  it('la rectificación ancla una nueva versión encadenada al compromiso anterior', async () => {
    const h = createHarness();
    const v1 = await h.service.registerAcademicRecordEvidence('REG-0011', ACTOR);
    const v2 = await h.service.rectifyAcademicRecord('REG-0011', { newScore: 17, reasonCode: 'ERROR_DIGITACION', reasonDetail: 'Revisión de rúbrica' }, ACTOR);

    expect(v2).toMatchObject({ eventType: 'RECTIFICACION', previousCommitment: v1.commitment });
    await expect(h.service.verifyAcademicRecord('REG-0011', ACTOR)).resolves.toMatchObject({ status: 'INTEGRO', chainIntact: true });
    const report = await h.service.getTraceability('REG-0011');
    expect(report.onChain?.map((e) => `${e.eventType}:v${e.version}`)).toEqual(['CREACION:v1', 'RECTIFICACION:v2', 'VERIFICACION:v2']);
  });

  it('la rectificación ancla primero la versión vigente si aún no estaba anclada', async () => {
    const h = createHarness();
    await h.service.rectifyAcademicRecord('REG-0011', { newScore: 18, reasonCode: 'ERROR_DIGITACION', reasonDetail: 'Revisión de rúbrica' }, ACTOR);
    expect((h.ledger.createEvidence as jest.Mock).mock.calls.map((c) => c[0].eventType)).toEqual(['CREACION', 'RECTIFICACION']);
  });

  it('rechaza un puntaje de rectificación mayor que el máximo de la actividad', async () => {
    const h = createHarness();
    await expect(h.service.rectifyAcademicRecord('REG-0011', { newScore: 25, reasonCode: 'ERROR_DIGITACION', reasonDetail: 'Revisión' }, ACTOR)).rejects.toThrow('supera el máximo');
  });
});

describe('isCommitmentChainIntact()', () => {
  const ev = (version: number, commitment: string, previousCommitment: string | null) => ({ version, commitment, previousCommitment }) as AcademicEvidence;
  it('acepta una cadena correcta y rechaza eslabones rotos', () => {
    expect(isCommitmentChainIntact([ev(1, 'a', null), ev(2, 'b', 'a')])).toBe(true);
    expect(isCommitmentChainIntact([ev(1, 'a', null), ev(2, 'b', 'x')])).toBe(false);
    expect(isCommitmentChainIntact([ev(2, 'b', 'a')])).toBe(false);
  });
});
