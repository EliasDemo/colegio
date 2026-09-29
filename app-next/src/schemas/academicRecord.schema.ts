import { z } from 'zod';

/** REG-0001 (dataset Hito 2) o REG-V001 (complemento de validación). */
export const RECORD_CODE_PATTERN = /^REG-[0-9A-Z]{4,8}$/;
/** Tokens seudónimos del Hito 2: HMAC-SHA-256 truncado a 16 caracteres. */
export const STUDENT_TOKEN_PATTERN = /^STU-[0-9A-Z]{16}$/;
export const TEACHER_TOKEN_PATTERN = /^DOC-[0-9A-Z]{16}$/;
export const HEX_SHA256_PATTERN = /^[0-9a-f]{64}$/;
export const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const ROLE_PATTERN = /^[A-Z_]{3,40}$/;

export const RecordCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(RECORD_CODE_PATTERN, 'El código de registro debe tener el formato REG-0001');

const code = (pattern: RegExp, label: string) => z.string().trim().toUpperCase().regex(pattern, `${label} inválido`);
const decimal = z.union([z.number(), z.string().trim().regex(/^\d{1,4}(\.\d{1,2})?$/)]);
const isoDateTime = z.union([z.date(), z.string().datetime({ offset: true })]);
const isoDate = z.union([z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);

/** Payload canónico de un resultado académico. Solo tokens seudónimos y datos académicos. */
export const AcademicRecordSchema = z
  .object({
    objectRef: RecordCodeSchema,
    studentToken: code(STUDENT_TOKEN_PATTERN, 'studentToken'),
    periodCode: code(/^\d{4}-B[1-4]$/, 'periodCode'),
    gradeNumber: z.number().int().min(1).max(6),
    sectionCode: code(/^[A-Z]$/, 'sectionCode'),
    areaCode: code(/^[A-Z]{2,5}$/, 'areaCode'),
    activityCode: code(/^EV-[A-Z]{2,5}-[0-9A-Z]{3,4}$/, 'activityCode'),
    activityType: code(/^[A-Z_]{3,30}$/, 'activityType'),
    activityDate: isoDate,
    maxScore: decimal.refine((v) => Number(v) > 0, 'maxScore debe ser mayor que 0'),
    score: decimal.nullable(),
    status: z.enum(['VIGENTE', 'RECTIFICADO', 'REVOCADO']),
    registeredBy: z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9._-]+$/, 'registeredBy inválido'),
    registeredAt: isoDateTime,
    version: z.number().int().positive(),
  })
  .refine((r) => r.score === null || (Number(r.score) >= 0 && Number(r.score) <= Number(r.maxScore)), {
    message: 'score debe estar entre 0 y maxScore',
    path: ['score'],
  });

/** Validación del evento devuelto por el chaincode antes de usarlo. */
export const BlockchainEvidenceSchema = z.object({
  docType: z.literal('academicEvent'),
  eventId: z.string().regex(UUID_V4_PATTERN),
  objectType: z.enum(['RESULTADO', 'ACTIVIDAD', 'ASISTENCIA']),
  objectRef: z.string().regex(/^[A-Z]{2,4}-[0-9A-Z]{3,12}$/),
  eventType: z.enum(['CREACION', 'RECTIFICACION', 'VERIFICACION', 'REVOCACION']),
  version: z.number().int().positive(),
  commitment: z.string().regex(HEX_SHA256_PATTERN),
  previousCommitment: z.string().regex(HEX_SHA256_PATTERN).nullable(),
  algorithm: z.literal('HMAC-SHA-256'),
  actorRole: z.string().regex(ROLE_PATTERN),
  submitterMspId: z.string().min(1),
  timestamp: z.string().datetime(),
  status: z.literal('REGISTRADO'),
  txId: z.string().regex(HEX_SHA256_PATTERN),
});

/** Evento local (tabla evento_trazabilidad) antes de persistirlo. */
export const TraceabilityEventSchema = z.object({
  id: z.string().regex(UUID_V4_PATTERN),
  objetoTipo: z.enum(['RESULTADO', 'ACTIVIDAD', 'ASISTENCIA']),
  objetoRef: z.string().min(3).max(80),
  eventoTipo: z.enum(['CREACION', 'ACTUALIZACION', 'RECTIFICACION', 'VERIFICACION', 'REVOCACION']),
  version: z.number().int().positive(),
  actorUsuarioId: z.bigint().positive(),
  actorRolCodigo: z.string().regex(ROLE_PATTERN),
  compromisoHmac: z.string().regex(HEX_SHA256_PATTERN),
  compromisoAnterior: z.string().regex(HEX_SHA256_PATTERN).nullable(),
  resultadoVerificacion: z.enum(['INTEGRO', 'ALTERADO', 'NO_VERIFICABLE']).nullable().optional(),
});

export type TraceabilityEventInput = z.infer<typeof TraceabilityEventSchema>;

export const UsernameSchema = z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9._-]+$/, 'Nombre de usuario inválido');

/** Rectificación autorizada (RN-06, RN-07): nuevo puntaje y motivo obligatorio. */
export const RectificationSchema = z.object({
  newScore: z.number().min(0),
  reasonCode: z.string().trim().toUpperCase().regex(/^[A-Z_]{3,40}$/, 'motivo_codigo inválido (p. ej. ERROR_DIGITACION)'),
  reasonDetail: z.string().trim().min(5).max(500),
});

export type RectificationInput = z.infer<typeof RectificationSchema>;
