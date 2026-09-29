/**
 * npm run record -- REG-000001
 * Lee el registro en MySQL, genera su evidencia HMAC-SHA-256, la ancla en Fabric y guarda el TX_ID.
 */
import { header, requireRecordCode, runCli } from './_cli';
import { traceabilityService } from '@/services/traceability.service';

void runCli(async () => {
  const code = requireRecordCode();
  header('REGISTRO ACADÉMICO');

  const result = await traceabilityService.registerAcademicRecordEvidence(code);

  console.log(`\nRegistro: ${result.record.code}\n`);
  console.log(`Estudiante:\n${result.record.studentReference}\n`);
  console.log(`Actividad:\n${result.record.activityReference}  (${result.record.subjectCode}, ${result.record.periodCode}, ${result.record.sectionCode})\n`);
  console.log(`Versión:\n${result.record.version}  (${result.eventType})\n`);
  console.log(`Evidence (HMAC-SHA-256):\n${result.evidence}\n`);
  console.log(`Evidence ID:\n${result.evidenceId}\n`);

  if (result.alreadyRegistered) {
    console.log('La evidencia de esta versión ya estaba anclada en Hyperledger Fabric.\n');
  } else if (result.reconciled) {
    console.log('La evidencia ya existía en el ledger: vínculo reconciliado.\n');
  } else {
    console.log('Transacción confirmada en Hyperledger Fabric.\n');
  }
  console.log(`TX_ID:\n${result.txId}\n`);
  if (result.blockNumber) console.log(`Bloque:\n${result.blockNumber}\n`);
  console.log('Referencia blockchain guardada en MySQL (blockchain_evidence).\n');
  console.log('PROCESO COMPLETADO CORRECTAMENTE.');
});
