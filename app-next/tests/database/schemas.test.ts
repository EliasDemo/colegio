import {
  AcademicRecordSchema,
  ActorSchema,
  BlockchainEvidenceSchema,
  RecordCodeSchema,
  RectificationSchema,
  TraceabilityEventSchema,
} from '@/schemas/academicRecord.schema';
import { sampleInput } from '../fixtures';

describe('Validaciones Zod', () => {
  it('RecordCodeSchema normaliza y valida el código', () => {
    expect(RecordCodeSchema.parse(' reg-000001 ')).toBe('REG-000001');
    expect(RecordCodeSchema.safeParse('REG-1').success).toBe(false);
    expect(RecordCodeSchema.safeParse("REG-000001'; DROP TABLE x;--").success).toBe(false);
  });

  it('AcademicRecordSchema acepta un registro válido y rechaza nombres en lugar de seudónimos', () => {
    expect(AcademicRecordSchema.safeParse(sampleInput()).success).toBe(true);
    expect(AcademicRecordSchema.safeParse(sampleInput({ teacherReference: 'Rosa Quispe' })).success).toBe(false);
    expect(AcademicRecordSchema.safeParse(sampleInput({ qualitativeGrade: 'E' })).success).toBe(false);
  });

  it('BlockchainEvidenceSchema valida el objeto devuelto por el chaincode', () => {
    const onChain = {
      docType: 'academicEvidence',
      evidenceId: 'EVD-REG-000001-V1',
      recordReference: 'REG-000001',
      eventType: 'REGISTRO',
      version: 1,
      evidence: 'a'.repeat(64),
      algorithm: 'HMAC-SHA-256',
      actorReference: 'ADM-PSE-001',
      actorRole: 'ADMINISTRADOR',
      submitterMspId: 'NuevoHorizonteMSP',
      timestamp: '2026-09-28T22:39:42.299Z',
      status: 'REGISTRADO',
      txId: 'b'.repeat(64),
    };
    expect(BlockchainEvidenceSchema.safeParse(onChain).success).toBe(true);
    expect(BlockchainEvidenceSchema.safeParse({ ...onChain, evidence: 'xyz' }).success).toBe(false);
    expect(BlockchainEvidenceSchema.safeParse({ ...onChain, actorReference: 'Juan Perez' }).success).toBe(false);
  });

  it('TraceabilityEventSchema y ActorSchema exigen actores seudónimos', () => {
    const event = { resultId: 1, eventType: 'VERIFICACION', version: 1, status: 'INTEGRO', actorReference: 'AUD-PSE-001', actorRole: 'AUDITOR' };
    expect(TraceabilityEventSchema.safeParse(event).success).toBe(true);
    expect(TraceabilityEventSchema.safeParse({ ...event, status: 'OK' }).success).toBe(false);
    expect(ActorSchema.parse({ reference: 'adm-pse-001', role: 'administrador' })).toEqual({ reference: 'ADM-PSE-001', role: 'ADMINISTRADOR' });
    expect(ActorSchema.safeParse({ reference: 'admin', role: 'ADMIN' }).success).toBe(false);
  });

  it('RectificationSchema exige nota válida y motivo', () => {
    expect(RectificationSchema.safeParse({ qualitativeGrade: 'A', numericScore: 16, reason: 'Revisión de rúbrica' }).success).toBe(true);
    expect(RectificationSchema.safeParse({ qualitativeGrade: 'A', numericScore: 21, reason: 'Revisión de rúbrica' }).success).toBe(false);
    expect(RectificationSchema.safeParse({ qualitativeGrade: 'A', numericScore: 16, reason: '' }).success).toBe(false);
  });
});
