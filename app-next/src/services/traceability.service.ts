import 'server-only';
import { randomUUID } from 'node:crypto';
import { generateEvidence } from '@/lib/crypto/generateEvidence';
import { evidencesMatch } from '@/lib/crypto/verifyEvidence';
import { getDefaultActorUsername, getFabricEnv, getHmacSecret } from '@/lib/env/config';
import { fabricAcademicLedger } from '@/lib/fabric/academicLedger';
import { logger as defaultLogger, type Logger } from '@/lib/logger';
import { academicRecordRepository, type AcademicRecordRepository } from '@/repositories/academicRecord.repository';
import {
  blockchainEvidenceRepository,
  type BlockchainEvidenceRepository,
} from '@/repositories/blockchainEvidence.repository';
import {
  traceabilityEventRepository,
  type EventoConEvidencia,
  type TraceabilityEventRepository,
} from '@/repositories/traceabilityEvent.repository';
import { usuarioRepository, type UsuarioRepository } from '@/repositories/usuario.repository';
import { RecordCodeSchema, RectificationSchema, UsernameSchema, type RectificationInput } from '@/schemas/academicRecord.schema';
import type { AcademicRecordSummary, Actor, ResultadoConRelaciones } from '@/types/academic';
import {
  DATA_EVENT_TYPES,
  type AcademicEvidence,
  type AcademicLedger,
  type IntegrityStatus,
  type LedgerEventType,
} from '@/types/blockchain';
import { createAcademicRecordService, toAcademicRecordInput, toAcademicRecordSummary } from './academicRecord.service';
import { ActorNotFoundError, EvidenceConflictError, EvidenceLinkError } from './errors';

export interface LedgerTarget {
  network: string;
  channelName: string;
  chaincodeName: string;
}

export interface TraceabilityDependencies {
  records: AcademicRecordRepository;
  events: TraceabilityEventRepository;
  evidences: BlockchainEvidenceRepository;
  users: UsuarioRepository;
  ledger: AcademicLedger;
  getSecret: () => string;
  ledgerTarget: () => LedgerTarget;
  newEventId?: () => string;
  logger: Logger;
}

export interface RegistrationResult {
  record: AcademicRecordSummary;
  eventId: string;
  eventType: LedgerEventType;
  commitment: string;
  previousCommitment: string | null;
  txId: string;
  blockNumber: string | null;
  alreadyRegistered: boolean;
  reconciled: boolean;
}

export interface VerificationResult {
  record: AcademicRecordSummary;
  status: IntegrityStatus;
  computedCommitment: string;
  onChain: AcademicEvidence | null;
  /** Cada versión On-chain referencia el compromiso de la anterior (previousCommitment). */
  chainIntact: boolean | null;
  localCopyConsistent: boolean | null;
  verificationEventId: string | null;
  verificationTxId: string | null;
}

