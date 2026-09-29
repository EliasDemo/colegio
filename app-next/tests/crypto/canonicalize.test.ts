import { CANONICAL_FIELD_ORDER, canonicalizeAcademicRecord } from '@/lib/crypto/canonicalize';
import { sampleInput } from '../fixtures';

describe('canonicalizeAcademicRecord()', () => {
  it('produce exactamente la cadena canónica esperada', () => {
    expect(canonicalizeAcademicRecord(sampleInput())).toBe(
      '{"canonicalVersion":"1","academicRecordId":"REG-000001","studentReference":"EST-PSE-001",' +
        '"enrollmentReference":"MAT-2026-0001","sectionReference":"2026-1A","subjectReference":"MAT",' +
        '"activityReference":"ACT-2026-001","periodReference":"2026-B2","teacherReference":"DOC-PSE-001",' +
        '"qualitativeGrade":"A","numericScore":"15.50","observation":null,' +
        '"recordedAt":"2026-06-10T20:15:00.000Z","version":1}',
    );
  });

  it('es determinista: la misma entrada produce siempre la misma salida', () => {
    const outputs = new Set(Array.from({ length: 50 }, () => canonicalizeAcademicRecord(sampleInput())));
    expect(outputs.size).toBe(1);
  });

  it('no depende del orden de las propiedades del objeto de entrada', () => {
    const input = sampleInput();
    const reversed = Object.fromEntries(Object.entries(input).reverse()) as typeof input;
    expect(canonicalizeAcademicRecord(reversed)).toBe(canonicalizeAcademicRecord(input));
  });

  it('respeta el orden de campos definido', () => {
    const keys = Object.keys(JSON.parse(canonicalizeAcademicRecord(sampleInput())));
    expect(keys).toEqual([...CANONICAL_FIELD_ORDER]);
  });

  it('normaliza espacios, mayúsculas de códigos y Unicode (NFC)', () => {
    const decomposed = 'Requiere acompañamiento'; // "ñ" como n + tilde combinada
    const noisy = canonicalizeAcademicRecord(
      sampleInput({ studentReference: '  est-pse-001 ', subjectReference: 'mat', observation: `  ${decomposed}   pedagógico ` }),
    );
    const clean = canonicalizeAcademicRecord(sampleInput({ observation: 'Requiere acompañamiento pedagógico' }));
    expect(noisy).toBe(clean);
  });

  it('formatea números con 2 decimales y fechas en ISO 8601 UTC', () => {
    const fromNumber = canonicalizeAcademicRecord(sampleInput({ numericScore: 15.5, recordedAt: '2026-06-10T15:15:00-05:00' }));
    expect(fromNumber).toBe(canonicalizeAcademicRecord(sampleInput()));
  });

  it('representa los valores ausentes como null explícito', () => {
    const parsed = JSON.parse(canonicalizeAcademicRecord(sampleInput({ numericScore: null, observation: '   ' })));
    expect(parsed.numericScore).toBeNull();
    expect(parsed.observation).toBeNull();
  });

  it('rechaza registros inválidos o con datos no seudonimizados', () => {
    expect(() => canonicalizeAcademicRecord(sampleInput({ studentReference: 'Luis Alberto Mamani Quispe' }))).toThrow();
    expect(() => canonicalizeAcademicRecord(sampleInput({ numericScore: '25' }))).toThrow();
    expect(() => canonicalizeAcademicRecord(sampleInput({ version: 0 }))).toThrow();
  });
});
