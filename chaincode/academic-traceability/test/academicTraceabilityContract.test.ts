import type { Context } from 'fabric-contract-api';
import { AcademicTraceabilityContract } from '../src/academicTraceabilityContract';

/** Stub en memoria con el subconjunto de la API de ChaincodeStub que usa el contrato. */
class MemoryStub {
  readonly state = new Map<string, Buffer>();
  readonly events: Array<{ name: string; payload: string }> = [];
  txId = 'a'.repeat(64);

  async getState(key: string): Promise<Uint8Array> {
    return this.state.get(key) ?? new Uint8Array();
  }
  async putState(key: string, value: Uint8Array): Promise<void> {
    this.state.set(key, Buffer.from(value));
  }
  createCompositeKey(objectType: string, attributes: string[]): string {
    return `\u0000${objectType}\u0000${attributes.map((a) => `${a}\u0000`).join('')}`;
  }
  async getStateByPartialCompositeKey(objectType: string, attributes: string[]) {
    const prefix = this.createCompositeKey(objectType, attributes);
    const entries = [...this.state.entries()].filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b));
    let index = 0;
    return {
      next: async () => (index < entries.length ? { done: false, value: { key: entries[index]![0], value: entries[index++]![1] } } : { done: true, value: undefined }),
      close: async () => undefined,
    };
  }
  getDateTimestamp(): Date {
    return new Date('2026-09-28T15:00:00.000Z');
  }
  getTxID(): string {
    return this.txId;
  }
  setEvent(name: string, payload: Uint8Array): void {
    this.events.push({ name, payload: Buffer.from(payload).toString('utf8') });
  }
}

const HMAC_V1 = '1'.repeat(64);
const HMAC_V2 = '2'.repeat(64);

function setup() {
  const stub = new MemoryStub();
  const ctx = { stub, clientIdentity: { getMSPID: () => 'NuevoHorizonteMSP' } } as unknown as Context;
  return { stub, ctx, contract: new AcademicTraceabilityContract() };
}

const createV1 = (contract: AcademicTraceabilityContract, ctx: Context) =>
  contract.createAcademicEvidence(ctx, 'EVD-REG-000001-V1', 'REG-000001', 'REGISTRO', '1', HMAC_V1, 'ADM-PSE-001', 'ADMINISTRADOR');

describe('AcademicTraceabilityContract', () => {
  it('registra una evidencia y la marca como existente', async () => {
    const { ctx, contract, stub } = setup();
    expect(await contract.academicEvidenceExists(ctx, 'EVD-REG-000001-V1')).toBe(false);

    const created = JSON.parse(await createV1(contract, ctx));

    expect(created).toMatchObject({
      evidenceId: 'EVD-REG-000001-V1',
      recordReference: 'REG-000001',
      version: 1,
      evidence: HMAC_V1,
      submitterMspId: 'NuevoHorizonteMSP',
      timestamp: '2026-09-28T15:00:00.000Z',
      status: 'REGISTRADO',
      txId: stub.txId,
    });
    expect(await contract.academicEvidenceExists(ctx, 'EVD-REG-000001-V1')).toBe(true);
    expect(stub.events[0]?.name).toBe('AcademicEvidenceCreated');
  });

  it('lee la evidencia registrada', async () => {
    const { ctx, contract } = setup();
    await createV1(contract, ctx);
    const read = JSON.parse(await contract.readAcademicEvidence(ctx, 'EVD-REG-000001-V1'));
    expect(read.evidence).toBe(HMAC_V1);
  });

  it('rechaza registrar dos veces la misma evidencia (inmutabilidad)', async () => {
    const { ctx, contract } = setup();
    await createV1(contract, ctx);
    await expect(createV1(contract, ctx)).rejects.toThrow('ya existe');
  });

  it('falla al leer una evidencia inexistente', async () => {
    const { ctx, contract } = setup();
    await expect(contract.readAcademicEvidence(ctx, 'EVD-REG-999999-V1')).rejects.toThrow('No existe evidencia');
  });

  it('rechaza datos que no sean referencias seudónimas', async () => {
    const { ctx, contract } = setup();
    await expect(
      contract.createAcademicEvidence(ctx, 'EVD-REG-000001-V1', 'REG-000001', 'REGISTRO', '1', HMAC_V1, 'Luis Mamani Quispe', 'ADMINISTRADOR'),
    ).rejects.toThrow('actorReference');
    await expect(
      contract.createAcademicEvidence(ctx, 'EVD-REG-000001-V1', 'REG-000001', 'REGISTRO', '1', 'nota=15', 'ADM-PSE-001', 'ADMINISTRADOR'),
    ).rejects.toThrow('evidence');
  });

  it('exige versiones consecutivas y conserva el historial', async () => {
    const { ctx, contract, stub } = setup();
    await expect(
      contract.createAcademicEvidence(ctx, 'EVD-REG-000001-V2', 'REG-000001', 'RECTIFICACION', '2', HMAC_V2, 'DOC-PSE-001', 'DOCENTE'),
    ).rejects.toThrow('No existe la versión 1');

    await createV1(contract, ctx);
    stub.txId = 'b'.repeat(64);
    await contract.createAcademicEvidence(ctx, 'EVD-REG-000001-V2', 'REG-000001', 'RECTIFICACION', '2', HMAC_V2, 'DOC-PSE-001', 'DOCENTE');

    const history = JSON.parse(await contract.getAcademicEvidenceHistory(ctx, 'REG-000001'));
    expect(history.map((h: { version: number; evidence: string }) => [h.version, h.evidence])).toEqual([
      [1, HMAC_V1],
      [2, HMAC_V2],
    ]);
  });

  it('valida la coherencia entre evidenceId, versión y tipo de evento', async () => {
    const { ctx, contract } = setup();
    await expect(
      contract.createAcademicEvidence(ctx, 'EVD-REG-000002-V1', 'REG-000001', 'REGISTRO', '1', HMAC_V1, 'ADM-PSE-001', 'ADMINISTRADOR'),
    ).rejects.toThrow('evidenceId inconsistente');
    await expect(
      contract.createAcademicEvidence(ctx, 'EVD-REG-000001-V1', 'REG-000001', 'RECTIFICACION', '1', HMAC_V1, 'ADM-PSE-001', 'ADMINISTRADOR'),
    ).rejects.toThrow('versión 1 debe ser REGISTRO');
  });

  it('no almacena campos personales en el estado', async () => {
    const { ctx, contract, stub } = setup();
    await createV1(contract, ctx);
    const stored = JSON.parse(stub.state.get('EVD-REG-000001-V1')!.toString('utf8'));
    expect(Object.keys(stored).sort()).toEqual(
      ['actorReference', 'actorRole', 'algorithm', 'docType', 'eventType', 'evidence', 'evidenceId', 'recordReference', 'status', 'submitterMspId', 'timestamp', 'txId', 'version'].sort(),
    );
  });
});
