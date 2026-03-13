"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";
import { buildScheduleWithOptions } from "@/lib/scheduling/buildSchedule";

type PostulacionAdmin = {
  id: number;
  tipoPostulacion: "academico" | "administrativo" | string;
  postulante: {
    nombreCompleto: string;
    rut: string;
    carrera: string;
    genero?: string | null;
  } | null;
  areas: { area: string }[];
  disponibilidad: { diaSemana: string; bloque: string }[];
};

export default function PlanificadorPage() {
  const [postulaciones, setPostulaciones] = useState<PostulacionAdmin[]>([]);
  const [equidadGenero, setEquidadGenero] = useState(true);
  const [equidadCarreras, setEquidadCarreras] = useState(true);
  const [maxBloquesDia, setMaxBloquesDia] = useState<number>(6);
  const [maxHorasTutor, setMaxHorasTutor] = useState<number>(4);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  useEffect(() => {
    async function fetchPostulaciones() {
      const response = await fetch("/api/admin/postulaciones", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { data: PostulacionAdmin[] };
      setPostulaciones(data.data);
    }

    fetchPostulaciones();
  }, []);

  const schedule = useMemo(() => {
    const candidates = postulaciones
      .filter((item) => item.postulante)
      .map((item) => ({
        id: item.id,
        nombreCompleto: item.postulante?.nombreCompleto ?? "-",
        rut: item.postulante?.rut ?? "-",
        carrera: item.postulante?.carrera ?? null,
        genero: item.postulante?.genero ?? null,
        tipoPostulacion: item.tipoPostulacion,
        area: item.areas[0]?.area ?? null,
        disponibilidad: item.disponibilidad
      }));

    return buildScheduleWithOptions(candidates, {
      enforceGenderEquity: equidadGenero,
      enforceCareerEquity: equidadCarreras,
      maxBlocksPerDay: maxBloquesDia,
      maxHoursPerTutor: maxHorasTutor,
      shuffle: shuffleSeed > 0
    });
  }, [equidadCarreras, equidadGenero, maxBloquesDia, maxHorasTutor, postulaciones, shuffleSeed]);

  return (
    <main className="bg-slate-50 py-8">
      <div className="container-page space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ciac-navy">Planificador de bloques</h1>
              <p className="mt-1 text-sm text-slate-600">
                Configura filtros de equidad y límites de carga para generar una propuesta ordenada.
              </p>
            </div>
            <Link
              href="/admin/postulantes"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Volver a gestión
            </Link>
          </div>

          <div className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={equidadGenero} onChange={(e) => setEquidadGenero(e.target.checked)} />
              Equidad de género
            </label>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={equidadCarreras} onChange={(e) => setEquidadCarreras(e.target.checked)} />
              Equidad de carreras
            </label>

            <label className="text-sm font-medium text-slate-700">
              Máx. bloques por día
              <input
                type="number"
                min={1}
                max={8}
                value={maxBloquesDia}
                onChange={(e) => setMaxBloquesDia(Number(e.target.value) || 1)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Máx. horas por tutor
              <input
                type="number"
                min={1}
                max={40}
                value={maxHorasTutor}
                onChange={(e) => setMaxHorasTutor(Number(e.target.value) || 1)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShuffleSeed((current) => current + 1)}
              className="rounded-lg bg-ciac-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Shuffle (aleatorio)
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ciac-navy">Propuesta de horario</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[920px] text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-700">
                  <th className="px-3 py-2">Bloque</th>
                  {DIAS_SEMANA.map((day) => (
                    <th key={`day-${day.value}`} className="px-3 py-2">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BLOQUES.filter((block) => block.value !== "almuerzo").map((block) => (
                  <tr key={`block-${block.value}`} className="border-t border-slate-200 align-top">
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {block.label} <span className="text-slate-500">({block.rango})</span>
                    </td>
                    {DIAS_SEMANA.map((day) => {
                      const slot = schedule.matrix[day.value]?.[block.value];

                      if (!slot || slot.postulantes.length === 0) {
                        return (
                          <td key={`${day.value}-${block.value}`} className="px-3 py-2 text-slate-500">
                            Sin cobertura
                          </td>
                        );
                      }

                      if (slot.postulantes.length === 1) {
                        return (
                          <td key={`${day.value}-${block.value}`} className="px-3 py-2 text-amber-700">
                            <p className="font-medium">{slot.postulantes[0].nombreCompleto}</p>
                            <p className="text-xs">1 postulante disponible</p>
                          </td>
                        );
                      }

                      return (
                        <td key={`${day.value}-${block.value}`} className="px-3 py-2 text-slate-700">
                          <p className="font-medium">{slot.postulantes[0].nombreCompleto}</p>
                          <p className="font-medium">{slot.postulantes[1].nombreCompleto}</p>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
