import 'server-only';
import type { Contract } from '@hyperledger/fabric-gateway';
import { toFabricError } from './errors';

const utf8Decoder = new TextDecoder();

/** Ejecuta una consulta de solo lectura (no genera transacción en el ledger). */
export async function evaluateTransaction<T>(contract: Contract, transactionName: string, args: string[]): Promise<T> {
  try {
    const bytes = await contract.evaluateTransaction(transactionName, ...args);
    const raw = utf8Decoder.decode(bytes);
    return (raw ? JSON.parse(raw) : null) as T;
  } catch (error) {
    throw toFabricError(error);
  }
}
