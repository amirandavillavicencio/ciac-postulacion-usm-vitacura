import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";
import type { DisponibilidadBloque } from "@/types/postulacion";

type MatrixCell = {
  key: string;
  day: string;
  block: number;
};

export function buildAvailabilityMatrix(): Record<number, MatrixCell[]> {
  const result: Record<number, MatrixCell[]> = {};

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
