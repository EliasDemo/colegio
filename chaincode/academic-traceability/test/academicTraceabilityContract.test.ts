import type { Context } from 'fabric-contract-api';
import { AcademicTraceabilityContract } from '../src/academicTraceabilityContract';

/** Stub en memoria con el subconjunto de la API de ChaincodeStub que usa el contrato. */
class MemoryStub {
  readonly state = new Map<string, Buffer>();
  readonly events: Array<{ name: string; payload: string }> = [];
  txId = 'a'.repeat(64);
  now = new Date('2026-09-29T15:00:00.000Z');

  async getState(key: string): Promise<Uint8Array> {
    return this.state.get(key) ?? new Uint8Array();
  }
  async putState(key: string, value: Uint8Array): Promise<void> {
    this.state.set(key, Buffer.from(value));
  }
  createCompositeKey(objectType: string, attributes: string[]): string {
    return `\u0000${objectType}\u0000${attributes.map((a) => `${a}\u0000`).join('')}`;
  }
  splitCompositeKey(key: string) {
    const parts = key.split('\u0000').filter((p) => p.length > 0);
    return { objectType: parts[0]!, attributes: parts.slice(1) };
  }
  async getStateByPartialCompositeKey(objectType: string, attributes: string[]) {
    const prefix = this.createCompositeKey(objectType, attributes);
    const entries = [...this.state.entries()].filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b));
    let index = 0;
    return {
      next: async () =>
        index < entries.length ? { done: false, value: { key: entries[index]![0], value: entries[index++]![1] } } : { done: true, value: undefined },
      close: async () => undefined,
    };
  }
  getDateTimestamp(): Date {
    return this.now;
  }
  getTxID(): string {
    return this.txId;
  }
  setEvent(name: string, payload: Uint8Array): void {
    this.events.push({ name, payload: Buffer.from(payload).toString('utf8') });
  }
}

const C1 = '1'.repeat(64);
const C2 = '2'.repeat(64);
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function setup() {
  const stub = new MemoryStub();
  const ctx = { stub, clientIdentity: { getMSPID: () => 'NuevoHorizonteMSP' } } as unknown as Context;
  return { stub, ctx, contract: new AcademicTraceabilityContract() };
}

const create = (c: AcademicTraceabilityContract, ctx: Context, id: number, type: string, version: string, commitment: string, previous = '') =>
  c.createAcademicEvidence(ctx, ID(id), 'RESULTADO', 'REG-0001', type, version, commitment, previous, 'ADMIN');

