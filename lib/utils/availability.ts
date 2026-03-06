import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";

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
