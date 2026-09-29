/** Caso 3: el registro solicitado no existe en MySQL. */
export class RecordNotFoundError extends Error {
  constructor(readonly recordCode: string) {
    super(`El registro académico ${recordCode} no existe en la base de datos Off-chain`);
    this.name = 'RecordNotFoundError';
  }
}

/** El usuario indicado como actor no existe, no está activo o no tiene rol. */
export class ActorNotFoundError extends Error {
  constructor(readonly username: string) {
    super(`El usuario ${username} no existe, no está ACTIVO o no tiene un rol asignado`);
    this.name = 'ActorNotFoundError';
  }
}

/**
 * Caso 2: Fabric confirmó la transacción pero no se pudo persistir el vínculo en MySQL.
 * El evento queda PENDIENTE; al reintentar, el servicio consulta el ledger por evento_id
 * y reconcilia el TX_ID sin reenviar la transacción (H2-06 §7).
 */
export class EvidenceLinkError extends Error {
  constructor(
    readonly eventId: string,
    readonly txId: string,
    readonly cause?: unknown,
  ) {
    super(
      `El evento ${eventId} quedó registrado en Fabric (TX_ID ${txId}) pero no se pudo persistir el vínculo en MySQL. ` +
        'Vuelva a ejecutar el registro para reconciliar.',
    );
    this.name = 'EvidenceLinkError';
  }
}

/** El compromiso calculado no coincide con el ya anclado para la misma versión. */
export class EvidenceConflictError extends Error {
  constructor(
    readonly reference: string,
    detail: string,
  ) {
    super(`Conflicto de evidencia ${reference}: ${detail}`);
    this.name = 'EvidenceConflictError';
  }
}
