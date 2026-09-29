/**
 * npm run record -- REG-0001
 * Lee el resultado en MySQL, genera su compromiso HMAC-SHA-256, crea el evento (UUID),
 * lo ancla en Fabric y guarda el TX_ID en evidencia_blockchain.
 */
import { header, requireRecordCode, runCli } from './_cli';
import { traceabilityService } from '@/services/traceability.service';

void runCli(async () => {
  const code = requireRecordCode();
  header('REGISTRO ACADÉMICO');

  const r = await traceabilityService.registerAcademicRecordEvidence(code);

  console.log(`\nRegistro: ${r.record.code}\n`);
  console.log(`Estudiante (token):\n${r.record.studentToken}\n`);
  console.log(`Actividad:\n${r.record.activityCode}  (${r.record.areaCode}, ${r.record.periodCode}, sección ${r.record.section})\n`);
  console.log(`Versión:\n${r.record.version}  (${r.eventType}, estado ${r.record.status})\n`);
  console.log(`Compromiso (HMAC-SHA-256):\n${r.commitment}\n`);
  if (r.previousCommitment) console.log(`Compromiso anterior (v${r.record.version - 1}):\n${r.previousCommitment}\n`);
  console.log(`Evento (UUID):\n${r.eventId}\n`);

  if (r.alreadyRegistered) console.log('Esta versión ya estaba anclada en Hyperledger Fabric (reintento idempotente).\n');
  else if (r.reconciled) console.log('El evento ya existía en el ledger: vínculo reconciliado sin reenviar.\n');
  else console.log('Transacción confirmada en Hyperledger Fabric.\n');

  console.log(`TX_ID:\n${r.txId}\n`);
  if (r.blockNumber) console.log(`Bloque:\n${r.blockNumber}\n`);
  console.log('Referencia guardada en MySQL (evidencia_blockchain, evento CONFIRMADO).\n');
  console.log('PROCESO COMPLETADO CORRECTAMENTE.');
});
