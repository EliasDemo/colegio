import { Prisma } from '@prisma/client';
import type { AcademicRecordInput, ResultadoConRelaciones } from '@/types/academic';

export const TEST_SECRET = 'test-secret-hmac-0123456789abcdef0123456789abcdef';

/** Registro REG-0011 del dataset Hito 2 (tokens reales seudonimizados, sin identidad). */
export function sampleInput(overrides: Partial<AcademicRecordInput> = {}): AcademicRecordInput {
  return {
    objectRef: 'REG-0011',
    studentToken: 'STU-54134667DA103F7B',
    periodCode: '2026-B3',
    gradeNumber: 3,
    sectionCode: 'A',
    areaCode: 'CTA',
    activityCode: 'EV-CTA-301',
    activityType: 'INFORME',
    activityDate: '2026-09-03',
    maxScore: '20.00',
    score: '19.00',
    status: 'VIGENTE',
    registeredBy: 'DOC-EE60960CC95C1748',
    registeredAt: new Date('2026-09-03T00:00:00.000Z'),
    version: 1,
    ...overrides,
  };
}

const d = (iso: string) => new Date(iso);

/** Resultado con relaciones, como lo devuelve AcademicRecordRepository.findByCode. */
export function sampleRecord(overrides: Partial<ResultadoConRelaciones> = {}): ResultadoConRelaciones {
  const base = {
    id: 11n,
    codigo: 'REG-0011',
    matriculaId: 3n,
    actividadId: 3n,
    versionActual: 1,
    puntajeObtenido: new Prisma.Decimal('19'),
    estado: 'VIGENTE',
    registradoPor: 3n,
    registradoEn: d('2026-09-03T00:00:00.000Z'),
    actualizadoEn: d('2026-09-03T00:00:00.000Z'),
    matricula: {
      id: 3n,
      estudianteId: 3n,
      periodoId: 2n,
      seccionId: 1n,
      estado: 'VIGENTE',
      fechaMatricula: d('2026-03-02'),
      estudiante: { id: 3n, tokenEstudiante: 'STU-54134667DA103F7B', estado: 'ACTIVO', creadoEn: d('2026-09-29') },
      periodo: { id: 2n, institucionId: 1n, codigo: '2026-B3', nombre: 'III Bimestre 2026', fechaInicio: d('2026-08-10'), fechaFin: d('2026-10-16'), estado: 'ABIERTO' },
      seccion: { id: 1n, gradoId: 3n, codigo: 'A', nombre: '3.º A', grado: { id: 3n, institucionId: 1n, nivel: 'SECUNDARIA', numero: 3, nombre: '3.º de secundaria' } },
    },
    actividad: {
      id: 3n,
      asignacionId: 3n,
      tipoActividadId: 4,
      codigo: 'EV-CTA-301',
      titulo: 'Informe de laboratorio',
      descripcion: null,
      fechaActividad: d('2026-09-03T00:00:00.000Z'),
      puntajeMaximo: new Prisma.Decimal('20'),
      estado: 'PUBLICADA',
      creadoPor: 3n,
      creadoEn: d('2026-09-29'),
      tipoActividad: { id: 4, codigo: 'INFORME', nombre: 'Informe', descripcion: null },
      asignacion: {
        id: 3n,
        docenteId: 3n,
        areaId: 3n,
        seccionId: 1n,
        periodoId: 2n,
        estado: 'ACTIVA',
        area: { id: 3n, institucionId: 1n, codigo: 'CTA', nombre: 'Ciencia y Tecnología', estado: 'ACTIVO' },
        docente: { id: 3n, tokenDocente: 'DOC-EE60960CC95C1748', estado: 'ACTIVO', creadoEn: d('2026-09-29') },
      },
    },
    registrador: {
      id: 3n,
      username: 'DOC-EE60960CC95C1748',
      passwordHash: 'scrypt$x$y',
      docenteId: 3n,
      estado: 'ACTIVO',
      ultimoAccesoEn: null,
      creadoEn: d('2026-09-29'),
    },
  } as ResultadoConRelaciones;
  return { ...base, ...overrides };
}
