import { AcademicRecordSchema } from '@/schemas/academicRecord.schema';
import type { AcademicRecordInput } from '@/types/academic';

/**
 * Canonicalización determinista de un resultado académico (versión 2).
 * Implementa el "payload estable" del flujo de trazabilidad del Hito 2 (H2-06, paso 4).
 *
 * Reglas:
 *  1. Orden de campos fijo, definido en CANONICAL_FIELD_ORDER.
 *  2. Codificación UTF-8; textos normalizados a Unicode NFC; espacios recortados y colapsados.
 *  3. Códigos y tokens en MAYÚSCULAS; registeredBy (nombre de usuario) conserva su forma.
 *  4. Fechas de calendario (activityDate) como YYYY-MM-DD; marcas de tiempo (registeredAt)
 *     en ISO 8601 UTC con milisegundos.
 *  5. Puntajes como cadena decimal con exactamente 2 decimales ("19.00").
 *  6. Enteros (gradeNumber, version) sin comillas.
 *  7. Valores ausentes: null explícito (el campo nunca se omite).
 *  8. Salida: JSON compacto, sin espacios.
 */
export const CANONICAL_VERSION = '2';
export const OBJECT_TYPE = 'RESULTADO';

export const CANONICAL_FIELD_ORDER = [
  'canonicalVersion',
  'objectType',
  'objectRef',
  'studentToken',
  'periodCode',
  'gradeNumber',
  'sectionCode',
  'areaCode',
  'activityCode',
  'activityType',
  'activityDate',
  'maxScore',
  'score',
  'status',
  'registeredBy',
  'registeredAt',
  'version',
] as const;

type CanonicalField = (typeof CANONICAL_FIELD_ORDER)[number];
type CanonicalValue = string | number | null;

export function normalizeText(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

const normalizeCode = (value: string) => normalizeText(value).toUpperCase();

export function normalizeScore(value: string | number | null): string | null {
  if (value === null) return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) throw new TypeError(`Puntaje no numérico: ${String(value)}`);
  return numeric.toFixed(2);
}

export function normalizeDateTime(value: Date | string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new TypeError(`Fecha inválida: ${String(value)}`);
  return parsed.toISOString();
}

/** Fecha de calendario: se toma la parte de fecha en UTC (las columnas DATE se leen a medianoche UTC). */
export function normalizeDate(value: Date | string): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return normalizeDateTime(value).slice(0, 10);
}

/** Pares campo/valor normalizados, en el orden canónico. */
export function toCanonicalEntries(input: AcademicRecordInput): Array<[CanonicalField, CanonicalValue]> {
  const r = AcademicRecordSchema.parse(input);
  const values: Record<CanonicalField, CanonicalValue> = {
    canonicalVersion: CANONICAL_VERSION,
    objectType: OBJECT_TYPE,
    objectRef: normalizeCode(r.objectRef),
    studentToken: normalizeCode(r.studentToken),
    periodCode: normalizeCode(r.periodCode),
    gradeNumber: r.gradeNumber,
    sectionCode: normalizeCode(r.sectionCode),
    areaCode: normalizeCode(r.areaCode),
    activityCode: normalizeCode(r.activityCode),
    activityType: normalizeCode(r.activityType),
    activityDate: normalizeDate(r.activityDate),
    maxScore: normalizeScore(r.maxScore),
    score: normalizeScore(r.score),
    status: r.status,
    registeredBy: normalizeText(r.registeredBy),
    registeredAt: normalizeDateTime(r.registeredAt),
    version: r.version,
  };
  return CANONICAL_FIELD_ORDER.map((field) => [field, values[field]]);
}

/**
 * Serializa el registro a su forma canónica: cada clave y valor con JSON.stringify
 * (escapado estándar) y el objeto armado respetando el orden fijo.
 */
export function canonicalizeAcademicRecord(input: AcademicRecordInput): string {
  const body = toCanonicalEntries(input)
    .map(([field, value]) => `${JSON.stringify(field)}:${JSON.stringify(value)}`)
    .join(',');
  return `{${body}}`;
}
