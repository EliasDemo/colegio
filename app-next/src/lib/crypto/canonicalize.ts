import { AcademicRecordSchema } from '@/schemas/academicRecord.schema';
import type { AcademicRecordInput } from '@/types/academic';

/**
 * Canonicalización determinista de un registro académico (versión 1).
 *
 * Reglas:
 *  1. Orden de campos fijo, definido en CANONICAL_FIELD_ORDER (no depende del objeto de entrada).
 *  2. Codificación UTF-8; los textos se normalizan a Unicode NFC.
 *  3. Textos: se eliminan espacios al inicio/fin y se colapsan espacios internos a uno solo.
 *  4. Referencias técnicas (códigos): en MAYÚSCULAS. La observación conserva mayúsculas/minúsculas.
 *  5. Fechas: ISO 8601 en UTC con milisegundos (YYYY-MM-DDTHH:mm:ss.sssZ).
 *  6. numericScore: cadena decimal con exactamente 2 decimales ("15.50"); evita diferencias de coma flotante.
 *  7. version: entero sin comillas.
 *  8. Valores ausentes: null explícito (el campo nunca se omite).
 *  9. Salida: JSON compacto, sin espacios ni saltos de línea.
 */
export const CANONICAL_VERSION = '1';

export const CANONICAL_FIELD_ORDER = [
  'canonicalVersion',
  'academicRecordId',
  'studentReference',
  'enrollmentReference',
  'sectionReference',
  'subjectReference',
  'activityReference',
  'periodReference',
  'teacherReference',
  'qualitativeGrade',
  'numericScore',
  'observation',
  'recordedAt',
  'version',
] as const;

type CanonicalField = (typeof CANONICAL_FIELD_ORDER)[number];
type CanonicalValue = string | number | null;

export function normalizeText(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

function normalizeCode(value: string): string {
  return normalizeText(value).toUpperCase();
}

export function normalizeScore(value: string | number | null): string | null {
  if (value === null) return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) throw new TypeError(`numericScore no numérico: ${String(value)}`);
  return numeric.toFixed(2);
}

export function normalizeDate(value: Date | string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new TypeError(`Fecha inválida: ${String(value)}`);
  return parsed.toISOString();
}

/** Devuelve los pares campo/valor normalizados, en el orden canónico. */
export function toCanonicalEntries(input: AcademicRecordInput): Array<[CanonicalField, CanonicalValue]> {
  const record = AcademicRecordSchema.parse(input);
  const observation = record.observation === null ? null : normalizeText(record.observation);

  const values: Record<CanonicalField, CanonicalValue> = {
    canonicalVersion: CANONICAL_VERSION,
    academicRecordId: normalizeCode(record.academicRecordId),
    studentReference: normalizeCode(record.studentReference),
    enrollmentReference: normalizeCode(record.enrollmentReference),
    sectionReference: normalizeCode(record.sectionReference),
    subjectReference: normalizeCode(record.subjectReference),
    activityReference: normalizeCode(record.activityReference),
    periodReference: normalizeCode(record.periodReference),
    teacherReference: normalizeCode(record.teacherReference),
    qualitativeGrade: normalizeCode(record.qualitativeGrade),
    numericScore: normalizeScore(record.numericScore),
    observation: observation === '' ? null : observation,
    recordedAt: normalizeDate(record.recordedAt),
    version: record.version,
  };

  return CANONICAL_FIELD_ORDER.map((field) => [field, values[field]]);
}

/**
 * Serializa el registro a su forma canónica. Cada clave y valor se serializa por separado
 * con JSON.stringify (escapado estándar), y el objeto se arma respetando el orden fijo.
 */
export function canonicalizeAcademicRecord(input: AcademicRecordInput): string {
  const body = toCanonicalEntries(input)
    .map(([field, value]) => `${JSON.stringify(field)}:${JSON.stringify(value)}`)
    .join(',');
  return `{${body}}`;
}
