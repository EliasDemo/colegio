/**
 * npm run demo:evidence -- REG-0001
 * Demostración del compromiso criptográfico sobre un registro real de MySQL:
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

  console.log('1) Payload canónico v2 (UTF-8, orden fijo, sin espacios):\n');
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

  const original = Number(input.score);
  const delta = original + 0.01 > Number(input.maxScore) ? -0.01 : 0.01;
  const altered = { ...input, score: (original + delta).toFixed(2) };
  const alteredEvidence = generateEvidence(altered, secret).evidence;
  console.log(`\n4) Efecto avalancha: puntaje ${input.score} → ${altered.score}`);
  console.log(`   ${alteredEvidence}`);
  console.log(`   Bits distintos: ${differentBits(evidence, alteredEvidence)} de 256`);

  console.log('\n5) Verificación:');
  console.log(`   verifyEvidence(registro original, compromiso)  → valid = ${verifyEvidence(input, evidence, secret).valid}`);
  console.log(`   verifyEvidence(registro alterado, compromiso)  → valid = ${verifyEvidence(altered, evidence, secret).valid}`);

  // Ataque de diccionario: el adversario conoce el formato y los tokens del registro, no la nota.
  // En el dataset del Hito 2 las notas son enteros de 0 a 20: solo 21 candidatos.
  const candidates = Array.from({ length: 21 }, (_, s) => s.toFixed(2));
  const recovered = candidates.find((s) => sha256(canonicalizeAcademicRecord({ ...input, score: s })) === plainHash);
  console.log(`\n6) Ataque de diccionario sobre ${candidates.length} puntajes posibles (0-20):`);
  console.log(`   Contra SHA-256 sin clave         → ${recovered ? `NOTA DESCUBIERTA: ${recovered}` : 'no encontrada'}`);
  const wrongKey = 'clave-de-un-atacante-que-no-conoce-el-secreto-real';
  const recoveredHmac = candidates.find((s) => computeHmac(canonicalizeAcademicRecord({ ...input, score: s }), wrongKey) === evidence);
  console.log(`   Contra HMAC sin conocer la clave → ${recoveredHmac ? 'nota descubierta' : 'no encontrada (el compromiso no revela la nota)'}`);
});
