export type TipoPostulacion = "academico" | "administrativo";

export type AreaPostulacion =
  | "matematicas_i"
  | "matematicas_ii"
  | "matematicas_iii"
  | "matematicas_iv"
  | "fisica_i"
  | "fisica_ii"
  | "fisica_120"
  | "quimica"
  | "programacion"
  | "administrativo";

export type DiaSemana = "lunes" | "martes" | "miercoles" | "jueves" | "viernes";

export type DisponibilidadBloque = {
  diaSemana: DiaSemana;
  bloque: number;
};

export type DocumentoRequerido = {
  tipo: "siga" | "cv";
  nombre: string;
  mimeType: string;
  size: number;
  contentBase64: string;
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
  notaAsignatura: number | null;
  experienciaTutorias: boolean;
  experiencia: string;
  motivacion: string;
  disponibilidad: DisponibilidadBloque[];
  documentos: DocumentoRequerido[];
  declaracionAceptada: boolean;
};
