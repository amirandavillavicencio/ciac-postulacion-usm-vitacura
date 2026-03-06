import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";
import type { PostulacionPayload } from "@/types/postulacion";

type ValidationResult =
  | { success: true; data: PostulacionPayload }
  | { success: false; error: string };

const validDias = new Set(DIAS_SEMANA.map((dia) => dia.value));
const validBloques: Set<number> = new Set(BLOQUES.map((bloque) => bloque.value));
const validTipos = new Set(["academico", "administrativo"]);
const validAreas = new Set([
  "matematicas_i",
  "matematicas_ii",
  "matematicas_iii",
  "matematicas_iv",
  "fisica_i",
  "fisica_ii",
  "fisica_120",
  "quimica",
  "programacion",
  "administrativo"
]);

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validatePostulacionPayload(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return { success: false, error: "Payload inválido." };
  }

  const raw = payload as Record<string, unknown>;

  const data: PostulacionPayload = {
    nombreCompleto: toString(raw.nombreCompleto),
    rut: toString(raw.rut),
    correo: toString(raw.correo),
    telefono: toString(raw.telefono),
    carrera: toString(raw.carrera),
    semestre: toNumber(raw.semestre) ?? 0,
    tipoPostulacion: toString(raw.tipoPostulacion) as PostulacionPayload["tipoPostulacion"],
    area: toString(raw.area) as PostulacionPayload["area"],
    notaAsignatura: raw.notaAsignatura === null ? null : toNumber(raw.notaAsignatura),
    experienciaTutorias: Boolean(raw.experienciaTutorias),
    experiencia: toString(raw.experiencia),
    motivacion: toString(raw.motivacion),
    disponibilidad: Array.isArray(raw.disponibilidad)
      ? raw.disponibilidad
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const value = item as Record<string, unknown>;
            return {
              diaSemana: toString(value.diaSemana),
              bloque: toNumber(value.bloque)
            };
          })
          .filter((item): item is { diaSemana: string; bloque: number } =>
            Boolean(item && item.bloque !== null)
          )
          .map((item) => ({
            diaSemana: item.diaSemana as PostulacionPayload["disponibilidad"][number]["diaSemana"],
            bloque: item.bloque
          }))
      : [],
    documentos: Array.isArray(raw.documentos)
      ? raw.documentos
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const value = item as Record<string, unknown>;
            return {
              tipo: toString(value.tipo),
              nombre: toString(value.nombre),
              mimeType: toString(value.mimeType),
              size: toNumber(value.size) ?? 0,
              contentBase64: toString(value.contentBase64)
            };
          })
          .filter(
            (item): item is PostulacionPayload["documentos"][number] =>
              Boolean(item && item.tipo && item.nombre && item.contentBase64)
          )
      : [],
    declaracionAceptada: Boolean(raw.declaracionAceptada)
  };

  if (!data.nombreCompleto || !data.rut || !data.correo || !data.telefono || !data.carrera || !data.motivacion) {
    return { success: false, error: "Faltan campos requeridos de datos personales o motivación." };
  }

  if (!validTipos.has(data.tipoPostulacion)) {
    return { success: false, error: "Tipo de postulación inválido." };
  }

  if (!validAreas.has(data.area)) {
    return { success: false, error: "Asignatura/área de postulación inválida." };
  }

  if (data.semestre < 1 || data.semestre > 12) {
    return { success: false, error: "Semestre debe estar entre 1 y 12." };
  }

  if (data.tipoPostulacion === "academico" && (data.notaAsignatura === null || data.notaAsignatura < 1 || data.notaAsignatura > 7)) {
    return { success: false, error: "La nota de asignatura para tutor académico debe estar entre 1.0 y 7.0." };
  }

  if (!data.declaracionAceptada) {
    return { success: false, error: "Debes aceptar la declaración para enviar la postulación." };
  }

  if (data.documentos.length < 2) {
    return { success: false, error: "Debes adjuntar documentos obligatorios." };
  }

  if (data.disponibilidad.length === 0) {
    return { success: false, error: "Debes seleccionar al menos un bloque de disponibilidad." };
  }

  const disponibilidadValida = data.disponibilidad.every(
    (item) => validDias.has(item.diaSemana) && validBloques.has(item.bloque)
  );

  if (!disponibilidadValida) {
    return { success: false, error: "Disponibilidad inválida." };
  }

  return { success: true, data };
}