export interface TraceabilityReport {
  record: AcademicRecordSummary;
  events: EventoConEvidencia[];
  onChain: AcademicEvidence[] | null;
  onChainError: string | null;
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const isDataEvent = (e: AcademicEvidence) => DATA_EVENT_TYPES.includes(e.eventType);

/** Comprueba el encadenamiento de compromisos entre versiones consecutivas (H2-03, "compromiso anterior"). */
export function isCommitmentChainIntact(dataEvents: AcademicEvidence[]): boolean {
  const sorted = [...dataEvents].sort((a, b) => a.version - b.version);
  return sorted.every((event, i) =>
    i === 0
      ? event.version === 1 && event.previousCommitment === null
      : event.version === sorted[i - 1]!.version + 1 && event.previousCommitment === sorted[i - 1]!.commitment,
  );
}

export function createTraceabilityService(deps: TraceabilityDependencies) {
  const { records, events, evidences, users, ledger, logger } = deps;
  const recordService = createAcademicRecordService(records);
  const newEventId = deps.newEventId ?? randomUUID;

  async function resolveActor(username?: string): Promise<Actor> {
    const name = UsernameSchema.parse(username ?? getDefaultActorUsername());
    const actor = await users.findActor(name);
    if (!actor) throw new ActorNotFoundError(name);
    return actor;
  }

  async function loadRecord(code: string): Promise<ResultadoConRelaciones> {
    const codigo = RecordCodeSchema.parse(code);
    logger.info(`Buscando registro ${codigo}`);
    const record = await recordService.getByCode(codigo);
    logger.info('Registro encontrado', { version: record.versionActual, estado: record.estado });
    return record;
  }

  const eventTypeFor = (record: ResultadoConRelaciones): LedgerEventType =>
    record.versionActual === 1 ? 'CREACION' : record.estado === 'REVOCADO' ? 'REVOCACION' : 'RECTIFICACION';

  /** Envía el evento al ledger o, si ya existe con ese evento_id, lo reconcilia (H2-06 §7). */
  async function anchor(
    event: { id: string; objectRef: string; eventType: LedgerEventType; version: number; commitment: string; previous: string | null },
    actor: Actor,
  ): Promise<{ txId: string; blockNumber: bigint | null; reconciled: boolean }> {
    logger.info('Conectando a Fabric', { channel: deps.ledgerTarget().channelName });
    if (await ledger.evidenceExists(event.id)) {
      const onChain = await ledger.readEvidence(event.id);
      if (!evidencesMatch(onChain.commitment, event.commitment)) {
        throw new EvidenceConflictError(event.id, 'el compromiso del ledger no coincide con el registro actual');
      }
      logger.warn('El evento ya existía en el ledger: se reconcilia el vínculo', { eventId: event.id });
      return { txId: onChain.txId, blockNumber: null, reconciled: true };
    }
    logger.info('Transacción enviada', { eventId: event.id, eventType: event.eventType });
    const submitted = await ledger.createEvidence({
      eventId: event.id,
      objectType: 'RESULTADO',
      objectRef: event.objectRef,
      eventType: event.eventType,
      version: event.version,
      commitment: event.commitment,
      previousCommitment: event.previous,
      actorRole: actor.role,
    });
    return { txId: submitted.txId, blockNumber: submitted.blockNumber, reconciled: false };
  }

  async function confirm(eventId: string, anchored: { txId: string; blockNumber: bigint | null }) {
    const target = deps.ledgerTarget();
    try {
      await evidences.recordConfirmation(eventId, {
        txId: anchored.txId,
        blockNumber: anchored.blockNumber,
        red: target.network,
        canal: target.channelName,
        chaincode: target.chaincodeName,
      });
    } catch (error) {
      logger.error('Fabric confirmó la transacción pero falló la persistencia en MySQL', { eventId, txId: anchored.txId });
      throw new EvidenceLinkError(eventId, anchored.txId, error);
    }
  }

  /**
   * Flujo de registro (H2-06 §3, pasos 4-9):
   * MySQL → payload canónico → HMAC-SHA-256 → evento PENDIENTE (UUID) → chaincode → TX_ID → MySQL.
   */
  async function registerAcademicRecordEvidence(code: string, actorUsername?: string): Promise<RegistrationResult> {
    const actor = await resolveActor(actorUsername);
    const record = await loadRecord(code);
    const summary = toAcademicRecordSummary(record);
    const version = record.versionActual;
    const eventType = eventTypeFor(record);
    const { evidence: commitment } = generateEvidence(toAcademicRecordInput(record), deps.getSecret());
    logger.info('Compromiso HMAC generado', { eventType, version });

    const existing = await events.findDataEvent(record.codigo, version);
    if (existing?.estadoEvento === 'CONFIRMADO' && existing.evidencia) {
      if (!evidencesMatch(existing.compromisoHmac, commitment)) {
        throw new EvidenceConflictError(
          `${record.codigo} v${version}`,
          'el registro cambió sin una nueva versión autorizada; ejecute la verificación de integridad',
        );
      }
      logger.info('La versión ya estaba anclada (reintento idempotente)', { txId: existing.evidencia.txId });
      return {
        record: summary,
        eventId: existing.id,
        eventType,
        commitment,
        previousCommitment: existing.compromisoAnterior,
        txId: existing.evidencia.txId,
        blockNumber: existing.evidencia.blockNumber?.toString() ?? null,
        alreadyRegistered: true,
        reconciled: false,
      };
    }

    let previous: string | null = null;
    if (version > 1) {
      const prior = await events.findDataEvent(record.codigo, version - 1);
      if (!prior || prior.estadoEvento !== 'CONFIRMADO') {
        throw new EvidenceConflictError(`${record.codigo} v${version}`, `la versión ${version - 1} no está anclada en el ledger`);
      }
      previous = prior.compromisoHmac;
    }

    const eventId = existing
      ? (await events.resetToPending(existing.id, commitment, previous)).id
      : (
          await events.createPending({
            id: newEventId(),
            objetoTipo: 'RESULTADO',
            objetoRef: record.codigo,
            eventoTipo: eventType,
            version,
            actorUsuarioId: actor.usuarioId,
            actorRolCodigo: actor.role,
            compromisoHmac: commitment,
            compromisoAnterior: previous,
          })
        ).id;
    logger.info('Evento PENDIENTE', { eventId, reintento: Boolean(existing) });

    let anchored;
    try {
      anchored = await anchor({ id: eventId, objectRef: record.codigo, eventType, version, commitment, previous }, actor);
    } catch (error) {
      // RNF-14: el dato académico no se pierde; el evento queda en ERROR y puede reintentarse.
      logger.error('Fallo al registrar en Fabric', { eventId, error: errorMessage(error) });
      await events.markError(eventId, errorMessage(error)).catch(() => undefined);
      throw error;
    }
    logger.info('TX_ID obtenido', { txId: anchored.txId });
    await confirm(eventId, anchored);
    logger.info('Referencia persistida en evidencia_blockchain');

    return {
      record: summary,
      eventId,
      eventType,
      commitment,
      previousCommitment: previous,
      txId: anchored.txId,
      blockNumber: anchored.blockNumber?.toString() ?? null,
      alreadyRegistered: false,
      reconciled: anchored.reconciled,
    };
  }

  /**
   * Flujo de verificación (H2-06 §5): recalcula el HMAC de la versión vigente y lo compara con
   * la última versión anclada. El resultado se registra como evento VERIFICACION (Off-chain y On-chain).
   */
  async function verifyAcademicRecord(code: string, actorUsername?: string): Promise<VerificationResult> {
    const actor = await resolveActor(actorUsername);
    const record = await loadRecord(code);
    const summary = toAcademicRecordSummary(record);
    const { evidence: computedCommitment } = generateEvidence(toAcademicRecordInput(record), deps.getSecret());

    logger.info('Consultando eventos On-chain');
    const history = await ledger.getEvidenceHistory('RESULTADO', record.codigo);
    const dataEvents = history.filter(isDataEvent);
    const onChain = dataEvents.reduce<AcademicEvidence | null>((latest, e) => (!latest || e.version > latest.version ? e : latest), null);

    if (!onChain) {
      logger.warn('El registro no tiene evidencia anclada: NO_VERIFICABLE');
      return {
        record: summary,
        status: 'NO_VERIFICABLE',
        computedCommitment,
        onChain: null,
        chainIntact: null,
        localCopyConsistent: null,
        verificationEventId: null,
        verificationTxId: null,
      };
    }

    const status: IntegrityStatus = evidencesMatch(onChain.commitment, computedCommitment) ? 'INTEGRO' : 'ALTERADO';
    const chainIntact = isCommitmentChainIntact(dataEvents);
    const local = await events.findById(onChain.eventId);
    const localCopyConsistent =
      local !== null && local.estadoEvento === 'CONFIRMADO' && local.compromisoHmac === onChain.commitment && local.evidencia?.txId === onChain.txId;
    logger.info('Verificación calculada', { status, chainIntact });

    // Registro de la verificación (CU-02 paso 6). Un fallo aquí no invalida el resultado.
    const verificationEventId = newEventId();
    let verificationTxId: string | null = null;
    await events.createPending({
      id: verificationEventId,
      objetoTipo: 'RESULTADO',
      objetoRef: record.codigo,
      eventoTipo: 'VERIFICACION',
      version: record.versionActual,
      actorUsuarioId: actor.usuarioId,
      actorRolCodigo: actor.role,
      compromisoHmac: computedCommitment,
      compromisoAnterior: onChain.commitment,
      resultadoVerificacion: status,
    });
    try {
      const anchored = await anchor(
        { id: verificationEventId, objectRef: record.codigo, eventType: 'VERIFICACION', version: record.versionActual, commitment: computedCommitment, previous: onChain.commitment },
        actor,
      );
      await confirm(verificationEventId, anchored);
      verificationTxId = anchored.txId;
    } catch (error) {
      logger.warn('No se pudo anclar el evento de verificación; queda en ERROR para reintento', { error: errorMessage(error) });
      await events.markError(verificationEventId, errorMessage(error)).catch(() => undefined);
    }

    return { record: summary, status, computedCommitment, onChain, chainIntact, localCopyConsistent, verificationEventId, verificationTxId };
  }

  async function getTraceability(code: string): Promise<TraceabilityReport> {
    const record = await loadRecord(code);
    const eventList = await events.listByObject(record.codigo);
    let onChain: AcademicEvidence[] | null = null;
    let onChainError: string | null = null;
    try {
      onChain = await ledger.getEvidenceHistory('RESULTADO', record.codigo);
    } catch (error) {
      onChainError = errorMessage(error);
      logger.warn('No se pudo consultar el historial On-chain', { error: onChainError });
    }
    return { record: toAcademicRecordSummary(record), events: eventList, onChain, onChainError };
  }

  /**
   * Rectificación autorizada (H2-06 §4): nueva versión Off-chain con motivo y nuevo evento
   * RECTIFICACION encadenado al compromiso anterior. La versión vigente se ancla primero si aún no lo está.
   */
  async function rectifyAcademicRecord(code: string, change: RectificationInput, actorUsername?: string) {
    const actor = await resolveActor(actorUsername);
    const valid = RectificationSchema.parse(change);
    const record = await loadRecord(code);
    const max = Number(record.actividad.puntajeMaximo);
    if (valid.newScore > max) throw new RangeError(`El puntaje ${valid.newScore} supera el máximo de la actividad (${max})`);

    const current = await events.findDataEvent(record.codigo, record.versionActual);
    if (current?.estadoEvento !== 'CONFIRMADO') {
      logger.info('La versión vigente no está anclada: se registra antes de rectificar');
      await registerAcademicRecordEvidence(record.codigo, actor.username);
    }
    await records.rectify(record.codigo, valid, actor.usuarioId);
    logger.info('Rectificación guardada en MySQL', { nuevaVersion: record.versionActual + 1 });
    return registerAcademicRecordEvidence(record.codigo, actor.username);
  }

  return { registerAcademicRecordEvidence, verifyAcademicRecord, getTraceability, rectifyAcademicRecord };
}

export type TraceabilityService = ReturnType<typeof createTraceabilityService>;

export const traceabilityService = createTraceabilityService({
  records: academicRecordRepository,
  events: traceabilityEventRepository,
  evidences: blockchainEvidenceRepository,
  users: usuarioRepository,
  ledger: fabricAcademicLedger,
  getSecret: getHmacSecret,
  ledgerTarget: () => {
    const env = getFabricEnv();
    return { network: 'fabric-academic', channelName: env.FABRIC_CHANNEL_NAME, chaincodeName: env.FABRIC_CHAINCODE_NAME };
  },
  logger: defaultLogger,
});
