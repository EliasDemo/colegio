import { createHmac } from 'node:crypto';
import { getHmacSecret } from '@/lib/env/config';
import type { AcademicRecordInput } from '@/types/academic';
import { canonicalizeAcademicRecord, CANONICAL_VERSION } from './canonicalize';

export const EVIDENCE_ALGORITHM = 'HMAC-SHA-256' as const;

export interface GeneratedEvidence {
  /** Compromiso criptográfico (compromiso_hmac): HMAC-SHA-256 en hexadecimal. */
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
 * Genera el compromiso criptográfico de un registro académico.
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
