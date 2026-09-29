/**
 * Prueba de integración REAL: MySQL + Hyperledger Fabric.
 * Requiere la infraestructura levantada y se ejecuta solo con: npm run test:integration
 */
import 'dotenv/config';

const enabled = process.env.RUN_INTEGRATION === '1';
const describeIntegration = enabled ? describe : describe.skip;

describeIntegration('Integración On-chain / Off-chain (infraestructura real)', () => {
  // Importación diferida: sin RUN_INTEGRATION no se instancia Prisma ni Fabric.
  let service: typeof import('@/services/traceability.service').traceabilityService;
  let prisma: typeof import('@/lib/db/prisma').prisma;
  const code = 'REG-000020';

  beforeAll(async () => {
    ({ traceabilityService: service } = await import('@/services/traceability.service'));
    ({ prisma } = await import('@/lib/db/prisma'));
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('registra (o reutiliza) la evidencia y guarda el TX_ID en MySQL', async () => {
    const result = await service.registerAcademicRecordEvidence(code);
    expect(result.txId).toMatch(/^[0-9a-f]{64}$/);

    const row = await prisma.blockchainEvidence.findUnique({ where: { evidenceId: result.evidenceId } });
    expect(row).toMatchObject({ status: 'CONFIRMADO', txId: result.txId, evidenceHash: result.evidence });
  });

  it('verifica el registro como INTEGRO contra el ledger', async () => {
    const result = await service.verifyAcademicRecord(code);
    expect(result.status).toBe('INTEGRO');
    expect(result.onChain?.recordReference).toBe(code);
    expect(result.localCopyConsistent).toBe(true);
  });

  it('el ledger no contiene datos personales', async () => {
    const report = await service.getTraceability(code);
    const onChain = JSON.stringify(report.onChain);
    const identity = await prisma.studentIdentity.findFirst({ where: { student: { pseudonymCode: report.record.studentReference } } });
    expect(onChain).not.toContain(identity!.firstNames);
    expect(onChain).not.toContain(identity!.lastNames);
    expect(onChain).not.toContain(identity!.documentNumber);
  });
});
