/**
 * npm run demo:evidence -- REG-000001
 * Demostración de la evidencia criptográfica sobre un registro real de MySQL:
 * forma canónica, SHA-256 vs HMAC-SHA-256, determinismo, efecto avalancha y por qué
 * un hash sin clave permitiría deducir la nota (ataque de diccionario).
 */
import { createHash } from 'node:crypto';
import { header, requireRecordCode, runCli } from './_cli';
import { canonicalizeAcademicRecord } from '@/lib/crypto/canonicalize';
import { computeHmac, generateEvidence } from '@/lib/crypto/generateEvidence';
import { verifyEvidence } from '@/lib/crypto/verifyEvidence';
import { getHmacSecret } from '@/lib/env/config';
import { academicRecordService, toAcademicRecordInput } from '@/services/academicRecord.service';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

function differentBits(a: string, b: string): number {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  let bits = 0;
  for (let i = 0; i < x.length; i++) {
    let v = x[i]! ^ y[i]!;
    while (v) {
      bits += v & 1;
      v >>= 1;
    }
  }
  return bits;
}

void runCli(async () => {
  const code = requireRecordCode();
  const secret = getHmacSecret();
  header('DEMOSTRACIÓN DE EVIDENCIA CRIPTOGRÁFICA');

  const record = await academicRecordService.getByCode(code);
  const input = toAcademicRecordInput(record);
  const canonical = canonicalizeAcademicRecord(input);

  console.log('1) Forma canónica (UTF-8, orden fijo, sin espacios):\n');
  console.log(canonical);
  console.log(`\n   Longitud: ${Buffer.byteLength(canonical, 'utf8')} bytes`);

  const plainHash = sha256(canonical);
  const evidence = generateEvidence(input, secret).evidence;
  console.log('\n2) Resúmenes de la misma cadena:\n');
  console.log(`   SHA-256 (sin clave)        : ${plainHash}`);
  console.log(`   HMAC-SHA-256 (HMAC_SECRET) : ${evidence}`);

  const runs = new Set(Array.from({ length: 1000 }, () => generateEvidence(toAcademicRecordInput(record), secret).evidence));
  console.log(`\n3) Determinismo: 1000 cálculos → ${runs.size} valor(es) distinto(s)`);

  const reordered = Object.fromEntries(Object.entries(input).reverse()) as typeof input;
  console.log(`   Mismo registro con propiedades en otro orden → ${generateEvidence(reordered, secret).evidence === evidence ? 'misma evidencia' : 'EVIDENCIA DISTINTA'}`);

  const original = Number(input.numericScore);
  const altered = { ...input, numericScore: (original + 0.01).toFixed(2) };
  const alteredEvidence = generateEvidence(altered, secret).evidence;
  console.log(`\n4) Efecto avalancha: nota ${input.numericScore} → ${altered.numericScore}`);
  console.log(`   ${alteredEvidence}`);
  console.log(`   Bits distintos: ${differentBits(evidence, alteredEvidence)} de 256`);

  console.log('\n5) Verificación:');
  console.log(`   verifyEvidence(registro original, evidence)  → valid = ${verifyEvidence(input, evidence, secret).valid}`);
  console.log(`   verifyEvidence(registro alterado, evidence)  → valid = ${verifyEvidence(altered, evidence, secret).valid}`);

  // Ataque de diccionario: el adversario conoce el formato y las referencias del registro,
  // pero no la nota. Las notas posibles (0.00-20.00 en pasos de 0.50, 4 calificaciones) son pocas.
  const candidates: Array<{ grade: string; score: string }> = [];
  for (const grade of ['AD', 'A', 'B', 'C']) {
    for (let s = 0; s <= 40; s++) candidates.push({ grade, score: (s / 2).toFixed(2) });
  }
  const recovered = candidates.find((c) => sha256(canonicalizeAcademicRecord({ ...input, qualitativeGrade: c.grade, numericScore: c.score })) === plainHash);
  console.log(`\n6) Ataque de diccionario sobre ${candidates.length} combinaciones de calificación y nota:`);
  console.log(`   Contra SHA-256 sin clave      → ${recovered ? `NOTA DESCUBIERTA: ${recovered.grade} / ${recovered.score}` : 'no encontrada'}`);
  const wrongKey = 'clave-de-un-atacante-que-no-conoce-el-secreto-real';
  const recoveredHmac = candidates.find((c) => computeHmac(canonicalizeAcademicRecord({ ...input, qualitativeGrade: c.grade, numericScore: c.score }), wrongKey) === evidence);
  console.log(`   Contra HMAC sin conocer la clave → ${recoveredHmac ? 'nota descubierta' : 'no encontrada (la evidencia no revela la nota)'}`);
});
