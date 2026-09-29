/**
 * npm run trace -- REG-000001
 * Muestra la trazabilidad Off-chain (eventos) y On-chain (versiones ancladas) sin datos personales.
 */
import { header, requireRecordCode, runCli } from './_cli';
import { traceabilityService } from '@/services/traceability.service';

const formatLocal = (date: Date) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' }).format(date);

void runCli(async () => {
  const code = requireRecordCode();
  header('TRAZABILIDAD DEL REGISTRO');

  const report = await traceabilityService.getTraceability(code);

  console.log(`\nREGISTRO:\n${report.record.code}`);
  console.log(`Estudiante: ${report.record.studentReference} · Actividad: ${report.record.activityReference} · Versión actual: ${report.record.version}\n`);

  console.log('EVENTOS (MySQL, hora de Lima):\n');
  if (report.events.length === 0) console.log('(sin eventos)\n');
  for (const event of report.events) {
    console.log(formatLocal(event.occurredAt));
    console.log(event.eventType);
    console.log(`Version: ${event.version} · Estado: ${event.status} · Actor: ${event.actorReference} (${event.actorRole})`);
    if (event.txId) console.log(`TX: ${event.txId.slice(0, 16)}...`);
    if (event.detail) console.log(`Detalle: ${event.detail}`);
    console.log('');
  }

  console.log('EVIDENCIAS ON-CHAIN (Hyperledger Fabric):\n');
  if (report.onChainError) {
    console.log(`(no disponible: ${report.onChainError})\n`);
  } else if (!report.onChain || report.onChain.length === 0) {
    console.log('(sin evidencias ancladas)\n');
  } else {
    for (const item of report.onChain) {
      const local = report.localEvidences.find((e) => e.evidenceId === item.evidenceId);
      console.log(`${item.evidenceId} · ${item.eventType} · v${item.version} · ${item.timestamp}`);
      console.log(`  evidence ${item.evidence.slice(0, 16)}... · TX ${item.txId.slice(0, 16)}... · MSP ${item.submitterMspId}`);
      console.log(`  vínculo MySQL: ${local ? `${local.status}${local.blockNumber !== null ? ` (bloque ${local.blockNumber})` : ''}` : 'NO ENCONTRADO'}`);
    }
  }
});
