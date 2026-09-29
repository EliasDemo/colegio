import { z } from 'zod';

export const RECORD_CODE_PATTERN = /^REG-\d{6}$/;
export const PSEUDONYM_PATTERN = /^(EST|DOC|ADM|AUD)-PSE-\d{3}$/;
export const HEX_SHA256_PATTERN = /^[0-9a-f]{64}$/;

export const RecordCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(RECORD_CODE_PATTERN, 'El código de registro debe tener el formato REG-000001');

const referenceCode = (pattern: RegExp, label: string) =>
  z.string().trim().toUpperCase().regex(pattern, `${label} inválido`);

/** Estructura mínima que se canonicaliza y firma. Solo referencias seudónimas. */
export const AcademicRecordSchema = z.object({
  academicRecordId: RecordCodeSchema,
  studentReference: referenceCode(/^EST-PSE-\d{3}$/, 'studentReference'),
  enrollmentReference: referenceCode(/^MAT-\d{4}-\d{4}$/, 'enrollmentReference'),
  sectionReference: referenceCode(/^\d{4}-\d[A-Z]$/, 'sectionReference'),
  subjectReference: referenceCode(/^[A-Z]{2,5}$/, 'subjectReference'),
  activityReference: referenceCode(/^ACT-\d{4}-\d{3}$/, 'activityReference'),
  periodReference: referenceCode(/^\d{4}-B[1-4]$/, 'periodReference'),
  teacherReference: referenceCode(/^DOC-PSE-\d{3}$/, 'teacherReference'),
  qualitativeGrade: z.enum(['AD', 'A', 'B', 'C']),
  numericScore: z
    .union([z.number(), z.string().trim().regex(/^\d{1,2}(\.\d{1,2})?$/)])
    .nullable()
    .refine((v) => v === null || (Number(v) >= 0 && Number(v) <= 20), 'numericScore debe estar entre 0 y 20'),
  observation: z.string().max(255).nullable(),
  recordedAt: z.union([z.date(), z.string().datetime({ offset: true })]),
  version: z.number().int().positive(),
});

/** Validación del objeto devuelto por el chaincode antes de usarlo. */
export const BlockchainEvidenceSchema = z.object({
  docType: z.literal('academicEvidence'),
  evidenceId: z.string().regex(/^EVD-REG-\d{6}-V\d+$/),
  recordReference: RecordCodeSchema,
  eventType: z.enum(['REGISTRO', 'RECTIFICACION']),
  version: z.number().int().positive(),
  evidence: z.string().regex(HEX_SHA256_PATTERN),
  algorithm: z.literal('HMAC-SHA-256'),
  actorReference: z.string().regex(PSEUDONYM_PATTERN),
  actorRole: z.string().min(1),
  submitterMspId: z.string().min(1),
  timestamp: z.string().datetime(),
  status: z.literal('REGISTRADO'),
  txId: z.string().regex(HEX_SHA256_PATTERN),
});

export const TraceabilityEventSchema = z.object({
  resultId: z.number().int().positive(),
  eventType: z.enum(['REGISTRO', 'VERIFICACION', 'RECTIFICACION']),
  version: z.number().int().positive(),
  status: z.enum(['PENDIENTE', 'CONFIRMADO', 'INTEGRO', 'ALTERADO', 'FALLIDO']),
  actorReference: z.string().regex(PSEUDONYM_PATTERN),
  actorRole: z.string().min(1).max(30),
  evidenceId: z.string().max(40).nullable().optional(),
  txId: z.string().regex(HEX_SHA256_PATTERN).nullable().optional(),
  detail: z.string().max(500).nullable().optional(),
});

export type TraceabilityEventInput = z.infer<typeof TraceabilityEventSchema>;

export const ActorSchema = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PSEUDONYM_PATTERN, 'El actor debe ser un código seudónimo (p. ej. ADM-PSE-001)'),
  role: z.string().trim().toUpperCase().min(1).max(30),
});

export const RectificationSchema = z.object({
  qualitativeGrade: z.enum(['AD', 'A', 'B', 'C']),
  numericScore: z.number().min(0).max(20).nullable(),
  reason: z.string().trim().min(5).max(255),
});

export type RectificationInput = z.infer<typeof RectificationSchema>;
