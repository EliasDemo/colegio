import { status as GrpcStatus } from '@grpc/grpc-js';
import { GatewayError } from '@hyperledger/fabric-gateway';

export type FabricErrorCode =
  | 'PEER_UNAVAILABLE'
  | 'ORDERER_UNAVAILABLE'
  | 'ENDORSEMENT_FAILED'
  | 'TIMEOUT'
  | 'IDENTITY_INVALID'
  | 'CHAINCODE_NOT_DEPLOYED'
  | 'CHANNEL_NOT_FOUND'
  | 'EVIDENCE_NOT_FOUND'
  | 'EVIDENCE_ALREADY_EXISTS'
  | 'CHAINCODE_ERROR'
  | 'COMMIT_FAILED'
  | 'UNKNOWN';

/** Mensajes orientados al operador para cada tipo de fallo (casos 5-8 del Hito 3). */
const HINTS: Record<FabricErrorCode, string> = {
  PEER_UNAVAILABLE: 'El peer no responde. Verifique que la red esté levantada (fabric-network/scripts/network.sh up).',
  ORDERER_UNAVAILABLE: 'El servicio de ordenamiento no responde: la transacción fue endosada pero no se pudo confirmar.',
  ENDORSEMENT_FAILED: 'No se reunieron los endosos que exige la política (ambas organizaciones deben endosar).',
  TIMEOUT: 'Fabric no respondió dentro del tiempo límite.',
  IDENTITY_INVALID: 'Certificado o clave privada inválidos o no autorizados para la organización.',
  CHAINCODE_NOT_DEPLOYED: 'El chaincode no está desplegado en el canal (fabric-network/scripts/deployChaincode.sh).',
  CHANNEL_NOT_FOUND: 'El canal no existe o el peer no está unido a él (FABRIC_CHANNEL_NAME).',
  EVIDENCE_NOT_FOUND: 'No existe evidencia On-chain para la referencia solicitada.',
  EVIDENCE_ALREADY_EXISTS: 'La evidencia ya fue registrada en el ledger.',
  CHAINCODE_ERROR: 'El chaincode rechazó la operación.',
  COMMIT_FAILED: 'La transacción fue ordenada pero no se validó (MVCC o política de endorsement).',
  UNKNOWN: 'Error no clasificado de Fabric.',
};

export class FabricError extends Error {
  readonly hint: string;

  constructor(
    readonly code: FabricErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'FabricError';
    this.hint = HINTS[code];
  }
}

function collectMessages(error: unknown): string {
  if (error instanceof GatewayError) {
    return [error.message, ...error.details.map((d) => `${d.mspId}@${d.address}: ${d.message}`)].join(' | ');
  }
  return error instanceof Error ? error.message : String(error);
}

/** Traduce errores de gRPC / Fabric Gateway a un código estable para la capa de servicios. */
export function toFabricError(error: unknown): FabricError {
  if (error instanceof FabricError) return error;
  const text = collectMessages(error);
  const grpcCode = error instanceof GatewayError ? error.code : undefined;

  const classify = (): FabricErrorCode => {
    if (/no existe evidencia/i.test(text)) return 'EVIDENCE_NOT_FOUND';
    if (/ya existe|already exists/i.test(text)) return 'EVIDENCE_ALREADY_EXISTS';
    if (/channel .*not found|no such channel|channel does not exist|get (last )?config for channel/i.test(text))
      return 'CHANNEL_NOT_FOUND';
    if (/chaincode .*not found|not been successfully defined|could not find chaincode|chaincode definition .*not found|no peers available to (evaluate|endorse) chaincode/i.test(text))
      return 'CHAINCODE_NOT_DEPLOYED';
    if (/access denied|creator certificate|certificate .*(invalid|expired|signed by unknown)|signature|identity .*not valid|MSP .*(unknown|not found)/i.test(text))
      return 'IDENTITY_INVALID';
    if (/no orderers could successfully process/i.test(text)) return 'ORDERER_UNAVAILABLE';
    if (/failed to collect enough transaction endorsements|satisfy the endorsement policy/i.test(text)) return 'ENDORSEMENT_FAILED';
    if (grpcCode === GrpcStatus.UNAVAILABLE || /ECONNREFUSED|UNAVAILABLE|failed to connect/i.test(text)) return 'PEER_UNAVAILABLE';
    if (grpcCode === GrpcStatus.DEADLINE_EXCEEDED || /deadline/i.test(text)) return 'TIMEOUT';
    if (/chaincode response|transaction returned with failure|error in simulation/i.test(text)) return 'CHAINCODE_ERROR';
    return 'UNKNOWN';
  };

  return new FabricError(classify(), text, error);
}
