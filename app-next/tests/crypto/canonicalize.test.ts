import { CANONICAL_FIELD_ORDER, canonicalizeAcademicRecord } from '@/lib/crypto/canonicalize';
import { sampleInput } from '../fixtures';

describe('canonicalizeAcademicRecord() — payload canónico v2', () => {
  it('produce exactamente la cadena canónica esperada', () => {
    expect(canonicalizeAcademicRecord(sampleInput())).toBe(
      '{"canonicalVersion":"2","objectType":"RESULTADO","objectRef":"REG-0011","studentToken":"STU-54134667DA103F7B",' +
        '"periodCode":"2026-B3","gradeNumber":3,"sectionCode":"A","areaCode":"CTA","activityCode":"EV-CTA-301",' +
        '"activityType":"INFORME","activityDate":"2026-09-03","maxScore":"20.00","score":"19.00","status":"VIGENTE",' +
        '"registeredBy":"DOC-EE60960CC95C1748","registeredAt":"2026-09-03T00:00:00.000Z","version":1}',
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
    expect(Object.keys(JSON.parse(canonicalizeAcademicRecord(sampleInput())))).toEqual([...CANONICAL_FIELD_ORDER]);
  });

  it('normaliza espacios y mayúsculas de códigos y tokens', () => {
    const noisy = canonicalizeAcademicRecord(sampleInput({ studentToken: '  stu-54134667da103f7b ', areaCode: 'cta', activityCode: 'ev-cta-301' }));
    expect(noisy).toBe(canonicalizeAcademicRecord(sampleInput()));
  });

  it('formatea puntajes con 2 decimales y fechas en ISO 8601', () => {
    const variant = canonicalizeAcademicRecord(
      sampleInput({ score: 19, maxScore: 20, activityDate: new Date('2026-09-03T00:00:00.000Z'), registeredAt: '2026-09-02T19:00:00-05:00' }),
    );
    expect(variant).toBe(canonicalizeAcademicRecord(sampleInput()));
  });

  it('representa el puntaje ausente como null explícito', () => {
    expect(JSON.parse(canonicalizeAcademicRecord(sampleInput({ score: null }))).score).toBeNull();
  });

  it('rechaza registros inválidos o con identidad en lugar de tokens', () => {
    expect(() => canonicalizeAcademicRecord(sampleInput({ studentToken: 'Luis Alberto Mamani Quispe' }))).toThrow();
    expect(() => canonicalizeAcademicRecord(sampleInput({ score: '25' }))).toThrow('score');
    expect(() => canonicalizeAcademicRecord(sampleInput({ version: 0 }))).toThrow();
    expect(() => canonicalizeAcademicRecord(sampleInput({ status: 'ACTIVO' }))).toThrow();
  });
});
