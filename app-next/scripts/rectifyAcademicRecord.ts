/**
 * npm run rectify -- REG-0001 <nuevo_puntaje> <MOTIVO_CODIGO> "detalle del motivo"
 * Rectificación AUTORIZADA (RN-06, RN-07): guarda el cambio en historial_resultado, incrementa
 * version_actual y ancla un evento RECTIFICACION encadenado al compromiso anterior.
 */
import { header, runCli } from './_cli';
import { traceabilityService } from '@/services/traceability.service';

void runCli(async () => {
  const [code, score, reasonCode, ...detail] = process.argv.slice(2);
  if (!code || score === undefined || !reasonCode) {
    console.error('Uso: npm run rectify -- REG-0001 <nuevo_puntaje> <MOTIVO_CODIGO> "detalle del motivo"');
    process.exit(2);
  }
  header('RECTIFICACIÓN AUTORIZADA');

  const r = await traceabilityService.rectifyAcademicRecord(code, {
    newScore: Number(score),
    reasonCode,
    reasonDetail: detail.join(' ') || 'Rectificación autorizada',
  });

  console.log(`\nRegistro: ${r.record.code} → versión ${r.record.version} (${r.record.status})`);
  console.log(`Evento ${r.eventType}: ${r.eventId}`);
  console.log(`Compromiso: ${r.commitment}`);
  console.log(`Compromiso anterior: ${r.previousCommitment}`);
  console.log(`TX_ID: ${r.txId}\n`);
  console.log('PROCESO COMPLETADO CORRECTAMENTE.');
});
