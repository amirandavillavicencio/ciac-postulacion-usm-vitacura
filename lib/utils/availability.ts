import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";
import type { DisponibilidadBloque } from "@/types/postulacion";

type BloqueValue = (typeof BLOQUES)[number]["value"];

type MatrixCell = {
  key: string;
  day: string;
  block: string;
};

const legacyBlockMap: Record<string, BloqueValue> = {
  "1": "1-2",
  "2": "1-2",
  "3": "3-4",
  "4": "3-4",
  "5": "5-6",
  "6": "5-6",
  "7": "7-8",
  "8": "7-8",
  "9": "9-10",
  "10": "9-10",
  "11": "11-12",
  "12": "11-12",
  "13": "13-14",
  "14": "13-14"
};

const blockOrder = new Map<BloqueValue, number>(BLOQUES.map((bloque, index) => [bloque.value, index]));

export function normalizeBloqueValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const parsed = String(value).trim();
  if (!parsed) return null;

  if (BLOQUES.some((bloque) => bloque.value === parsed)) return parsed;
  return legacyBlockMap[parsed] ?? null;
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
      block: bloque.value
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
          bloque: cell.block
        });
      }
    }
  }

  return selected;
}
