import 'server-only';
import type { BlockchainEvidence, PrismaClient, TraceabilityEventType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export interface PendingEvidenceInput {
  resultId: number;
  evidenceId: string;
  version: number;
  eventType: TraceabilityEventType;
  evidenceHash: string;
  canonicalVersion: string;
  channelName: string;
  chaincodeName: string;
}

export interface ConfirmationInput {
  txId: string;
  blockNumber: bigint | null;
  confirmedAt?: Date;
}

export function createBlockchainEvidenceRepository(db: PrismaClient) {
  return {
    findByResultAndVersion(resultId: number, version: number): Promise<BlockchainEvidence | null> {
      return db.blockchainEvidence.findUnique({ where: { resultId_version: { resultId, version } } });
    },

    listByResult(resultId: number): Promise<BlockchainEvidence[]> {
      return db.blockchainEvidence.findMany({ where: { resultId }, orderBy: { version: 'asc' } });
    },

    listPending(): Promise<BlockchainEvidence[]> {
      return db.blockchainEvidence.findMany({ where: { status: { in: ['PENDIENTE', 'FALLIDO'] } } });
    },

    /** Registra (o reintenta) la evidencia ANTES de enviarla a Fabric: estado PENDIENTE. */
    savePending(input: PendingEvidenceInput): Promise<BlockchainEvidence> {
      const { evidenceId, ...rest } = input;
      return db.blockchainEvidence.upsert({
        where: { evidenceId },
        create: { evidenceId, ...rest, status: 'PENDIENTE' },
        update: { evidenceHash: rest.evidenceHash, status: 'PENDIENTE', errorMessage: null },
      });
    },

    /** Persiste el vínculo On-chain: TX_ID y número de bloque. */
    markConfirmed(evidenceId: string, confirmation: ConfirmationInput): Promise<BlockchainEvidence> {
      return db.blockchainEvidence.update({
        where: { evidenceId },
        data: {
          status: 'CONFIRMADO',
          txId: confirmation.txId,
          blockNumber: confirmation.blockNumber,
          confirmedAt: confirmation.confirmedAt ?? new Date(),
          errorMessage: null,
        },
      });
    },

    markFailed(evidenceId: string, errorMessage: string): Promise<BlockchainEvidence> {
      return db.blockchainEvidence.update({
        where: { evidenceId },
        data: { status: 'FALLIDO', errorMessage: errorMessage.slice(0, 500) },
      });
    },
  };
}

export type BlockchainEvidenceRepository = ReturnType<typeof createBlockchainEvidenceRepository>;

export const blockchainEvidenceRepository = createBlockchainEvidenceRepository(prisma);
