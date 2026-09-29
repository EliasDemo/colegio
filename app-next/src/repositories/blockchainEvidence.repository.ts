import 'server-only';
import type { EvidenciaBlockchain, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export interface ConfirmationInput {
  txId: string;
  blockNumber: bigint | null;
  committedAt?: Date;
  red: string;
  canal: string;
  chaincode: string;
}

export function createBlockchainEvidenceRepository(db: PrismaClient) {
  return {
    /**
     * Persiste el vínculo On-chain (H2-06, paso 8) en una sola transacción MySQL:
     * inserta evidencia_blockchain con el TX_ID y marca el evento como CONFIRMADO.
     */
    async recordConfirmation(eventoId: string, confirmation: ConfirmationInput): Promise<EvidenciaBlockchain> {
      const [evidencia] = await db.$transaction([
        db.evidenciaBlockchain.create({
          data: {
            eventoId,
            txId: confirmation.txId,
            blockNumber: confirmation.blockNumber,
            committedAt: confirmation.committedAt ?? new Date(),
            validacion: 'VALIDA',
            red: confirmation.red,
            canal: confirmation.canal,
            chaincode: confirmation.chaincode,
          },
        }),
        db.eventoTrazabilidad.update({ where: { id: eventoId }, data: { estadoEvento: 'CONFIRMADO', errorDetalle: null } }),
      ]);
      return evidencia;
    },

    findByEventId(eventoId: string): Promise<EvidenciaBlockchain | null> {
      return db.evidenciaBlockchain.findUnique({ where: { eventoId } });
    },

    countValid(): Promise<number> {
      return db.evidenciaBlockchain.count({ where: { validacion: 'VALIDA' } });
    },
  };
}

export type BlockchainEvidenceRepository = ReturnType<typeof createBlockchainEvidenceRepository>;

export const blockchainEvidenceRepository = createBlockchainEvidenceRepository(prisma);
