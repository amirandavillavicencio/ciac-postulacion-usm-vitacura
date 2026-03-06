import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";
import type { PostulacionPayload } from "@/types/postulacion";

type ValidationResult =
  | { success: true; data: PostulacionPayload }
  | { success: false; error: string };

const validDias = new Set(DIAS_SEMANA.map((dia) => dia.value));
const validBloques: Set<number> = new Set(BLOQUES.map((bloque) => bloque.value));
const validTipos = new Set(["academico", "administrativo", "mixto"]);
const validAreas = new Set([
  "matematica",
  "fisica_1_2",
  "fisica_120",
  "programacion",
  "quimica",
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
    prioridadAcademica: toNumber(raw.prioridadAcademica) ?? 0,
    notaAsignatura: toNumber(raw.notaAsignatura) ?? 0,
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
      : []
  };

  if (!data.nombreCompleto || !data.rut || !data.correo || !data.motivacion) {
    return { success: false, error: "Faltan campos requeridos de datos personales o motivación." };
  }

  if (!validTipos.has(data.tipoPostulacion)) {
    return { success: false, error: "Tipo de postulación inválido." };
  }

  if (!validAreas.has(data.area)) {
    return { success: false, error: "Área de postulación inválida." };
  }

  if (data.semestre < 1) {
    return { success: false, error: "Semestre debe ser mayor o igual a 1." };
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
