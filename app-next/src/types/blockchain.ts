/** Tipos de evento anclados en el ledger. */
export type EvidenceEventType = 'REGISTRO' | 'RECTIFICACION';

/** Modelo On-chain almacenado por el chaincode academic-traceability. */
export interface AcademicEvidence {
  docType: 'academicEvidence';
  evidenceId: string;
  recordReference: string;
  eventType: EvidenceEventType;
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

/** Argumentos que la aplicación envía a createAcademicEvidence. */
export interface CreateAcademicEvidenceArgs {
  evidenceId: string;
  recordReference: string;
  eventType: EvidenceEventType;
  version: number;
  evidence: string;
  actorReference: string;
  actorRole: string;
}

export interface SubmitResult<T = unknown> {
  txId: string;
  blockNumber: bigint;
  payload: T;
}

/** Operaciones del ledger que usa la capa de servicios (permite simularlo en pruebas). */
export interface AcademicLedger {
  evidenceExists(evidenceId: string): Promise<boolean>;
  createEvidence(args: CreateAcademicEvidenceArgs): Promise<SubmitResult<AcademicEvidence>>;
  readEvidence(evidenceId: string): Promise<AcademicEvidence>;
  getEvidenceHistory(recordReference: string): Promise<AcademicEvidence[]>;
}

export type IntegrityStatus = 'INTEGRO' | 'ALTERADO' | 'NO_REGISTRADO';

export interface Actor {
  reference: string;
  role: string;
}