describe('AcademicTraceabilityContract (payload del Hito 2)', () => {
  it('registra un evento CREACION con los campos de H2-03', async () => {
    const { ctx, contract, stub } = setup();
    expect(await contract.academicEvidenceExists(ctx, ID(1))).toBe(false);

    const created = JSON.parse(await create(contract, ctx, 1, 'CREACION', '1', C1));

    expect(created).toMatchObject({
      eventId: ID(1),
      objectType: 'RESULTADO',
      objectRef: 'REG-0001',
      eventType: 'CREACION',
      version: 1,
      commitment: C1,
      previousCommitment: null,
      actorRole: 'ADMIN',
      submitterMspId: 'NuevoHorizonteMSP',
      timestamp: '2026-09-29T15:00:00.000Z',
      txId: stub.txId,
    });
    expect(await contract.academicEvidenceExists(ctx, ID(1))).toBe(true);
    expect(stub.events[0]?.name).toBe('AcademicEventRegistered');
  });

  it('es idempotente por eventId: no registra dos veces el mismo evento', async () => {
    const { ctx, contract } = setup();
    await create(contract, ctx, 1, 'CREACION', '1', C1);
    await expect(create(contract, ctx, 1, 'CREACION', '1', C1)).rejects.toThrow('ya existe');
  });

  it('no permite dos eventos para la misma versión del dato', async () => {
    const { ctx, contract } = setup();
    await create(contract, ctx, 1, 'CREACION', '1', C1);
    await expect(create(contract, ctx, 2, 'CREACION', '1', C2)).rejects.toThrow('versión 1');
  });

  it('encadena las rectificaciones con el compromiso anterior', async () => {
    const { ctx, contract, stub } = setup();
    await create(contract, ctx, 1, 'CREACION', '1', C1);
    await expect(create(contract, ctx, 2, 'RECTIFICACION', '2', C2, '9'.repeat(64))).rejects.toThrow('compromiso anterior no coincide');
    await expect(create(contract, ctx, 2, 'RECTIFICACION', '3', C2, C1)).rejects.toThrow('No existe la versión 2');

    stub.txId = 'b'.repeat(64);
    const rect = JSON.parse(await create(contract, ctx, 2, 'RECTIFICACION', '2', C2, C1));
    expect(rect.previousCommitment).toBe(C1);
  });

  it('valida las reglas de CREACION', async () => {
    const { ctx, contract } = setup();
    await expect(create(contract, ctx, 1, 'CREACION', '2', C1)).rejects.toThrow('versión 1');
    await expect(create(contract, ctx, 1, 'CREACION', '1', C1, C2)).rejects.toThrow('no admite compromiso anterior');
    await expect(create(contract, ctx, 1, 'RECTIFICACION', '1', C1)).rejects.toThrow('mayor que 1');
  });

  it('registra verificaciones sin crear versiones y solo sobre objetos anclados', async () => {
    const { ctx, contract, stub } = setup();
    await expect(create(contract, ctx, 9, 'VERIFICACION', '1', C1, C1)).rejects.toThrow('no se puede verificar');
    await create(contract, ctx, 1, 'CREACION', '1', C1);
    stub.now = new Date('2026-09-29T16:00:00.000Z');
    await create(contract, ctx, 9, 'VERIFICACION', '1', C1, C1);
    // La verificación no ocupa la versión 2: la rectificación sigue siendo posible.
    stub.now = new Date('2026-09-29T17:00:00.000Z');
    await create(contract, ctx, 2, 'RECTIFICACION', '2', C2, C1);

    const history = JSON.parse(await contract.getAcademicEvidenceHistory(ctx, 'RESULTADO', 'REG-0001'));
    expect(history.map((e: { eventType: string; version: number }) => `${e.eventType}:v${e.version}`)).toEqual([
      'CREACION:v1',
      'VERIFICACION:v1',
      'RECTIFICACION:v2',
    ]);
  });

  it('lee un evento y falla si no existe', async () => {
    const { ctx, contract } = setup();
    await create(contract, ctx, 1, 'CREACION', '1', C1);
    expect(JSON.parse(await contract.readAcademicEvidence(ctx, ID(1))).commitment).toBe(C1);
    await expect(contract.readAcademicEvidence(ctx, ID(5))).rejects.toThrow('No existe evidencia');
  });

  it('rechaza valores que no sean referencias técnicas (sin PII On-chain)', async () => {
    const { ctx, contract } = setup();
    await expect(contract.createAcademicEvidence(ctx, 'evento-1', 'RESULTADO', 'REG-0001', 'CREACION', '1', C1, '', 'ADMIN')).rejects.toThrow('eventId');
    await expect(contract.createAcademicEvidence(ctx, ID(1), 'RESULTADO', 'Luis Mamani', 'CREACION', '1', C1, '', 'ADMIN')).rejects.toThrow('objectRef');
    await expect(contract.createAcademicEvidence(ctx, ID(1), 'RESULTADO', 'REG-0001', 'CREACION', '1', 'nota=19', '', 'ADMIN')).rejects.toThrow('commitment');
    await expect(contract.createAcademicEvidence(ctx, ID(1), 'ALUMNO', 'REG-0001', 'CREACION', '1', C1, '', 'ADMIN')).rejects.toThrow('Tipo de objeto');
  });

  it('almacena solo los campos del modelo On-chain', async () => {
    const { ctx, contract, stub } = setup();
    await create(contract, ctx, 1, 'CREACION', '1', C1);
    const stored = JSON.parse(stub.state.get(ID(1))!.toString('utf8'));
    expect(Object.keys(stored).sort()).toEqual(
      ['actorRole', 'algorithm', 'commitment', 'docType', 'eventId', 'eventType', 'objectRef', 'objectType', 'previousCommitment', 'status', 'submitterMspId', 'timestamp', 'txId', 'version'].sort(),
    );
  });
});
