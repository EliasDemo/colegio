/**
 * SOLO PARA PRUEBAS (PT-13). Simula una modificación NO autorizada directamente en MySQL,
 * sin pasar por la aplicación ni incrementar la versión.
 *
 *   npm run tamper -- REG-000001            altera la nota y guarda un respaldo local
 *   npm run tamper -- REG-000001 --restore  restaura el valor original
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { header, requireRecordCode, runCli } from './_cli';
import { prisma } from '@/lib/db/prisma';

const backupFile = (code: string) => path.resolve(process.cwd(), '.tamper', `${code}.json`);

void runCli(async () => {
  const code = requireRecordCode();
  const restore = process.argv.includes('--restore');
  header(restore ? 'RESTAURACIÓN DE PRUEBA' : 'SIMULACIÓN DE ALTERACIÓN (PT-13)');

  if (restore) {
    const saved = JSON.parse(await fs.readFile(backupFile(code), 'utf8')) as { grade: string; score: string | null };
    await prisma.$executeRaw`UPDATE academic_result SET qualitative_grade = ${saved.grade}, numeric_score = ${saved.score} WHERE code = ${code}`;
    await fs.rm(backupFile(code));
    console.log(`Registro ${code} restaurado a ${saved.grade} / ${saved.score ?? 'null'}.`);
    return;
  }

  const rows = await prisma.$queryRaw<Array<{ grade: string; score: string | null }>>`
    SELECT qualitative_grade AS grade, CAST(numeric_score AS CHAR) AS score FROM academic_result WHERE code = ${code}`;
  const original = rows[0];
  if (!original) throw new Error(`El registro ${code} no existe`);

  await fs.mkdir(path.dirname(backupFile(code)), { recursive: true });
  await fs.writeFile(backupFile(code), JSON.stringify(original));

  const tamperedScore = original.score === null || Number(original.score) < 20 ? '20.00' : '19.00';
  await prisma.$executeRaw`UPDATE academic_result SET qualitative_grade = 'AD', numeric_score = ${tamperedScore} WHERE code = ${code}`;
  console.log(`Registro ${code} modificado directamente en MySQL (sin nueva versión):`);
  console.log(`  antes:   ${original.grade} / ${original.score ?? 'null'}`);
  console.log(`  después: AD / ${tamperedScore}`);
  console.log(`\nEjecute ahora: npm run verify -- ${code}`);
});
