import 'server-only';
import { BlockchainEvidenceSchema } from '@/schemas/academicRecord.schema';
import type { AcademicEvidence, AcademicLedger, CreateAcademicEvidenceArgs } from '@/types/blockchain';
import { evaluateTransaction } from './evaluateTransaction';
import { withContract } from './gateway';
import { submitTransaction } from './submitTransaction';

const parseEvidence = (value: unknown) => BlockchainEvidenceSchema.parse(value) as AcademicEvidence;

/** Implementación de AcademicLedger sobre el chaincode academic-traceability. */
export const fabricAcademicLedger: AcademicLedger = {
  evidenceExists: (evidenceId) =>
    withContract((contract) => evaluateTransaction<boolean>(contract, 'academicEvidenceExists', [evidenceId])),

  createEvidence: (args: CreateAcademicEvidenceArgs) =>
    withContract(async (contract) => {
      const result = await submitTransaction<unknown>(contract, 'createAcademicEvidence', [
        args.evidenceId,
        args.recordReference,
        args.eventType,
        String(args.version),
        args.evidence,
        args.actorReference,
        args.actorRole,
      ]);
      return { ...result, payload: parseEvidence(result.payload) };
    }),

  readEvidence: (evidenceId) =>
    withContract(async (contract) =>
      parseEvidence(await evaluateTransaction<unknown>(contract, 'readAcademicEvidence', [evidenceId])),
    ),

  getEvidenceHistory: (recordReference) =>
    withContract(async (contract) => {
      const items = await evaluateTransaction<unknown[]>(contract, 'getAcademicEvidenceHistory', [recordReference]);
      return (items ?? []).map(parseEvidence);
    }),
};
