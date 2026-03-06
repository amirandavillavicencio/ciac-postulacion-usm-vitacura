export type TipoPostulacion = "academico" | "administrativo";

export type AreaPostulacion =
  | "matematica"
  | "fisica_1_2"
  | "fisica_120"
  | "programacion"
  | "quimica"
  | "administrativo";

export type DiaSemana = "lunes" | "martes" | "miercoles" | "jueves" | "viernes";

export type DisponibilidadBloque = {
  diaSemana: DiaSemana;
  bloque: string;
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
