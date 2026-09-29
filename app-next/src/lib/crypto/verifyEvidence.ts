import { timingSafeEqual } from 'node:crypto';
import { getHmacSecret } from '@/lib/env/config';
import { HEX_SHA256_PATTERN } from '@/schemas/academicRecord.schema';
import type { AcademicRecordInput } from '@/types/academic';
import { generateEvidence } from './generateEvidence';

export interface EvidenceVerification {
  valid: boolean;
  computedEvidence: string;
}

/** Comparación en tiempo constante de dos evidencias hexadecimales. */
export function evidencesMatch(expected: string, actual: string): boolean {
  if (!HEX_SHA256_PATTERN.test(expected) || !HEX_SHA256_PATTERN.test(actual)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
}

/** Recalcula el HMAC del registro y lo compara con la evidencia de referencia. */
export function verifyEvidence(
  record: AcademicRecordInput,
  evidence: string,
  secret: string = getHmacSecret(),
): EvidenceVerification {
  const { evidence: computedEvidence } = generateEvidence(record, secret);
  return { valid: evidencesMatch(evidence.toLowerCase(), computedEvidence), computedEvidence };
}
