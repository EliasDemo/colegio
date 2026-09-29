/**
 * npm run verify -- REG-0001
 * Recalcula el HMAC de la versión vigente en MySQL y lo compara con la última versión anclada en Fabric.
 * El resultado queda registrado como evento VERIFICACION. Código de salida 3 si ALTERADO.
 */
import { header, requireRecordCode, runCli } from './_cli';
import { traceabilityService } from '@/services/traceability.service';

const yesNo = (value: boolean | null) => (value === null ? '(no aplica)' : value ? 'SÍ' : 'NO');

void runCli(async () => {
  const code = requireRecordCode();
  header('VERIFICACIÓN DE INTEGRIDAD');

  const v = await traceabilityService.verifyAcademicRecord(code);

  console.log(`\nRegistro:\n${v.record.code}  (versión Off-chain ${v.record.version}, estado ${v.record.status})\n`);
  if (v.onChain) {
    console.log(`Compromiso en blockchain (v${v.onChain.version} ${v.onChain.eventType}, TX ${v.onChain.txId.slice(0, 16)}...):\n${v.onChain.commitment}\n`);
  } else {
    console.log('Compromiso en blockchain:\n(no existe evidencia anclada)\n');
  }
  console.log(`Compromiso calculado:\n${v.computedCommitment}\n`);
  console.log(`Cadena de compromisos entre versiones íntegra: ${yesNo(v.chainIntact)}`);
  console.log(`Copia local del vínculo (MySQL) consistente con el ledger: ${yesNo(v.localCopyConsistent)}`);
  if (v.verificationTxId) console.log(`Verificación registrada On-chain: evento ${v.verificationEventId} · TX ${v.verificationTxId.slice(0, 16)}...`);
  console.log(`\nRESULTADO:\n\n${v.status}`);
  if (v.status === 'ALTERADO') process.exitCode = 3;
});
