/** Caso 3: el registro solicitado no existe en MySQL. */
export class RecordNotFoundError extends Error {
  constructor(readonly recordCode: string) {
    super(`El registro académico ${recordCode} no existe en la base de datos Off-chain`);
    this.name = 'RecordNotFoundError';
  }
}

/**
 * Caso 2: Fabric confirmó la transacción pero no se pudo guardar el TX_ID en MySQL.
 * El fila queda PENDIENTE; al volver a ejecutar el registro el servicio detecta la evidencia
 * en el ledger y reconcilia el vínculo sin crear una transacción duplicada.
 */
export class EvidenceLinkError extends Error {
  constructor(
    readonly evidenceId: string,
    readonly txId: string,
    readonly cause?: unknown,
  ) {
    super(
      `La evidencia ${evidenceId} quedó registrada en Fabric (TX_ID ${txId}) pero no se pudo persistir el vínculo en MySQL. ` +
        'Vuelva a ejecutar el registro para reconciliar.',
    );
    this.name = 'EvidenceLinkError';
  }
}

/** La evidencia calculada no coincide con la ya anclada para la misma versión del registro. */
export class EvidenceConflictError extends Error {
  constructor(
    readonly evidenceId: string,
    detail: string,
  ) {
    super(`Conflicto de evidencia ${evidenceId}: ${detail}`);
    this.name = 'EvidenceConflictError';
  }
}
