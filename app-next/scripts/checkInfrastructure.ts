/**
 * npm run check
 * Comprueba configuración, MySQL (Prisma) y Hyperledger Fabric (Gateway → peer → chaincode).
 */
import { header, runCli } from './_cli';
import { prisma } from '@/lib/db/prisma';
import { getFabricEnv, getHmacSecret } from '@/lib/env/config';
import { fabricAcademicLedger } from '@/lib/fabric/academicLedger';
import { FabricError } from '@/lib/fabric/errors';

type Check = { name: string; ok: boolean; detail: string };

async function check(name: string, run: () => Promise<string>): Promise<Check> {
  try {
    return { name, ok: true, detail: await run() };
  } catch (error) {
    if (error instanceof FabricError) {
      return { name, ok: false, detail: `${error.code}: ${error.message.split('\n')[0]} (${error.hint})` };
    }
    // Los errores de Prisma traen primero el fragmento de código y la causa en la última línea.
    const lines = (error instanceof Error ? error.message : String(error))
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return { name, ok: false, detail: lines.at(-1) ?? 'error desconocido' };
  }
}

void runCli(async () => {
  header('VERIFICACIÓN DE INFRAESTRUCTURA');

  const checks: Check[] = [];
  checks.push(await check('Variable HMAC_SECRET', async () => `definida (${getHmacSecret().length} caracteres)`));
  checks.push(await check('Configuración Fabric', async () => {
    const env = getFabricEnv();
    return `${env.FABRIC_MSP_ID} → ${env.FABRIC_PEER_ENDPOINT} · ${env.FABRIC_CHANNEL_NAME}/${env.FABRIC_CHAINCODE_NAME}`;
  }));
  checks.push(await check('Conexión MySQL (Prisma)', async () => {
    const [row] = await prisma.$queryRaw<Array<{ version: string }>>`SELECT VERSION() AS version`;
    return `MySQL ${row?.version}`;
  }));
  checks.push(await check('Registros académicos', async () => {
    const [results, students, activities] = await Promise.all([
      prisma.academicResult.count(),
      prisma.student.count(),
      prisma.academicActivity.count(),
    ]);
    if (results === 0) throw new Error('No hay registros: ejecute npm run seed');
    return `${results} resultados · ${students} estudiantes · ${activities} actividades`;
  }));
  checks.push(await check('Fabric Gateway → chaincode', async () => {
    const exists = await fabricAcademicLedger.evidenceExists('EVD-REG-000000-V1');
    return `academicEvidenceExists respondió (${exists})`;
  }));
  checks.push(await check('Evidencias vinculadas en MySQL', async () => {
    const confirmed = await prisma.blockchainEvidence.count({ where: { status: 'CONFIRMADO' } });
    const pending = await prisma.blockchainEvidence.count({ where: { status: { in: ['PENDIENTE', 'FALLIDO'] } } });
    return `${confirmed} confirmadas · ${pending} pendientes/fallidas`;
  }));

  for (const item of checks) console.log(`${item.ok ? '[OK]   ' : '[FALLA]'} ${item.name}: ${item.detail}`);
  const failed = checks.filter((c) => !c.ok).length;
  console.log(failed === 0 ? '\nINFRAESTRUCTURA OPERATIVA.' : `\n${failed} comprobación(es) fallida(s).`);
  if (failed > 0) process.exitCode = 1;
});
