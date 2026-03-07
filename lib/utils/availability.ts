import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";
import type { BloqueDisponibilidad, DiaSemana, DisponibilidadBloque } from "@/types/postulacion";

type BloqueValue = (typeof BLOQUES)[number]["value"] & BloqueDisponibilidad;

type MatrixCell = {
  key: string;
  day: string;
  block: BloqueDisponibilidad;
};

const canonicalDays = new Set<DiaSemana>(DIAS_SEMANA.map((dia) => dia.value));

const legacyDayMap: Record<string, DiaSemana> = {
  lunes: "lunes",
  martes: "martes",
  miercoles: "miercoles",
  "miércoles": "miercoles",
  jueves: "jueves",
  viernes: "viernes"
};

const legacyNumericDayMap: Record<string, DiaSemana> = {
  "1": "lunes",
  "2": "martes",
  "3": "miercoles",
  "4": "jueves",
  "5": "viernes"
};

const legacyBlockMap: Record<string, BloqueValue> = {
  ALMUERZO: "almuerzo",
  Almuerzo: "almuerzo",
  almuerzo: "almuerzo",
  "0": "almuerzo",
  "1": "1-2",
  "2": "3-4",
  "3": "5-6",
  "4": "7-8",
  "5": "almuerzo",
  "6": "9-10",
  "7": "11-12",
  "8": "13-14",
  "9": "9-10",
  "10": "9-10",
  "11": "11-12",
  "12": "11-12",
  "13": "13-14",
  "14": "13-14"
};

const blockOrder = new Map<BloqueValue, number>(BLOQUES.map((bloque, index) => [bloque.value, index]));

export function normalizeBloqueValue(value: unknown): BloqueDisponibilidad | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const parsed = String(value).trim();
  const normalized = parsed.toLowerCase();
  if (!parsed) return null;

  if (BLOQUES.some((bloque) => bloque.value === parsed)) return parsed as BloqueDisponibilidad;
  if (normalized === "almuerzo") return "almuerzo";
  return legacyBlockMap[parsed] ?? legacyBlockMap[normalized] ?? null;
}

export function normalizeDiaSemanaValue(value: unknown): DiaSemana | null {
  if (typeof value === "number") {
    return legacyNumericDayMap[String(value)] ?? null;
  }

  if (typeof value !== "string") return null;

  const parsed = value.trim();
  if (!parsed) return null;

  if (legacyNumericDayMap[parsed]) {
    return legacyNumericDayMap[parsed];
  }

  if (canonicalDays.has(parsed as DiaSemana)) {
    return parsed as DiaSemana;
  }

  return legacyDayMap[parsed.toLowerCase()] ?? null;
}

export function sortBloques(a: string, b: string) {
  const first = blockOrder.get(normalizeBloqueValue(a) as BloqueValue) ?? Number.MAX_SAFE_INTEGER;
  const second = blockOrder.get(normalizeBloqueValue(b) as BloqueValue) ?? Number.MAX_SAFE_INTEGER;
  return first - second;
}

export function buildAvailabilityMatrix(): Record<string, MatrixCell[]> {
  const result: Record<string, MatrixCell[]> = {};

  for (const bloque of BLOQUES) {
    result[bloque.value] = DIAS_SEMANA.map((dia) => ({
      key: `disp_${dia.value}_${bloque.value}`,
      day: dia.value,
      block: bloque.value as BloqueDisponibilidad
    }));
  }

  return result;
}

export function getSelectedAvailabilityFromForm(formData: FormData): DisponibilidadBloque[] {
  const matrix = buildAvailabilityMatrix();
  const selected: DisponibilidadBloque[] = [];

  for (const bloque of BLOQUES) {
    for (const cell of matrix[bloque.value]) {
      if (formData.get(cell.key)) {
        selected.push({
          diaSemana: cell.day as DisponibilidadBloque["diaSemana"],
          bloque: cell.block as BloqueDisponibilidad
        });
      }
    }
  }

  return selected;
}
