/**
 * Prueba de integración REAL: MySQL + Hyperledger Fabric.
 * Requiere la infraestructura levantada y se ejecuta solo con: npm run test:integration
 */
const enabled = process.env.RUN_INTEGRATION === '1';
const describeIntegration = enabled ? describe : describe.skip;

describeIntegration('Integración On-chain / Off-chain (infraestructura real)', () => {
  // Importación diferida: sin RUN_INTEGRATION no se instancia Prisma ni Fabric.
  let service: typeof import('@/services/traceability.service').traceabilityService;
  let prisma: typeof import('@/lib/db/prisma').prisma;
  const code = 'REG-0020';

  beforeAll(async () => {
    ({ traceabilityService: service } = await import('@/services/traceability.service'));
    ({ prisma } = await import('@/lib/db/prisma'));
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('registra (o reutiliza) el evento y guarda el TX_ID en evidencia_blockchain', async () => {
    const result = await service.registerAcademicRecordEvidence(code);
    expect(result.txId).toMatch(/^[0-9a-f]{64}$/);

    const evento = await prisma.eventoTrazabilidad.findUnique({ where: { id: result.eventId }, include: { evidencia: true } });
    expect(evento).toMatchObject({ estadoEvento: 'CONFIRMADO', compromisoHmac: result.commitment });
    expect(evento?.evidencia?.txId).toBe(result.txId);
  });

  it('verifica el registro como INTEGRO contra el ledger', async () => {
    const result = await service.verifyAcademicRecord(code);
    expect(result).toMatchObject({ status: 'INTEGRO', chainIntact: true, localCopyConsistent: true });
    expect(result.onChain?.objectRef).toBe(code);
  });

  it('el ledger no contiene tokens, notas ni datos académicos del registro', async () => {
    const report = await service.getTraceability(code);
    const onChain = JSON.stringify(report.onChain);
    expect(onChain).not.toContain(report.record.studentToken);
    expect(onChain).not.toContain(report.record.activityCode);
    expect(onChain).not.toMatch(/"score"|"nota"|STU-|DOC-/);
  });
});
