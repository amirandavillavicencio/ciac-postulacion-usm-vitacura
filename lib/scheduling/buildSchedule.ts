import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";

export type DisponibilidadSlot = {
  diaSemana: string;
  bloque: string;
};

export type Candidate = {
  id: number;
  nombreCompleto: string;
  rut: string;
  carrera: string | null;
  genero?: string | null;
  tipoPostulacion?: string;
  area?: string | null;
  disponibilidad: DisponibilidadSlot[];
};

export type ScheduledPair = {
  postulantes: [Candidate, Candidate] | [Candidate] | [];
  score: number;
  reason: string;
};

export type ScheduleResult = {
  matrix: Record<string, Record<string, ScheduledPair>>;
  assignedCountByCandidateId: Record<number, number>;
  generoEnabled: boolean;
};

const VALID_DAYS = DIAS_SEMANA.map((d) => d.value);
const VALID_BLOCKS = BLOQUES.filter((b) => b.value !== "almuerzo").map((b) => b.value);

function normalize(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function scorePair(a: Candidate, b: Candidate, assignedCountByCandidateId: Record<number, number>, generoEnabled: boolean) {
  let score = 0;

  if (a.id === b.id) return { score: -1000, reason: "duplicado" };

  if (normalize(a.carrera) && normalize(b.carrera) && normalize(a.carrera) !== normalize(b.carrera)) {
    score += 50;
  }

  if (generoEnabled) {
    const genderA = normalize(a.genero);
    const genderB = normalize(b.genero);
    if (genderA && genderB && genderA !== genderB) {
      score += 40;
    }
  }

  const loadA = assignedCountByCandidateId[a.id] ?? 0;
  const loadB = assignedCountByCandidateId[b.id] ?? 0;
  score += 20 - (loadA + loadB) * 5;

  return { score, reason: "ok" };
}

export function buildSchedule(candidatesInput: Candidate[]): ScheduleResult {
  const candidates = candidatesInput.filter((candidate) => candidate.tipoPostulacion !== "administrativo");
  const matrix: ScheduleResult["matrix"] = {};
  const assignedCountByCandidateId: Record<number, number> = {};
  const assignedByDay = new Map<string, Set<number>>();

  const generoEnabled = candidates.some((candidate) => Boolean(normalize(candidate.genero)));

  for (const day of VALID_DAYS) {
    matrix[day] = {};
    assignedByDay.set(day, new Set<number>());

    for (const block of VALID_BLOCKS) {
      const candidatesInSlot = candidates.filter((candidate) => {
        const dayAssigned = assignedByDay.get(day);
        if (dayAssigned?.has(candidate.id)) return false;

        return candidate.disponibilidad.some((slot) => slot.diaSemana === day && slot.bloque === block);
      });

      if (candidatesInSlot.length === 0) {
        matrix[day][block] = { postulantes: [], score: -1, reason: "Sin cobertura" };
        continue;
      }

      if (candidatesInSlot.length === 1) {
        const uniqueCandidate = candidatesInSlot[0];
        matrix[day][block] = {
          postulantes: [uniqueCandidate],
          score: 0,
          reason: "1 postulante disponible"
        };
        assignedByDay.get(day)?.add(uniqueCandidate.id);
        assignedCountByCandidateId[uniqueCandidate.id] = (assignedCountByCandidateId[uniqueCandidate.id] ?? 0) + 1;
        continue;
      }

      let bestScore = Number.NEGATIVE_INFINITY;
      let bestPair: [Candidate, Candidate] | null = null;

      for (let i = 0; i < candidatesInSlot.length; i += 1) {
        for (let j = i + 1; j < candidatesInSlot.length; j += 1) {
          const first = candidatesInSlot[i];
          const second = candidatesInSlot[j];

          const candidateScore = scorePair(first, second, assignedCountByCandidateId, generoEnabled);
          if (candidateScore.score > bestScore) {
            bestScore = candidateScore.score;
            bestPair = [first, second];
          }
        }
      }

      if (!bestPair) {
        matrix[day][block] = { postulantes: [], score: -1, reason: "Sin cobertura" };
        continue;
      }

      matrix[day][block] = {
        postulantes: bestPair,
        score: bestScore,
        reason: "2 postulantes asignados"
      };

      for (const candidate of bestPair) {
        assignedByDay.get(day)?.add(candidate.id);
        assignedCountByCandidateId[candidate.id] = (assignedCountByCandidateId[candidate.id] ?? 0) + 1;
      }
    }
  }

  return {
    matrix,
    assignedCountByCandidateId,
    generoEnabled
  };
}

export function buildScheduleCsv(result: ScheduleResult) {
  const header = ["Bloque", ...DIAS_SEMANA.map((day) => day.label)];
  const rows = [header.join(",")];

  for (const block of BLOQUES.filter((item) => item.value !== "almuerzo")) {
    const row = [`${block.label} (${block.rango})`];

    for (const day of DIAS_SEMANA) {
      const slot = result.matrix[day.value]?.[block.value];
      if (!slot || slot.postulantes.length === 0) {
        row.push("Sin cobertura");
        continue;
      }

      if (slot.postulantes.length === 1) {
        row.push(`${slot.postulantes[0].nombreCompleto} | 1 postulante disponible`);
        continue;
      }

      row.push(slot.postulantes.map((candidate) => candidate.nombreCompleto).join(" | "));
    }

    rows.push(row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","));
  }

  return rows.join("\n");
}