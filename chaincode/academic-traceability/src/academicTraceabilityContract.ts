import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

/**
 * Evento académico On-chain (payload mínimo del Hito 2, documento H2-03).
 * Solo referencias técnicas y el compromiso HMAC; nunca nombres, DNI, notas ni texto libre.
 */
export interface AcademicEvent {
  docType: 'academicEvent';
  eventId: string;
  objectType: ObjectType;
  objectRef: string;
  eventType: EventType;
  version: number;
  commitment: string;
  previousCommitment: string | null;
  algorithm: 'HMAC-SHA-256';
  actorRole: string;
  submitterMspId: string;
  timestamp: string;
  status: 'REGISTRADO';
  txId: string;
}

type ObjectType = 'RESULTADO' | 'ACTIVIDAD' | 'ASISTENCIA';
type EventType = 'CREACION' | 'RECTIFICACION' | 'VERIFICACION' | 'REVOCACION';

/** Índice de versiones de datos: (objeto, referencia, versión) → eventId. */
export const VERSION_INDEX = 'object~ref~version';
/** Índice de todos los eventos de un objeto: (objeto, referencia, eventId). */
export const EVENT_INDEX = 'object~ref~event';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REF_PATTERN = /^[A-Z]{2,4}-[0-9A-Z]{3,12}$/;
const ROLE_PATTERN = /^[A-Z_]{3,40}$/;
const HMAC_PATTERN = /^[0-9a-f]{64}$/;
const OBJECT_TYPES: ObjectType[] = ['RESULTADO', 'ACTIVIDAD', 'ASISTENCIA'];
const EVENT_TYPES: EventType[] = ['CREACION', 'RECTIFICACION', 'VERIFICACION', 'REVOCACION'];

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
    throw new Error(`Valor inválido para ${field}: se requiere una referencia técnica o un compromiso válido`);
  }
}

@Info({
  title: 'AcademicTraceabilityContract',
  description: 'Registro y consulta de eventos de trazabilidad académica con compromiso criptográfico',
})
export class AcademicTraceabilityContract extends Contract {
  constructor() {
    super('AcademicTraceabilityContract');
  }

  @Transaction(false)
  @Returns('boolean')
  public async academicEvidenceExists(ctx: Context, eventId: string): Promise<boolean> {
    const data = await ctx.stub.getState(eventId);
    return data !== undefined && data.length > 0;
  }

