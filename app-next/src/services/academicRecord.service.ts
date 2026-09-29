import 'server-only';
import { academicRecordRepository, type AcademicRecordRepository } from '@/repositories/academicRecord.repository';
import { RecordCodeSchema } from '@/schemas/academicRecord.schema';
import type { AcademicRecordInput, AcademicRecordSummary, ResultadoConRelaciones } from '@/types/academic';
import { RecordNotFoundError } from './errors';

/** Proyección del resultado Off-chain al payload canónico (solo tokens seudónimos). */
export function toAcademicRecordInput(r: ResultadoConRelaciones): AcademicRecordInput {
  return {
    objectRef: r.codigo,
    studentToken: r.matricula.estudiante.tokenEstudiante,
    periodCode: r.matricula.periodo.codigo,
    gradeNumber: r.matricula.seccion.grado.numero,
    sectionCode: r.matricula.seccion.codigo,
    areaCode: r.actividad.asignacion.area.codigo,
    activityCode: r.actividad.codigo,
    activityType: r.actividad.tipoActividad.codigo,
    activityDate: r.actividad.fechaActividad,
    maxScore: r.actividad.puntajeMaximo.toFixed(2),
    score: r.puntajeObtenido === null ? null : r.puntajeObtenido.toFixed(2),
    status: r.estado,
    registeredBy: r.registrador.username,
    registeredAt: r.registradoEn,
    version: r.versionActual,
  };
}

export function toAcademicRecordSummary(r: ResultadoConRelaciones): AcademicRecordSummary {
  return {
    code: r.codigo,
    studentToken: r.matricula.estudiante.tokenEstudiante,
    activityCode: r.actividad.codigo,
    areaCode: r.actividad.asignacion.area.codigo,
    periodCode: r.matricula.periodo.codigo,
    section: `${r.matricula.seccion.grado.numero}${r.matricula.seccion.codigo}`,
    status: r.estado,
    version: r.versionActual,
  };
}

export function createAcademicRecordService(repository: AcademicRecordRepository) {
  return {
    async getByCode(code: string): Promise<ResultadoConRelaciones> {
      const codigo = RecordCodeSchema.parse(code);
      const record = await repository.findByCode(codigo);
      if (!record) throw new RecordNotFoundError(codigo);
      return record;
    },
  };
}

export type AcademicRecordService = ReturnType<typeof createAcademicRecordService>;

export const academicRecordService = createAcademicRecordService(academicRecordRepository);
