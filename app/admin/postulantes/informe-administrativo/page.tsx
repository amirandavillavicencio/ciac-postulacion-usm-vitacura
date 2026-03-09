import Link from "next/link";

import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CoberturaTable = Record<string, Record<string, number>>;

function normalizeDiaSemana(value: unknown): string | null {
  const raw = String(value ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    lunes: "lunes",
    martes: "martes",
    miercoles: "miercoles",
    "miércoles": "miercoles",
    jueves: "jueves",
    viernes: "viernes",
    "1": "lunes",
    "2": "martes",
    "3": "miercoles",
    "4": "jueves",
    "5": "viernes"
  };

  return map[raw] ?? null;
}

function normalizeBloque(value: unknown): string | null {
  const raw = String(value ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    "1": "1-2",
    "2": "3-4",
    "3": "5-6",
    "4": "7-8",
    "5": "9-10",
    "6": "11-12",
    "7": "13-14",
    "8": "almuerzo",
    "1-2": "1-2",
    "3-4": "3-4",
    "5-6": "5-6",
    "7-8": "7-8",
    "9-10": "9-10",
    "11-12": "11-12",
    "13-14": "13-14",
    almuerzo: "almuerzo"
  };

  return map[raw] ?? null;
}

function isDisponible(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "t" || normalized === "1";
}

function isExcludedName(nombre: string) {
  const normalized = nombre.trim().toLowerCase();
  if (normalized.includes("test")) return true;
  return normalized === "andrés miranda" || normalized === "andres miranda";
}

async function getAdminCoverageData() {
  const supabase = getSupabaseServerClient({ useServiceRole: true });

  const { data: postulaciones, error: postulacionesError } = await supabase
    .from("postulaciones")
    .select("id,postulante_id,tipo_postulacion")
    .eq("tipo_postulacion", "administrativo");

  if (postulacionesError) throw new Error(postulacionesError.message);

  const postulacionesAdmin = postulaciones ?? [];
  const postulacionIds = postulacionesAdmin.map((item) => item.id);
  const postulanteIds = [
    ...new Set(postulacionesAdmin.map((item) => item.postulante_id).filter(Boolean))
  ];

  if (postulacionIds.length === 0 || postulanteIds.length === 0) {
    return { cobertura: null as CoberturaTable | null, administradoresConsiderados: 0 };
  }

  const [{ data: postulantes, error: postulantesError }, { data: disponibilidad, error: disponibilidadError }] =
    await Promise.all([
      supabase
        .from("postulantes")
        .select("id,rut,nombre_completo")
        .in("id", postulanteIds),
      supabase
        .from("disponibilidad_bloques")
        .select("postulacion_id,dia_semana,bloque,disponible")
        .in("postulacion_id", postulacionIds)
    ]);

  if (postulantesError || disponibilidadError) {
    throw new Error(postulantesError?.message ?? disponibilidadError?.message ?? "No fue posible generar el informe");
  }

  const postulacionToPostulante = new Map(postulacionesAdmin.map((item) => [String(item.id), String(item.postulante_id)]));
  const postulantesValidos = new Map<string, { rut: string; nombre: string }>();

  for (const postulante of postulantes ?? []) {
    const nombre = String(postulante.nombre_completo ?? "").trim();
    if (!nombre || isExcludedName(nombre)) continue;

    const rut = String(postulante.rut ?? "").trim() || `sin-rut-${postulante.id}`;
    postulantesValidos.set(String(postulante.id), { rut, nombre });
  }

  const cobertura: CoberturaTable = Object.fromEntries(
    BLOQUES.map((bloque) => [
      bloque.value,
      Object.fromEntries(DIAS_SEMANA.map((dia) => [dia.value, 0]))
    ])
  );

  const dedupe = new Set<string>();

  for (const entry of disponibilidad ?? []) {
    if (!isDisponible(entry.disponible)) continue;

    const dia = normalizeDiaSemana(entry.dia_semana);
    const bloque = normalizeBloque(entry.bloque);
    if (!dia || !bloque || !cobertura[bloque] || !(dia in cobertura[bloque])) continue;

    const postulanteId = postulacionToPostulante.get(String(entry.postulacion_id));
    if (!postulanteId) continue;

    const postulante = postulantesValidos.get(postulanteId);
    if (!postulante) continue;

    const key = `${postulante.rut}:${dia}:${bloque}`;
    if (dedupe.has(key)) continue;

    dedupe.add(key);
    cobertura[bloque][dia] += 1;
  }

  return { cobertura, administradoresConsiderados: postulantesValidos.size };
}

