import type {
  ActividadAcademica,
  AreaCurricular,
  AsignacionDocente,
  Docente,
  Estudiante,
  Grado,
  Matricula,
  PeriodoAcademico,
  ResultadoAcademico,
  Seccion,
  TipoActividad,
  Usuario,
} from '@prisma/client';

/** Resultado académico con las relaciones necesarias para construir su forma canónica. */
export type ResultadoConRelaciones = ResultadoAcademico & {
  matricula: Matricula & {
    estudiante: Estudiante;
    periodo: PeriodoAcademico;
    seccion: Seccion & { grado: Grado };
  };
  actividad: ActividadAcademica & {
    tipoActividad: TipoActividad;
    asignacion: AsignacionDocente & { area: AreaCurricular; docente: Docente };
  };
  registrador: Usuario;
};

/**
 * Entrada de la canonicalización (payload canónico del Hito 2, actividad 11).
 * Solo tokens seudónimos y datos académicos del registro; nunca identidad real.
 */
export interface AcademicRecordInput {
  objectRef: string;
  studentToken: string;
  periodCode: string;
  gradeNumber: number;
  sectionCode: string;
  areaCode: string;
  activityCode: string;
  activityType: string;
  activityDate: Date | string;
  maxScore: string | number;
  score: string | number | null;
  status: string;
  registeredBy: string;
  registeredAt: Date | string;
  version: number;
}

/** Vista resumida (sin datos personales) que devuelven los servicios. */
export interface AcademicRecordSummary {
  code: string;
  studentToken: string;
  activityCode: string;
  areaCode: string;
  periodCode: string;
  section: string;
  status: string;
  version: number;
}

/** Actor Off-chain de una operación (usuario del prototipo y su rol). */
export interface Actor {
  usuarioId: bigint;
  username: string;
  role: string;
}
