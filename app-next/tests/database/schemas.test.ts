import {
  AcademicRecordSchema,
  BlockchainEvidenceSchema,
  RecordCodeSchema,
  RectificationSchema,
  TraceabilityEventSchema,
  UsernameSchema,
} from '@/schemas/academicRecord.schema';
import { sampleInput } from '../fixtures';

const UUID = '6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b';

describe('Validaciones Zod', () => {
  it('RecordCodeSchema acepta los códigos del Hito 2 y del complemento', () => {
    expect(RecordCodeSchema.parse(' reg-0011 ')).toBe('REG-0011');
    expect(RecordCodeSchema.parse('REG-V001')).toBe('REG-V001');
    expect(RecordCodeSchema.safeParse('REG-1').success).toBe(false);
    expect(RecordCodeSchema.safeParse("REG-0001'; DROP TABLE x;--").success).toBe(false);
  });

  it('AcademicRecordSchema exige tokens seudónimos y puntaje dentro del máximo', () => {
    expect(AcademicRecordSchema.safeParse(sampleInput()).success).toBe(true);
    expect(AcademicRecordSchema.safeParse(sampleInput({ registeredBy: 'Rosa Quispe' })).success).toBe(false);
    expect(AcademicRecordSchema.safeParse(sampleInput({ studentToken: 'EST-001' })).success).toBe(false);
    expect(AcademicRecordSchema.safeParse(sampleInput({ score: '21.00' })).success).toBe(false);
  });

  it('BlockchainEvidenceSchema valida el evento devuelto por el chaincode', () => {
    const onChain = {
      docType: 'academicEvent',
      eventId: UUID,
      objectType: 'RESULTADO',
      objectRef: 'REG-0011',
      eventType: 'CREACION',
      version: 1,
      commitment: 'a'.repeat(64),
      previousCommitment: null,
      algorithm: 'HMAC-SHA-256',
      actorRole: 'ADMIN',
      submitterMspId: 'NuevoHorizonteMSP',
      timestamp: '2026-09-29T22:39:42.299Z',
      status: 'REGISTRADO',
      txId: 'b'.repeat(64),
    };
    expect(BlockchainEvidenceSchema.safeParse(onChain).success).toBe(true);
    expect(BlockchainEvidenceSchema.safeParse({ ...onChain, commitment: 'xyz' }).success).toBe(false);
    expect(BlockchainEvidenceSchema.safeParse({ ...onChain, eventId: 'EVD-1' }).success).toBe(false);
  });

  it('TraceabilityEventSchema valida el evento local antes de persistirlo', () => {
    const event = {
      id: UUID,
      objetoTipo: 'RESULTADO',
      objetoRef: 'REG-0011',
      eventoTipo: 'CREACION',
      version: 1,
      actorUsuarioId: 1n,
      actorRolCodigo: 'ADMIN',
      compromisoHmac: 'c'.repeat(64),
      compromisoAnterior: null,
    };
    expect(TraceabilityEventSchema.safeParse(event).success).toBe(true);
    expect(TraceabilityEventSchema.safeParse({ ...event, id: 'no-uuid' }).success).toBe(false);
    expect(TraceabilityEventSchema.safeParse({ ...event, eventoTipo: 'BORRADO' }).success).toBe(false);
  });

  it('UsernameSchema y RectificationSchema', () => {
    expect(UsernameSchema.safeParse('admin.prototipo').success).toBe(true);
    expect(UsernameSchema.safeParse('admin; DROP').success).toBe(false);
    expect(RectificationSchema.safeParse({ newScore: 16, reasonCode: 'error_digitacion', reasonDetail: 'Revisión de rúbrica' }).success).toBe(true);
    expect(RectificationSchema.safeParse({ newScore: 16, reasonCode: 'X', reasonDetail: 'Revisión de rúbrica' }).success).toBe(false);
    expect(RectificationSchema.safeParse({ newScore: 16, reasonCode: 'ERROR_DIGITACION', reasonDetail: '' }).success).toBe(false);
  });
});