export default async function InformeAdministrativoPage() {
  const generatedAt = new Date().toLocaleString("es-CL", {
    dateStyle: "full",
    timeStyle: "short"
  });

  const { cobertura, administradoresConsiderados } = await getAdminCoverageData();

  return (
    <main className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0 md:py-12">
      <div className="mx-auto w-full max-w-5xl px-4 print:max-w-none print:px-0 sm:px-6 lg:px-8">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-none print:p-0 print:shadow-none md:p-10">
          <header className="border-b border-slate-200 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ciac-blue">Informe ejecutivo</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-ciac-navy">Informe de cobertura administrativa</h1>
                <p className="mt-2 text-base text-slate-600">CIAC USM Vitacura</p>
              </div>
              <Link href="/admin/postulantes" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                Volver a postulantes
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">Fecha de generación: {generatedAt}</p>
          </header>

          <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 md:p-6">
            <h2 className="text-lg font-semibold text-ciac-navy">Resumen ejecutivo</h2>
            <p className="mt-3 leading-7 text-slate-700">
              A partir de las disponibilidades registradas por los postulantes a apoyo administrativo, se realizó un
              análisis de cobertura por día y bloque horario. La información muestra que existe una buena concentración
              de disponibilidad en algunos horarios centrales de la semana, pero también se observan bloques con menor
              cobertura, especialmente en ciertos tramos y días específicos. En base a esta distribución, contar con un
              número algo mayor de administradores permite asegurar continuidad operativa, cubrir posibles ausencias o
              cambios de disponibilidad y mantener flexibilidad para redistribuir turnos según las necesidades del
              centro.
            </p>
            <p className="mt-3 text-sm font-medium text-slate-600">
              Postulantes administrativos considerados en el informe: {administradoresConsiderados}
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-ciac-navy">Cobertura por día y bloque</h2>
            <p className="mt-1 text-sm text-slate-600">Conteo de disponibilidad real (disponible = true), excluyendo registros de prueba.</p>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left text-slate-700">
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">Bloque</th>
                    {DIAS_SEMANA.map((dia) => (
                      <th key={dia.value} className="border-b border-slate-200 px-4 py-3 text-center font-semibold">
                        {dia.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BLOQUES.map((bloque, index) => (
                    <tr key={bloque.value} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <td className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">
                        {bloque.label} <span className="text-xs text-slate-500">({bloque.rango})</span>
                      </td>
                      {DIAS_SEMANA.map((dia) => (
                        <td key={`${bloque.value}-${dia.value}`} className="border-b border-slate-200 px-4 py-3 text-center font-semibold text-slate-700">
                          {cobertura?.[bloque.value]?.[dia.value] ?? 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 md:p-6">
            <h2 className="text-lg font-semibold text-ciac-navy">Interpretación</h2>
            <p className="mt-3 leading-7 text-slate-700">
              La disponibilidad observada no es homogénea: existen bloques con mayor concentración de postulantes y
              otros con cobertura más acotada. Por ello, seleccionar un número algo mayor al mínimo operativo permite
              sostener continuidad de atención, facilitar reemplazos ante ausencias y conservar flexibilidad para
              reasignar turnos según la demanda semanal del centro.
            </p>
          </section>
        </article>
      </div>

      <style>{`
        @media print {
          @page { margin: 16mm; }
          body { background: white; }
        }
      `}</style>
    </main>
  );
}
