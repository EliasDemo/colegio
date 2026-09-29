import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

/**
 * Evidencia académica On-chain. Solo contiene referencias seudónimas y el HMAC del registro;
 * nunca nombres, documentos de identidad, notas completas ni otros datos personales.
 */
export interface AcademicEvidence {
  docType: 'academicEvidence';
  evidenceId: string;
  recordReference: string;
  eventType: EventType;
  version: number;
  evidence: string;
  algorithm: 'HMAC-SHA-256';
  actorReference: string;
  actorRole: string;
  submitterMspId: string;
  timestamp: string;
  status: 'REGISTRADO';
  txId: string;
}

type EventType = 'REGISTRO' | 'RECTIFICACION';

/** Índice compuesto registro~versión para recorrer el historial de un registro. */
export const RECORD_VERSION_INDEX = 'record~version';

const RECORD_PATTERN = /^REG-\d{6}$/;
const ACTOR_PATTERN = /^(EST|DOC|ADM|AUD)-PSE-\d{3}$/;
const ROLE_PATTERN = /^[A-Z_]{3,30}$/;
const HMAC_PATTERN = /^[0-9a-f]{64}$/;
const EVENT_TYPES: EventType[] = ['REGISTRO', 'RECTIFICACION'];

const padVersion = (version: number) => String(version).padStart(6, '0');

/** JSON con claves ordenadas: todos los peers endosantes deben producir exactamente los mismos bytes. */
function stableStringify(value: Record<string, unknown>): string {
  const sorted = Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = value[key];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

function assertMatches(value: string, pattern: RegExp, field: string): void {
  if (!pattern.test(value)) {
    throw new Error(`Valor inválido para ${field}: se requiere una referencia seudónima o técnica válida`);
  }
}

@Info({
  title: 'AcademicTraceabilityContract',
  description: 'Registro y consulta de evidencias criptográficas de registros académicos',
})
export class AcademicTraceabilityContract extends Contract {
  constructor() {
    super('AcademicTraceabilityContract');
  }

  @Transaction(false)
  @Returns('boolean')
  public async academicEvidenceExists(ctx: Context, evidenceId: string): Promise<boolean> {
    const data = await ctx.stub.getState(evidenceId);
    return data !== undefined && data.length > 0;
  }

  /**
   * Ancla la evidencia de una versión de un registro académico. Es inmutable:
   * una rectificación se registra como una nueva versión, nunca sobrescribe la anterior.
   */
  @Transaction()
  @Returns('string')
  public async createAcademicEvidence(
    ctx: Context,
    evidenceId: string,
    recordReference: string,
    eventType: string,
    version: string,
    evidence: string,
    actorReference: string,
    actorRole: string,
  ): Promise<string> {
    assertMatches(recordReference, RECORD_PATTERN, 'recordReference');
    assertMatches(actorReference, ACTOR_PATTERN, 'actorReference');
    assertMatches(actorRole, ROLE_PATTERN, 'actorRole');
    assertMatches(evidence, HMAC_PATTERN, 'evidence');
    if (!EVENT_TYPES.includes(eventType as EventType)) {
      throw new Error(`Tipo de evento no permitido: ${eventType}`);
    }

    const versionNumber = Number(version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      throw new Error(`Versión inválida: ${version}`);
    }
    if (evidenceId !== `EVD-${recordReference}-V${versionNumber}`) {
      throw new Error(`evidenceId inconsistente: se esperaba EVD-${recordReference}-V${versionNumber}`);
    }
    if ((versionNumber === 1) !== (eventType === 'REGISTRO')) {
      throw new Error('La versión 1 debe ser REGISTRO y las versiones posteriores RECTIFICACION');
    }
    if (await this.academicEvidenceExists(ctx, evidenceId)) {
      throw new Error(`La evidencia ${evidenceId} ya existe`);
    }
    if (versionNumber > 1) {
      const previousKey = ctx.stub.createCompositeKey(RECORD_VERSION_INDEX, [recordReference, padVersion(versionNumber - 1)]);
      const previous = await ctx.stub.getState(previousKey);
      if (!previous || previous.length === 0) {
        throw new Error(`No existe la versión ${versionNumber - 1} del registro ${recordReference}`);
      }
    }

    const academicEvidence: AcademicEvidence = {
      docType: 'academicEvidence',
      evidenceId,
      recordReference,
      eventType: eventType as EventType,
      version: versionNumber,
      evidence,
      algorithm: 'HMAC-SHA-256',
      actorReference,
      actorRole,
      submitterMspId: ctx.clientIdentity.getMSPID(),
      // Hora de la propuesta de transacción: es idéntica en todos los peers endosantes (determinista).
      timestamp: ctx.stub.getDateTimestamp().toISOString(),
      status: 'REGISTRADO',
      txId: ctx.stub.getTxID(),
    };

    const serialized = stableStringify(academicEvidence as unknown as Record<string, unknown>);
    await ctx.stub.putState(evidenceId, Buffer.from(serialized));
    const indexKey = ctx.stub.createCompositeKey(RECORD_VERSION_INDEX, [recordReference, padVersion(versionNumber)]);
    await ctx.stub.putState(indexKey, Buffer.from(evidenceId));
    ctx.stub.setEvent('AcademicEvidenceCreated', Buffer.from(JSON.stringify({ evidenceId, recordReference, version: versionNumber })));

    return serialized;
  }

  @Transaction(false)
  @Returns('string')
  public async readAcademicEvidence(ctx: Context, evidenceId: string): Promise<string> {
    const data = await ctx.stub.getState(evidenceId);
    if (!data || data.length === 0) {
      throw new Error(`No existe evidencia ${evidenceId}`);
    }
    return Buffer.from(data).toString('utf8');
  }

  /** Todas las versiones ancladas de un registro, ordenadas por versión. */
  @Transaction(false)
  @Returns('string')
  public async getAcademicEvidenceHistory(ctx: Context, recordReference: string): Promise<string> {
    assertMatches(recordReference, RECORD_PATTERN, 'recordReference');
    const iterator = await ctx.stub.getStateByPartialCompositeKey(RECORD_VERSION_INDEX, [recordReference]);
    const results: AcademicEvidence[] = [];
    try {
      let item = await iterator.next();
      while (!item.done) {
        const evidenceId = Buffer.from(item.value.value).toString('utf8');
        const data = await ctx.stub.getState(evidenceId);
        if (data && data.length > 0) {
          results.push(JSON.parse(Buffer.from(data).toString('utf8')) as AcademicEvidence);
        }
        item = await iterator.next();
      }
    } finally {
      await iterator.close();
    }
    results.sort((a, b) => a.version - b.version);
    return JSON.stringify(results);
  }

  /** Historial de modificaciones de una clave en el ledger (debe tener una sola escritura). */
  @Transaction(false)
  @Returns('string')
  public async getAcademicEvidenceKeyHistory(ctx: Context, evidenceId: string): Promise<string> {
    const iterator = await ctx.stub.getHistoryForKey(evidenceId);
    const history: Array<{ txId: string; isDelete: boolean; timestamp: string }> = [];
    try {
      let item = await iterator.next();
      while (!item.done) {
        const seconds = Number(item.value.timestamp.seconds);
        history.push({
          txId: item.value.txId,
          isDelete: item.value.isDelete,
          timestamp: new Date(seconds * 1000).toISOString(),
        });
        item = await iterator.next();
      }
    } finally {
      await iterator.close();
    }
    return JSON.stringify(history);
  }
}
