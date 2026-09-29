import { createHmac } from 'node:crypto';
import { getHmacSecret } from '@/lib/env/config';
import type { AcademicRecordInput } from '@/types/academic';
import { canonicalizeAcademicRecord, CANONICAL_VERSION } from './canonicalize';

export const EVIDENCE_ALGORITHM = 'HMAC-SHA-256' as const;

export interface GeneratedEvidence {
  evidence: string;
  algorithm: typeof EVIDENCE_ALGORITHM;
  canonicalVersion: string;
}

/** HMAC-SHA-256 (hex, 64 caracteres) sobre una cadena canónica codificada en UTF-8. */
export function computeHmac(canonical: string, secret: string): string {
  if (secret.length < 32) throw new Error('La clave HMAC debe tener al menos 32 caracteres');
  return createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

/**
 * Genera la evidencia criptográfica de un registro académico.
 * La clave se toma de process.env.HMAC_SECRET salvo que se inyecte explícitamente (pruebas).
 */
export function generateEvidence(record: AcademicRecordInput, secret: string = getHmacSecret()): GeneratedEvidence {
  const canonical = canonicalizeAcademicRecord(record);
  return {
    evidence: computeHmac(canonical, secret),
    algorithm: EVIDENCE_ALGORITHM,
    canonicalVersion: CANONICAL_VERSION,
  };
}

/** Identificador determinista de la evidencia On-chain: EVD-REG-000001-V1. */
export function buildEvidenceId(recordCode: string, version: number): string {
  return `EVD-${recordCode.toUpperCase()}-V${version}`;
}