  /**
   * Registra un evento inmutable. Reglas:
   *  - CREACION: versión 1, sin compromiso anterior.
   *  - RECTIFICACION / REVOCACION: versión n > 1; debe existir la versión n-1 y previousCommitment
   *    debe ser exactamente su compromiso (encadenamiento verificable de versiones).
   *  - VERIFICACION: no crea versión; exige que el objeto tenga al menos una versión anclada.
   *  - Un mismo eventId no puede registrarse dos veces (reintentos idempotentes).
   */
  @Transaction()
  @Returns('string')
  public async createAcademicEvidence(
    ctx: Context,
    eventId: string,
    objectType: string,
    objectRef: string,
    eventType: string,
    version: string,
    commitment: string,
    previousCommitment: string,
    actorRole: string,
  ): Promise<string> {
    assertMatches(eventId, UUID_PATTERN, 'eventId');
    assertMatches(objectRef, REF_PATTERN, 'objectRef');
    assertMatches(commitment, HMAC_PATTERN, 'commitment');
    assertMatches(actorRole, ROLE_PATTERN, 'actorRole');
    if (previousCommitment !== '') assertMatches(previousCommitment, HMAC_PATTERN, 'previousCommitment');
    if (!OBJECT_TYPES.includes(objectType as ObjectType)) throw new Error(`Tipo de objeto no permitido: ${objectType}`);
    if (!EVENT_TYPES.includes(eventType as EventType)) throw new Error(`Tipo de evento no permitido: ${eventType}`);

    const versionNumber = Number(version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new Error(`Versión inválida: ${version}`);
    if (await this.academicEvidenceExists(ctx, eventId)) throw new Error(`El evento ${eventId} ya existe`);

    const versionKey = (v: number) => ctx.stub.createCompositeKey(VERSION_INDEX, [objectType, objectRef, padVersion(v)]);
    const readVersion = async (v: number): Promise<AcademicEvent | null> => {
      const pointer = await ctx.stub.getState(versionKey(v));
      if (!pointer || pointer.length === 0) return null;
      const data = await ctx.stub.getState(Buffer.from(pointer).toString('utf8'));
      return JSON.parse(Buffer.from(data).toString('utf8')) as AcademicEvent;
    };

    if (eventType === 'VERIFICACION') {
      if (!(await readVersion(1))) throw new Error(`No existe la versión 1 de ${objectRef}: no se puede verificar`);
    } else {
      if (await readVersion(versionNumber)) throw new Error(`La versión ${versionNumber} de ${objectRef} ya existe`);
      if (eventType === 'CREACION') {
        if (versionNumber !== 1) throw new Error('CREACION debe registrarse con la versión 1');
        if (previousCommitment !== '') throw new Error('CREACION no admite compromiso anterior');
      } else {
        if (versionNumber === 1) throw new Error(`${eventType} requiere una versión mayor que 1`);
        const prior = await readVersion(versionNumber - 1);
        if (!prior) throw new Error(`No existe la versión ${versionNumber - 1} de ${objectRef}`);
        if (prior.commitment !== previousCommitment) {
          throw new Error(`El compromiso anterior no coincide con la versión ${versionNumber - 1} registrada`);
        }
      }
    }

    const event: AcademicEvent = {
      docType: 'academicEvent',
      eventId,
      objectType: objectType as ObjectType,
      objectRef,
      eventType: eventType as EventType,
      version: versionNumber,
      commitment,
      previousCommitment: previousCommitment === '' ? null : previousCommitment,
      algorithm: 'HMAC-SHA-256',
      actorRole,
      submitterMspId: ctx.clientIdentity.getMSPID(),
      // Hora de la propuesta de transacción: idéntica en todos los peers endosantes (determinista).
      timestamp: ctx.stub.getDateTimestamp().toISOString(),
      status: 'REGISTRADO',
      txId: ctx.stub.getTxID(),
    };

    const serialized = stableStringify(event as unknown as Record<string, unknown>);
    await ctx.stub.putState(eventId, Buffer.from(serialized));
    await ctx.stub.putState(ctx.stub.createCompositeKey(EVENT_INDEX, [objectType, objectRef, eventId]), Buffer.from('\u0000'));
    if (eventType !== 'VERIFICACION') await ctx.stub.putState(versionKey(versionNumber), Buffer.from(eventId));
    ctx.stub.setEvent('AcademicEventRegistered', Buffer.from(JSON.stringify({ eventId, objectType, objectRef, eventType, version: versionNumber })));

    return serialized;
  }

  @Transaction(false)
  @Returns('string')
  public async readAcademicEvidence(ctx: Context, eventId: string): Promise<string> {
    const data = await ctx.stub.getState(eventId);
    if (!data || data.length === 0) throw new Error(`No existe evidencia ${eventId}`);
    return Buffer.from(data).toString('utf8');
  }

  /** Todos los eventos de un objeto (datos y verificaciones), en orden cronológico. */
  @Transaction(false)
  @Returns('string')
  public async getAcademicEvidenceHistory(ctx: Context, objectType: string, objectRef: string): Promise<string> {
    if (!OBJECT_TYPES.includes(objectType as ObjectType)) throw new Error(`Tipo de objeto no permitido: ${objectType}`);
    assertMatches(objectRef, REF_PATTERN, 'objectRef');
    const iterator = await ctx.stub.getStateByPartialCompositeKey(EVENT_INDEX, [objectType, objectRef]);
    const events: AcademicEvent[] = [];
    try {
      let item = await iterator.next();
      while (!item.done) {
        const { attributes } = ctx.stub.splitCompositeKey(item.value.key);
        const data = await ctx.stub.getState(attributes[2]!);
        if (data && data.length > 0) events.push(JSON.parse(Buffer.from(data).toString('utf8')) as AcademicEvent);
        item = await iterator.next();
      }
    } finally {
      await iterator.close();
    }
    events.sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.version - b.version);
    return JSON.stringify(events);
  }

  /** Historial de escrituras de una clave del ledger (un evento debe tener una sola escritura). */
  @Transaction(false)
  @Returns('string')
  public async getAcademicEvidenceKeyHistory(ctx: Context, eventId: string): Promise<string> {
    const iterator = await ctx.stub.getHistoryForKey(eventId);
    const history: Array<{ txId: string; isDelete: boolean; timestamp: string }> = [];
    try {
      let item = await iterator.next();
      while (!item.done) {
        history.push({
          txId: item.value.txId,
          isDelete: item.value.isDelete,
          timestamp: new Date(Number(item.value.timestamp.seconds) * 1000).toISOString(),
        });
        item = await iterator.next();
      }
    } finally {
      await iterator.close();
    }
    return JSON.stringify(history);
  }
}
