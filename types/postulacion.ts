export type TipoPostulacion = "academico" | "administrativo";

export type AreaPostulacion =
  | "matematica"
  | "fisica_1_2"
  | "fisica_120"
  | "programacion"
  | "quimica"
  | "administrativo";

export type DiaSemana = "lunes" | "martes" | "miercoles" | "jueves" | "viernes";

export type BloqueDisponibilidad =
  | "1-2"
  | "3-4"
  | "5-6"
  | "7-8"
  | "almuerzo"
  | "9-10"
  | "11-12"
  | "13-14";

export type DisponibilidadBloque = {
  diaSemana: DiaSemana;
  bloque: BloqueDisponibilidad;
};

export type PostulacionPayload = {
  nombreCompleto: string;
  rut: string;
  correo: string;
  telefono: string;
  carrera: string;
  semestre: number;
  tipoPostulacion: TipoPostulacion;
  area: AreaPostulacion;
  notaAsignatura: number;
  experiencia: string;
  motivacion: string;
  disponibilidad: DisponibilidadBloque[];
};
