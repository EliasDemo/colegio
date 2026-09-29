import 'server-only';
import type { BlockchainEvidence, TraceabilityEvent } from '@prisma/client';
import { buildEvidenceId, generateEvidence } from '@/lib/crypto/generateEvidence';
import { evidencesMatch } from '@/lib/crypto/verifyEvidence';
import { getDefaultActor, getFabricEnv, getHmacSecret } from '@/lib/env/config';
import { fabricAcademicLedger } from '@/lib/fabric/academicLedger';
import { logger as defaultLogger, type Logger } from '@/lib/logger';
import { academicRecordRepository, type AcademicRecordRepository } from '@/repositories/academicRecord.repository';
import {
  blockchainEvidenceRepository,
  type BlockchainEvidenceRepository,
} from '@/repositories/blockchainEvidence.repository';
import {
  traceabilityEventRepository,
  type TraceabilityEventRepository,
} from '@/repositories/traceabilityEvent.repository';
import { ActorSchema, RecordCodeSchema, RectificationSchema, type RectificationInput } from '@/schemas/academicRecord.schema';
import type { AcademicRecordSummary } from '@/types/academic';
import type { AcademicEvidence, AcademicLedger, Actor, EvidenceEventType, IntegrityStatus } from '@/types/blockchain';
import { createAcademicRecordService, toAcademicRecordInput, toAcademicRecordSummary } from './academicRecord.service';
import { EvidenceConflictError, EvidenceLinkError } from './errors';

export interface TraceabilityDependencies {
  records: AcademicRecordRepository;
  evidences: BlockchainEvidenceRepository;
  events: TraceabilityEventRepository;
  ledger: AcademicLedger;
  getSecret: () => string;
  ledgerTarget: () => { channelName: string; chaincodeName: string };
  logger: Logger;
}

export interface RegistrationResult {
  record: AcademicRecordSummary;
  evidenceId: string;
  eventType: EvidenceEventType;
  evidence: string;
  txId: string;
  blockNumber: string | null;
  alreadyRegistered: boolean;
  reconciled: boolean;
}

export interface VerificationResult {
  record: AcademicRecordSummary;
  status: IntegrityStatus;
  computedEvidence: string;
  onChain: AcademicEvidence | null;
  localCopyConsistent: boolean | null;
}

