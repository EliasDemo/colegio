/**
 * npm run verify -- REG-000001
 * Recalcula el HMAC del registro actual en MySQL y lo compara con la evidencia anclada en Fabric.
 */
import { header, requireRecordCode, runCli } from './_cli';
import { traceabilityService } from '@/services/traceability.service';

void runCli(async () => {
  const code = requireRecordCode();
  header('VERIFICACIÓN DE INTEGRIDAD');

  const result = await traceabilityService.verifyAcademicRecord(code);

  console.log(`\nRegistro:\n${result.record.code}  (versión Off-chain ${result.record.version})\n`);
  if (result.onChain) {
    console.log(`Evidence blockchain (versión ${result.onChain.version}, TX ${result.onChain.txId.slice(0, 16)}...):\n${result.onChain.evidence}\n`);
  } else {
    console.log('Evidence blockchain:\n(no existe evidencia anclada)\n');
  }
  console.log(`Evidence calculada:\n${result.computedEvidence}\n`);
  if (result.localCopyConsistent !== null) {
    console.log(`Copia local del vínculo (MySQL) consistente con el ledger: ${result.localCopyConsistent ? 'SÍ' : 'NO'}\n`);
  }
  console.log(`RESULTADO:\n\n${result.status}`);
  if (result.status === 'ALTERADO') process.exitCode = 3;
});
