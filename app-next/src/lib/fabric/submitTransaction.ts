import 'server-only';
import type { Contract } from '@hyperledger/fabric-gateway';
import type { SubmitResult } from '@/types/blockchain';
import { FabricError, toFabricError } from './errors';

const utf8Decoder = new TextDecoder();

/**
 * Envía una transacción de escritura: endorsement → ordering → espera de commit.
 * Devuelve el TX_ID y el número de bloque solo cuando el commit fue VALIDADO por los peers.
 */
export async function submitTransaction<T>(
  contract: Contract,
  transactionName: string,
  args: string[],
): Promise<SubmitResult<T>> {
  try {
    const proposal = contract.newProposal(transactionName, { arguments: args });
    const transaction = await proposal.endorse();
    const commit = await transaction.submit();
    const status = await commit.getStatus();

    if (!status.successful) {
      throw new FabricError(
        'COMMIT_FAILED',
        `La transacción ${status.transactionId} fue rechazada al validar (código ${status.code})`,
      );
    }

    const raw = utf8Decoder.decode(transaction.getResult());
    return {
      txId: status.transactionId,
      blockNumber: status.blockNumber,
      payload: (raw ? JSON.parse(raw) : null) as T,
    };
  } catch (error) {
    throw toFabricError(error);
  }
}
