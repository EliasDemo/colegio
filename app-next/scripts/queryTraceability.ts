/**
 * npm run trace -- REG-0001
 * Línea de tiempo Off-chain (evento_trazabilidad + evidencia_blockchain) y eventos On-chain,
 * solo con referencias seudónimas.
 */
import { header, requireRecordCode, runCli } from './_cli';
import { traceabilityService } from '@/services/traceability.service';

const formatLocal = (date: Date) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'medium' }).format(date);
const short = (value: string | null | undefined) => (value ? `${value.slice(0, 16)}...` : '-');

void runCli(async () => {
  const code = requireRecordCode();
  header('TRAZABILIDAD DEL REGISTRO');

  const report = await traceabilityService.getTraceability(code);
  const r = report.record;

  console.log(`\nREGISTRO:\n${r.code}`);
  console.log(`Estudiante: ${r.studentToken} · Actividad: ${r.activityCode} (${r.areaCode}, ${r.periodCode}) · Versión vigente: ${r.version} · Estado: ${r.status}\n`);

  console.log('EVENTOS OFF-CHAIN (evento_trazabilidad, hora de Lima):\n');
  if (report.events.length === 0) console.log('(sin eventos)\n');
  for (const e of report.events) {
    console.log(formatLocal(e.creadoEn));
    console.log(`${e.eventoTipo}${e.resultadoVerificacion ? ` → ${e.resultadoVerificacion}` : ''}`);
    console.log(`Versión: ${e.version} · Estado: ${e.estadoEvento} · Rol: ${e.actorRolCodigo} · Evento: ${e.id}`);
    console.log(`Compromiso: ${short(e.compromisoHmac)} · Anterior: ${short(e.compromisoAnterior)}`);
    if (e.evidencia) console.log(`TX: ${short(e.evidencia.txId)} · Bloque: ${e.evidencia.blockNumber ?? '-'} · Validación: ${e.evidencia.validacion}`);
    if (e.errorDetalle) console.log(`Error: ${e.errorDetalle.slice(0, 120)}`);
    console.log('');
  }

  console.log('EVENTOS ON-CHAIN (Hyperledger Fabric):\n');
  if (report.onChainError) console.log(`(no disponible: ${report.onChainError})\n`);
  else if (!report.onChain?.length) console.log('(sin eventos anclados)\n');
  else {
    for (const e of report.onChain) {
      console.log(`${e.timestamp} · ${e.eventType} · v${e.version} · rol ${e.actorRole} · MSP ${e.submitterMspId}`);
      console.log(`  evento ${e.eventId} · compromiso ${short(e.commitment)} · anterior ${short(e.previousCommitment)} · TX ${short(e.txId)}`);
    }
  }
});
