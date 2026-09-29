import { toFabricError } from '@/lib/fabric/errors';

/** Mensajes reales observados durante las pruebas de fallo contra Fabric 2.5 (ver evidencias/). */
const CASES: Array<[string, string]> = [
  ['14 UNAVAILABLE: No connection established. Last error: Error: connect ECONNREFUSED 127.0.0.1:7051.', 'PEER_UNAVAILABLE'],
  ['14 UNAVAILABLE: no orderers could successfully process transaction', 'ORDERER_UNAVAILABLE'],
  ['10 ABORTED: failed to collect enough transaction endorsements, see attached details for more info | AcademicValidatorMSP@peer0.validator.example.com:9051: rpc error: code = Unavailable', 'ENDORSEMENT_FAILED'],
  ['9 FAILED_PRECONDITION: no combination of peers can be derived which satisfy the endorsement policy: no peer combination can satisfy the endorsement policy', 'ENDORSEMENT_FAILED'],
  ['9 FAILED_PRECONDITION: evaluate call to endorser returned error: error validating proposal: access denied: channel [academicchannel] creator org unknown, creator is malformed', 'IDENTITY_INVALID'],
  ['9 FAILED_PRECONDITION: no peers available to evaluate chaincode chaincode-inexistente in channel academicchannel', 'CHAINCODE_NOT_DEPLOYED'],
  ['14 UNAVAILABLE: failed to get config for channel [canalinexistente]: could not get last config for channel canalinexistente', 'CHANNEL_NOT_FOUND'],
  ['10 ABORTED: failed to endorse transaction, see attached details for more info | chaincode response 500, La evidencia EVD-REG-000001-V1 ya existe', 'EVIDENCE_ALREADY_EXISTS'],
  ['chaincode response 500, No existe evidencia EVD-REG-999999-V1', 'EVIDENCE_NOT_FOUND'],
  ['4 DEADLINE_EXCEEDED: Deadline exceeded', 'TIMEOUT'],
  ['algo inesperado', 'UNKNOWN'],
];

describe('toFabricError()', () => {
  it.each(CASES)('clasifica "%s" como %s', (message, code) => {
    const error = toFabricError(new Error(message));
    expect(error.code).toBe(code);
    expect(error.hint.length).toBeGreaterThan(0);
  });

  it('no vuelve a envolver un FabricError', () => {
    const original = toFabricError(new Error('algo inesperado'));
    expect(toFabricError(original)).toBe(original);
  });
});
