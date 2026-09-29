/**
 * SOLO PARA PRUEBAS (PT-13). Simula una modificación NO autorizada directamente en MySQL,
 * sin pasar por la aplicación, sin historial y sin incrementar la versión.
 *
 *   npm run tamper -- REG-0001            altera puntaje_obtenido y guarda un respaldo local
 *   npm run tamper -- REG-0001 --restore  restaura el valor original
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
    const saved = JSON.parse(await fs.readFile(backupFile(code), 'utf8')) as { score: string | null };
    await prisma.$executeRaw`UPDATE resultado_academico SET puntaje_obtenido = ${saved.score} WHERE codigo = ${code}`;
    await fs.rm(backupFile(code));
    console.log(`Registro ${code} restaurado a puntaje ${saved.score ?? 'null'}.`);
    return;
  }

  const rows = await prisma.$queryRaw<Array<{ score: string | null; max: string }>>`
    SELECT CAST(r.puntaje_obtenido AS CHAR) AS score, CAST(a.puntaje_maximo AS CHAR) AS max
    FROM resultado_academico r JOIN actividad_academica a ON a.actividad_id = r.actividad_id
    WHERE r.codigo = ${code}`;
  const original = rows[0];
  if (!original) throw new Error(`El registro ${code} no existe`);

  await fs.mkdir(path.dirname(backupFile(code)), { recursive: true });
  await fs.writeFile(backupFile(code), JSON.stringify({ score: original.score }));

  const max = Number(original.max);
  const tampered = (original.score === null || Number(original.score) < max ? max : max - 1).toFixed(2);
  await prisma.$executeRaw`UPDATE resultado_academico SET puntaje_obtenido = ${tampered} WHERE codigo = ${code}`;
  console.log(`Registro ${code} modificado directamente en MySQL (sin historial ni nueva versión):`);
  console.log(`  antes:   ${original.score ?? 'null'}`);
  console.log(`  después: ${tampered}`);
  console.log(`\nEjecute ahora: npm run verify -- ${code}`);
});