export interface TraceabilityReport {
  record: AcademicRecordSummary;
  events: TraceabilityEvent[];
  localEvidences: BlockchainEvidence[];
  onChain: AcademicEvidence[] | null;
  onChainError: string | null;
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function createTraceabilityService(deps: TraceabilityDependencies) {
  const { records, evidences, events, ledger, logger } = deps;
  const recordService = createAcademicRecordService(records);

  const resolveActor = (actor?: Actor): Actor => ActorSchema.parse(actor ?? getDefaultActor());

  async function loadRecord(code: string) {
    const recordCode = RecordCodeSchema.parse(code);
    logger.info(`Buscando registro ${recordCode}`);
    const record = await recordService.getByCode(recordCode);
    logger.info('Registro encontrado', { version: record.version });
    return record;
  }

  /**
   * Flujo principal del Hito 3:
   * MySQL → canonicalización → HMAC → Fabric (createAcademicEvidence) → TX_ID → MySQL.
   */
  async function registerAcademicRecordEvidence(code: string, actor?: Actor): Promise<RegistrationResult> {
    const author = resolveActor(actor);
    const record = await loadRecord(code);
    const summary = toAcademicRecordSummary(record);

    const { evidence, canonicalVersion } = generateEvidence(toAcademicRecordInput(record), deps.getSecret());
    const evidenceId = buildEvidenceId(record.code, record.version);
    const eventType: EvidenceEventType = record.version === 1 ? 'REGISTRO' : 'RECTIFICACION';
    logger.info('Evidence generada', { evidenceId });

    const existing = await evidences.findByResultAndVersion(record.id, record.version);
    if (existing?.status === 'CONFIRMADO' && existing.txId) {
      if (!evidencesMatch(existing.evidenceHash, evidence)) {
        throw new EvidenceConflictError(
          evidenceId,
          'el registro cambió sin una rectificación autorizada; ejecute la verificación de integridad',
        );
      }
      logger.info('La evidencia de esta versión ya estaba anclada', { txId: existing.txId });
      return {
        record: summary,
        evidenceId,
        eventType,
        evidence,
        txId: existing.txId,
        blockNumber: existing.blockNumber?.toString() ?? null,
        alreadyRegistered: true,
        reconciled: false,
      };
    }

    const target = deps.ledgerTarget();
    await evidences.savePending({
      resultId: record.id,
      evidenceId,
      version: record.version,
      eventType,
      evidenceHash: evidence,
      canonicalVersion,
      channelName: target.channelName,
      chaincodeName: target.chaincodeName,
    });

    let txId: string;
    let blockNumber: bigint | null = null;
    let reconciled = false;
    try {
      logger.info('Conectando a Fabric', { channel: target.channelName, chaincode: target.chaincodeName });
      if (await ledger.evidenceExists(evidenceId)) {
        // Caso 2: un intento anterior quedó registrado en el ledger sin TX_ID en MySQL.
        const onChain = await ledger.readEvidence(evidenceId);
        if (!evidencesMatch(onChain.evidence, evidence)) {
          throw new EvidenceConflictError(evidenceId, 'la evidencia del ledger no coincide con el registro actual');
        }
        txId = onChain.txId;
        reconciled = true;
        logger.warn('Evidencia ya existente en el ledger: se reconcilia el vínculo', { evidenceId });
      } else {
        logger.info('Transacción enviada', { evidenceId });
        const submitted = await ledger.createEvidence({
          evidenceId,
          recordReference: record.code,
          eventType,
          version: record.version,
          evidence,
          actorReference: author.reference,
          actorRole: author.role,
        });
        txId = submitted.txId;
        blockNumber = submitted.blockNumber;
      }
    } catch (error) {
      // Caso 1 / 5-8: Fabric no disponible o rechazó la operación. MySQL conserva el intento FALLIDO.
      logger.error('Fallo al registrar en Fabric', { evidenceId, error: errorMessage(error) });
      await evidences.markFailed(evidenceId, errorMessage(error)).catch(() => undefined);
      await events
        .create({
          resultId: record.id,
          eventType,
          version: record.version,
          status: 'FALLIDO',
          actorReference: author.reference,
          actorRole: author.role,
          evidenceId,
          detail: errorMessage(error).slice(0, 500),
        })
        .catch(() => undefined);
      throw error;
    }

    logger.info('TX_ID obtenido', { txId });
    try {
      await evidences.markConfirmed(evidenceId, { txId, blockNumber });
      await events.create({
        resultId: record.id,
        eventType,
        version: record.version,
        status: 'CONFIRMADO',
        actorReference: author.reference,
        actorRole: author.role,
        evidenceId,
        txId,
        detail: reconciled ? 'Vínculo reconciliado desde el ledger' : null,
      });
    } catch (error) {
      logger.error('Fabric confirmó la transacción pero falló la persistencia en MySQL', { evidenceId, txId });
      throw new EvidenceLinkError(evidenceId, txId, error);
    }
    logger.info('Referencia persistida');

    return {
      record: summary,
      evidenceId,
      eventType,
      evidence,
      txId,
      blockNumber: blockNumber?.toString() ?? null,
      alreadyRegistered: false,
      reconciled,
    };
  }

  /** Recalcula la evidencia del estado actual en MySQL y la compara con la última versión On-chain. */
  async function verifyAcademicRecord(code: string, actor?: Actor): Promise<VerificationResult> {
    const author = resolveActor(actor);
    const record = await loadRecord(code);
    const summary = toAcademicRecordSummary(record);
    const { evidence: computedEvidence } = generateEvidence(toAcademicRecordInput(record), deps.getSecret());

    logger.info('Consultando evidencia On-chain');
    const history = await ledger.getEvidenceHistory(record.code);
    const onChain = history.reduce<AcademicEvidence | null>(
      (latest, item) => (latest === null || item.version > latest.version ? item : latest),
      null,
    );

    if (!onChain) {
      logger.warn('El registro no tiene evidencia anclada');
      return { record: summary, status: 'NO_REGISTRADO', computedEvidence, onChain: null, localCopyConsistent: null };
    }

    const status: IntegrityStatus = evidencesMatch(onChain.evidence, computedEvidence) ? 'INTEGRO' : 'ALTERADO';
    const local = await evidences.findByResultAndVersion(record.id, onChain.version);
    const localCopyConsistent = local !== null && local.evidenceHash === onChain.evidence && local.txId === onChain.txId;

    await events.create({
      resultId: record.id,
      eventType: 'VERIFICACION',
      version: record.version,
      status,
      actorReference: author.reference,
      actorRole: author.role,
      evidenceId: onChain.evidenceId,
      txId: onChain.txId,
      detail:
        status === 'INTEGRO'
          ? `Coincide con la versión ${onChain.version} anclada`
          : `No coincide con la versión ${onChain.version} anclada (versión local ${record.version})`,
    });
    logger.info('Verificación completada', { status });

    return { record: summary, status, computedEvidence, onChain, localCopyConsistent };
  }

  async function getTraceability(code: string): Promise<TraceabilityReport> {
    const record = await loadRecord(code);
    const [eventList, localEvidences] = await Promise.all([
      events.listByResult(record.id),
      evidences.listByResult(record.id),
    ]);

    let onChain: AcademicEvidence[] | null = null;
    let onChainError: string | null = null;
    try {
      onChain = await ledger.getEvidenceHistory(record.code);
    } catch (error) {
      onChainError = errorMessage(error);
      logger.warn('No se pudo consultar el historial On-chain', { error: onChainError });
    }

    return { record: toAcademicRecordSummary(record), events: eventList, localEvidences, onChain, onChainError };
  }

  /** Rectificación autorizada: nueva versión en MySQL + nueva evidencia On-chain (el historial se conserva). */
  async function rectifyAcademicRecord(code: string, change: RectificationInput, actor?: Actor) {
    const author = resolveActor(actor);
    const validChange = RectificationSchema.parse(change);
    const record = await loadRecord(code);
    await records.rectify(record.code, validChange, author.reference);
    logger.info('Rectificación guardada en MySQL', { newVersion: record.version + 1 });
    return registerAcademicRecordEvidence(record.code, author);
  }

  return { registerAcademicRecordEvidence, verifyAcademicRecord, getTraceability, rectifyAcademicRecord };
}

export type TraceabilityService = ReturnType<typeof createTraceabilityService>;

export const traceabilityService = createTraceabilityService({
  records: academicRecordRepository,
  evidences: blockchainEvidenceRepository,
  events: traceabilityEventRepository,
  ledger: fabricAcademicLedger,
  getSecret: getHmacSecret,
  ledgerTarget: () => {
    const env = getFabricEnv();
    return { channelName: env.FABRIC_CHANNEL_NAME, chaincodeName: env.FABRIC_CHAINCODE_NAME };
  },
  logger: defaultLogger,
});
