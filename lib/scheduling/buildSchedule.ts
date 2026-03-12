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

const VALID_DAYS = DIAS_SEMANA.map((day) => day.value);
const VALID_BLOCKS = BLOQUES.filter((block) => block.value !== "almuerzo").map((block) => block.value);

const SCORE_DIFFERENT_CAREER = 50;
const SCORE_GENDER_PARITY = 40;
const SCORE_LOW_LOAD = 20;
const HARD_RULE_PENALTY = -1000;

function normalizeValue(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function compareByName(a: Candidate, b: Candidate) {
  return a.nombreCompleto.localeCompare(b.nombreCompleto, "es-CL");
}

function isAvailable(candidate: Candidate, day: string, block: string) {
  return candidate.disponibilidad.some((slot) => slot.diaSemana === day && slot.bloque === block);
}

function pairScore(
  first: Candidate,
  second: Candidate,
  assignedCountByCandidateId: Record<number, number>,
  generoEnabled: boolean
) {
  if (first.id === second.id) {
    return { score: HARD_RULE_PENALTY, reason: "duplicated-candidate" };
  }

  let score = 0;

  const carreraA = normalizeValue(first.carrera);
  const carreraB = normalizeValue(second.carrera);
  if (carreraA && carreraB && carreraA !== carreraB) {
    score += SCORE_DIFFERENT_CAREER;
  }

  if (generoEnabled) {
    const generoA = normalizeValue(first.genero);
    const generoB = normalizeValue(second.genero);
    if (generoA && generoB && generoA !== generoB) {
      score += SCORE_GENDER_PARITY;
    }
  }

  const loadA = assignedCountByCandidateId[first.id] ?? 0;
  const loadB = assignedCountByCandidateId[second.id] ?? 0;
  score += SCORE_LOW_LOAD - (loadA + loadB) * 5;

  return { score, reason: "ok" };
}

function pickBestPair(
  candidates: Candidate[],
  assignedCountByCandidateId: Record<number, number>,
  generoEnabled: boolean
) {
  let best: { pair: [Candidate, Candidate]; score: number } | null = null;

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const first = candidates[i];
      const second = candidates[j];
      const { score } = pairScore(first, second, assignedCountByCandidateId, generoEnabled);

      if (!best || score > best.score) {
        best = { pair: [first, second], score };
        continue;
      }

      if (score === best.score) {
        const currentLoad = (assignedCountByCandidateId[first.id] ?? 0) + (assignedCountByCandidateId[second.id] ?? 0);
        const bestLoad =
          (assignedCountByCandidateId[best.pair[0].id] ?? 0) +
          (assignedCountByCandidateId[best.pair[1].id] ?? 0);

        if (currentLoad < bestLoad) {
          best = { pair: [first, second], score };
          continue;
        }

        if (currentLoad === bestLoad) {
          const currentNames = `${first.nombreCompleto} ${second.nombreCompleto}`;
          const bestNames = `${best.pair[0].nombreCompleto} ${best.pair[1].nombreCompleto}`;
          if (currentNames.localeCompare(bestNames, "es-CL") < 0) {
            best = { pair: [first, second], score };
          }
        }
      }
    }
  }

  return best;
}

export function buildSchedule(candidatesInput: Candidate[]): ScheduleResult {
  const candidates = candidatesInput
    .filter((candidate) => candidate.tipoPostulacion !== "administrativo")
    .sort(compareByName);

  const assignedCountByCandidateId: Record<number, number> = {};
  const assignedByDay = new Map<string, Set<number>>();
  const matrix: ScheduleResult["matrix"] = {};

  const generoEnabled = candidates.some((candidate) => Boolean(normalizeValue(candidate.genero)));

  for (const day of VALID_DAYS) {
    matrix[day] = {};
    assignedByDay.set(day, new Set<number>());

    for (const block of VALID_BLOCKS) {
      const alreadyAssignedToday = assignedByDay.get(day) ?? new Set<number>();
      const availableCandidates = candidates.filter(
        (candidate) => !alreadyAssignedToday.has(candidate.id) && isAvailable(candidate, day, block)
      );

      if (availableCandidates.length === 0) {
        matrix[day][block] = { postulantes: [], score: HARD_RULE_PENALTY, reason: "Sin cobertura" };
        continue;
      }

      if (availableCandidates.length === 1) {
        const onlyCandidate = availableCandidates[0];
        matrix[day][block] = {
          postulantes: [onlyCandidate],
          score: 0,
          reason: "1 postulante disponible"
        };

        alreadyAssignedToday.add(onlyCandidate.id);
        assignedCountByCandidateId[onlyCandidate.id] = (assignedCountByCandidateId[onlyCandidate.id] ?? 0) + 1;
        continue;
      }

      const best = pickBestPair(availableCandidates, assignedCountByCandidateId, generoEnabled);

      if (!best) {
        matrix[day][block] = { postulantes: [], score: HARD_RULE_PENALTY, reason: "Sin cobertura" };
        continue;
      }

      matrix[day][block] = {
        postulantes: best.pair,
        score: best.score,
        reason: "2 postulantes asignados"
      };

      for (const candidate of best.pair) {
        alreadyAssignedToday.add(candidate.id);
        assignedCountByCandidateId[candidate.id] = (assignedCountByCandidateId[candidate.id] ?? 0) + 1;
      }
    }
  }

  return { matrix, assignedCountByCandidateId, generoEnabled };
}

function escapeCsvCell(cell: string) {
  return `"${cell.replaceAll('"', '""')}"`;
}

export function buildScheduleCsv(result: ScheduleResult) {
  const rows: string[] = [];
  rows.push(["Bloque", ...DIAS_SEMANA.map((day) => day.label)].map(escapeCsvCell).join(","));

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

    rows.push(row.map(escapeCsvCell).join(","));
  }

  return rows.join("\n");
}
