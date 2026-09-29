import 'server-only';
import { BlockchainEvidenceSchema } from '@/schemas/academicRecord.schema';
import type { AcademicEvidence, AcademicLedger, CreateAcademicEvidenceArgs } from '@/types/blockchain';
import { evaluateTransaction } from './evaluateTransaction';
import { withContract } from './gateway';
import { submitTransaction } from './submitTransaction';

const parseEvidence = (value: unknown) => BlockchainEvidenceSchema.parse(value) as AcademicEvidence;

/** Implementación de AcademicLedger sobre el chaincode academic-traceability. */
export const fabricAcademicLedger: AcademicLedger = {
  evidenceExists: (eventId) =>
    withContract((contract) => evaluateTransaction<boolean>(contract, 'academicEvidenceExists', [eventId])),

  createEvidence: (args: CreateAcademicEvidenceArgs) =>
    withContract(async (contract) => {
      const result = await submitTransaction<unknown>(contract, 'createAcademicEvidence', [
        args.eventId,
        args.objectType,
        args.objectRef,
        args.eventType,
        String(args.version),
        args.commitment,
        args.previousCommitment ?? '',
        args.actorRole,
      ]);
      return { ...result, payload: parseEvidence(result.payload) };
    }),

  readEvidence: (eventId) =>
    withContract(async (contract) =>
      parseEvidence(await evaluateTransaction<unknown>(contract, 'readAcademicEvidence', [eventId])),
    ),

  getEvidenceHistory: (objectType, objectRef) =>
    withContract(async (contract) => {
      const items = await evaluateTransaction<unknown[]>(contract, 'getAcademicEvidenceHistory', [objectType, objectRef]);
      return (items ?? []).map(parseEvidence);
    }),
};
