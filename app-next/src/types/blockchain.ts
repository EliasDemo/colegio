/** Tipos de evento del Hito 2 (H2-03) que se anclan en el ledger. */
export type LedgerEventType = 'CREACION' | 'RECTIFICACION' | 'VERIFICACION' | 'REVOCACION';
export type LedgerObjectType = 'RESULTADO' | 'ACTIVIDAD' | 'ASISTENCIA';

/** Eventos que fijan una versión del dato (VERIFICACION solo la consulta). */
export const DATA_EVENT_TYPES: ReadonlyArray<LedgerEventType> = ['CREACION', 'RECTIFICACION', 'REVOCACION'];

/**
 * Evento On-chain almacenado por el chaincode academic-traceability.
 * Corresponde al payload propuesto en H2-03 más los metadatos que añade Fabric.
 */
export interface AcademicEvidence {
  docType: 'academicEvent';
  eventId: string;
  objectType: LedgerObjectType;
  objectRef: string;
  eventType: LedgerEventType;
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

/** Argumentos de createAcademicEvidence. */
export interface CreateAcademicEvidenceArgs {
  eventId: string;
  objectType: LedgerObjectType;
  objectRef: string;
  eventType: LedgerEventType;
  version: number;
  commitment: string;
  previousCommitment: string | null;
  actorRole: string;
}

export interface SubmitResult<T = unknown> {
  txId: string;
  blockNumber: bigint;
  payload: T;
}

/** Operaciones del ledger que usa la capa de servicios (permite simularlo en pruebas). */
export interface AcademicLedger {
  evidenceExists(eventId: string): Promise<boolean>;
  createEvidence(args: CreateAcademicEvidenceArgs): Promise<SubmitResult<AcademicEvidence>>;
  readEvidence(eventId: string): Promise<AcademicEvidence>;
  getEvidenceHistory(objectType: LedgerObjectType, objectRef: string): Promise<AcademicEvidence[]>;
}

export type IntegrityStatus = 'INTEGRO' | 'ALTERADO' | 'NO_VERIFICABLE';
