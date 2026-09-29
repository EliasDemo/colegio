/**
 * npm run rectify -- REG-000001 A 16.50 "Motivo de la rectificación"
 * Rectificación AUTORIZADA: guarda la versión anterior en el historial, incrementa la versión
 * y ancla la nueva evidencia en Fabric (el historial On-chain no se modifica).
 */
import { header, runCli } from './_cli';
import { traceabilityService } from '@/services/traceability.service';

void runCli(async () => {
  const [code, grade, score, ...reasonParts] = process.argv.slice(2);
  if (!code || !grade) {
    console.error('Uso: npm run rectify -- REG-000001 <AD|A|B|C> <nota 0-20|null> "motivo"');
    process.exit(2);
  }
  header('RECTIFICACIÓN AUTORIZADA');

  const result = await traceabilityService.rectifyAcademicRecord(code, {
    qualitativeGrade: grade.toUpperCase() as 'AD' | 'A' | 'B' | 'C',
    numericScore: score === undefined || score === 'null' ? null : Number(score),
    reason: reasonParts.join(' ') || 'Rectificación de calificación autorizada',
  });

  console.log(`\nRegistro: ${result.record.code} → versión ${result.record.version}`);
  console.log(`Evidence: ${result.evidence}`);
  console.log(`TX_ID: ${result.txId}\n`);
  console.log('PROCESO COMPLETADO CORRECTAMENTE.');
});
