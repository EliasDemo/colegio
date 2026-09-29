import { createHmac } from 'node:crypto';
import { canonicalizeAcademicRecord } from '@/lib/crypto/canonicalize';
import { buildEvidenceId, generateEvidence } from '@/lib/crypto/generateEvidence';
import { evidencesMatch, verifyEvidence } from '@/lib/crypto/verifyEvidence';
import { sampleInput, TEST_SECRET } from '../fixtures';

describe('generateEvidence()', () => {
  it('genera HMAC-SHA-256 hexadecimal de 64 caracteres', () => {
    const result = generateEvidence(sampleInput(), TEST_SECRET);
    expect(result.evidence).toMatch(/^[0-9a-f]{64}$/);
    expect(result.algorithm).toBe('HMAC-SHA-256');
    expect(result.canonicalVersion).toBe('1');
  });

  it('coincide con un HMAC calculado de forma independiente sobre la cadena canónica', () => {
    const expected = createHmac('sha256', TEST_SECRET).update(canonicalizeAcademicRecord(sampleInput()), 'utf8').digest('hex');
    expect(generateEvidence(sampleInput(), TEST_SECRET).evidence).toBe(expected);
  });

  it('es determinista', () => {
    expect(generateEvidence(sampleInput(), TEST_SECRET).evidence).toBe(generateEvidence(sampleInput(), TEST_SECRET).evidence);
  });

  it('cambia ante cualquier modificación del registro', () => {
    const base = generateEvidence(sampleInput(), TEST_SECRET).evidence;
    expect(generateEvidence(sampleInput({ numericScore: '15.51' }), TEST_SECRET).evidence).not.toBe(base);
    expect(generateEvidence(sampleInput({ qualitativeGrade: 'AD' }), TEST_SECRET).evidence).not.toBe(base);
    expect(generateEvidence(sampleInput({ version: 2 }), TEST_SECRET).evidence).not.toBe(base);
    expect(generateEvidence(sampleInput({ recordedAt: new Date('2026-06-10T20:15:00.001Z') }), TEST_SECRET).evidence).not.toBe(base);
  });

  it('depende de la clave secreta (sin clave no se puede recalcular)', () => {
    const other = 'otra-clave-secreta-0123456789abcdef0123456789';
    expect(generateEvidence(sampleInput(), other).evidence).not.toBe(generateEvidence(sampleInput(), TEST_SECRET).evidence);
  });

  it('rechaza claves cortas', () => {
    expect(() => generateEvidence(sampleInput(), 'corta')).toThrow('32 caracteres');
  });

  it('usa HMAC_SECRET del entorno cuando no se inyecta la clave', () => {
    expect(generateEvidence(sampleInput()).evidence).toBe(generateEvidence(sampleInput(), process.env.HMAC_SECRET!).evidence);
  });

  it('construye el evidenceId determinista', () => {
    expect(buildEvidenceId('reg-000001', 2)).toBe('EVD-REG-000001-V2');
  });
});

describe('verifyEvidence()', () => {
  const evidence = generateEvidence(sampleInput(), TEST_SECRET).evidence;

  it('valida un registro íntegro', () => {
    expect(verifyEvidence(sampleInput(), evidence, TEST_SECRET)).toEqual({ valid: true, computedEvidence: evidence });
  });

  it('detecta un registro modificado', () => {
    const result = verifyEvidence(sampleInput({ numericScore: '20.00' }), evidence, TEST_SECRET);
    expect(result.valid).toBe(false);
    expect(result.computedEvidence).not.toBe(evidence);
  });

  it('acepta la evidencia en mayúsculas y rechaza formatos inválidos', () => {
    expect(verifyEvidence(sampleInput(), evidence.toUpperCase(), TEST_SECRET).valid).toBe(true);
    expect(verifyEvidence(sampleInput(), 'no-es-hex', TEST_SECRET).valid).toBe(false);
    expect(evidencesMatch(evidence, evidence.slice(0, 60))).toBe(false);
  });
});
