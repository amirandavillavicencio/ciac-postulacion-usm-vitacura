"use client";

import { useEffect, useMemo, useState } from "react";

import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";

type AreaInfo = {
  area: string;
  notaAsignatura: number | null;
};

type DisponibilidadInfo = {
  diaSemana: string;
  bloque: number;
};

type DocumentoInfo = {
  tipo: string;
  nombre: string;
  url: string;
};

type PostulacionAdmin = {
  id: number;
  tipoPostulacion: "academico" | "administrativo" | string;
  motivacion: string;
  estado: string;
  createdAt: string;
  postulante: {
    nombreCompleto: string;
    rut: string;
    correo: string;
    telefono: string;
    carrera: string;
    semestre: number;
  } | null;
  areas: AreaInfo[];
  disponibilidad: DisponibilidadInfo[];
  documentos: DocumentoInfo[];
  rankingScore: number;
  rankingAreaLabel: string;
};

const ESTADOS = ["recibida", "en revisión", "aceptada", "rechazada"];
const DIA_ORDEN = DIAS_SEMANA.map((item) => item.value);

function formatTipo(tipo: string) {
  if (tipo === "academico") return "Tutor académico";
  if (tipo === "administrativo") return "Apoyo administrativo";
  return tipo;
}

function formatArea(area: string) {
  const map: Record<string, string> = {
    matematica: "Matemática",
    fisica_1_2: "Física I y II",
    fisica_120: "Física 120",
    programacion: "Programación",
    quimica: "Química",
    administrativo: "Administrativo"
  };

  return map[area] ?? area;
}

function formatDay(day: string) {
  const match = DIAS_SEMANA.find((item) => item.value === day);
  return match?.label ?? day;
}

export default function AdminPostulacionesPage() {
  const [postulaciones, setPostulaciones] = useState<PostulacionAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [carreraFilter, setCarreraFilter] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPostulaciones() {
      const response = await fetch("/api/admin/postulaciones", { cache: "no-store" });
      if (!response.ok) return;

      const data = (await response.json()) as { data: PostulacionAdmin[] };
      setPostulaciones(data.data);
      setSelectedId(data.data[0]?.id ?? null);
    }

    fetchPostulaciones();
  }, []);

  const filtered = useMemo(() => {
    const term = searchFilter.trim().toLowerCase();

    return postulaciones.filter((item) => {
      const tipoOk = tipoFilter ? item.tipoPostulacion === tipoFilter : true;
      const carreraOk = carreraFilter ? item.postulante?.carrera === carreraFilter : true;
      const estadoOk = estadoFilter ? item.estado === estadoFilter : true;
      const nombre = item.postulante?.nombreCompleto?.toLowerCase() ?? "";
      const rut = item.postulante?.rut?.toLowerCase() ?? "";
      const searchOk = term ? nombre.includes(term) || rut.includes(term) : true;

      return tipoOk && carreraOk && estadoOk && searchOk;
    });
  }, [carreraFilter, estadoFilter, postulaciones, searchFilter, tipoFilter]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const carreras = [...new Set(postulaciones.map((item) => item.postulante?.carrera).filter(Boolean))] as string[];

  const kpis = useMemo(() => {
    const total = postulaciones.length;
    const academicos = postulaciones.filter((item) => item.tipoPostulacion === "academico").length;
    const administrativos = postulaciones.filter((item) => item.tipoPostulacion === "administrativo").length;

    return [
      { label: "Total postulantes", value: total },
      { label: "Tutor académico", value: academicos },
      { label: "Apoyo administrativo", value: administrativos }
    ];
  }, [postulaciones]);

  const ranking = useMemo(() => {
    return [...postulaciones]
      .sort((a, b) => {
        if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;

        const nombreA = a.postulante?.nombreCompleto?.trim().toLocaleLowerCase("es-CL") ?? "";
        const nombreB = b.postulante?.nombreCompleto?.trim().toLocaleLowerCase("es-CL") ?? "";

        if (nombreA !== nombreB) return nombreA.localeCompare(nombreB, "es-CL");

        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
      .map((item, index) => ({ ...item, position: index + 1 }));
  }, [postulaciones]);

  const analytics = useMemo(() => {
    const byTipo = {
      academico: postulaciones.filter((item) => item.tipoPostulacion === "academico").length,
      administrativo: postulaciones.filter((item) => item.tipoPostulacion === "administrativo").length
    };

    const byCarrera = postulaciones.reduce<Record<string, number>>((acc, item) => {
      const carrera = item.postulante?.carrera ?? "Sin carrera";
      acc[carrera] = (acc[carrera] ?? 0) + 1;
      return acc;
    }, {});

    const byArea = postulaciones.reduce<Record<string, number>>((acc, item) => {
      for (const area of item.areas) {
        acc[formatArea(area.area)] = (acc[formatArea(area.area)] ?? 0) + 1;
      }
      return acc;
    }, {});

    const byEstado = ESTADOS.reduce<Record<string, number>>((acc, estado) => {
      acc[estado] = postulaciones.filter((item) => item.estado === estado).length;
      return acc;
    }, {});

    const bySemestre = postulaciones.reduce<Record<string, number>>((acc, item) => {
      const semestre = String(item.postulante?.semestre ?? "Sin dato");
      acc[semestre] = (acc[semestre] ?? 0) + 1;
      return acc;
    }, {});

    const disponibilidadPorDia = postulaciones.reduce<Record<string, number>>((acc, item) => {
      const uniqueDays = new Set(item.disponibilidad.map((disp) => disp.diaSemana));
      for (const day of uniqueDays) {
        const label = formatDay(day);
        acc[label] = (acc[label] ?? 0) + 1;
      }
      return acc;
    }, {});

    return { byTipo, byCarrera, byArea, byEstado, bySemestre, disponibilidadPorDia };
  }, [postulaciones]);

  async function handleStatusChange(id: number, estado: string) {
    setUpdatingId(id);
    const response = await fetch("/api/admin/postulaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado })
    });

    if (response.ok) {
      setPostulaciones((current) =>
        current.map((item) => (item.id === id ? { ...item, estado } : item))
      );
    }

    setUpdatingId(null);
  }

  const selectedByDay = useMemo(() => {
    if (!selected) return {} as Record<string, number[]>;

    const grouped: Record<string, number[]> = {};
    for (const day of DIA_ORDEN) grouped[day] = [];

    for (const item of selected.disponibilidad) {
      grouped[item.diaSemana] = [...(grouped[item.diaSemana] ?? []), item.bloque].sort((a, b) => a - b);
    }

    return grouped;
  }, [selected]);

  function renderBars(data: Record<string, number>) {
    const entries = Object.entries(data);
    const max = Math.max(...entries.map((entry) => entry[1]), 1);

    return (
      <div className="space-y-2">
        {entries.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-ciac-blue" style={{ width: `${(value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <main className="py-10">
      <div className="container-page space-y-8 print:space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-ciac-blue">Panel interno</p>
            <h1 className="text-3xl font-bold text-ciac-navy md:text-4xl">Postulaciones CIAC</h1>
            <p className="mt-3 max-w-3xl text-slate-600">Revisión y gestión de postulantes en tiempo real.</p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-ciac-blue px-5 py-3 font-semibold text-white"
          >
            Generar reporte PDF
          </button>
        </div>

        <section className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
          {kpis.map((item) => (
            <article key={item.label} className="card p-5">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-bold text-ciac-navy">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="card p-6 print:hidden">
          <h2 className="section-title mb-4">Vista analítica global</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold text-ciac-navy">Postulantes por tipo</h3>
              {renderBars({
                "Tutor académico": analytics.byTipo.academico,
                "Apoyo administrativo": analytics.byTipo.administrativo
              })}
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-ciac-navy">Postulantes por carrera</h3>
              {renderBars(analytics.byCarrera)}
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-ciac-navy">Postulaciones por área</h3>
              {renderBars(analytics.byArea)}
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-ciac-navy">Postulaciones por estado</h3>
              {renderBars(analytics.byEstado)}
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-ciac-navy">Postulaciones por semestre</h3>
              {renderBars(analytics.bySemestre)}
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-ciac-navy">Disponibilidad por día</h3>
              {renderBars(analytics.disponibilidadPorDia)}
            </div>
          </div>
        </section>

        <section className="card p-6 print:hidden">
          <div className="mb-5 grid gap-4 md:grid-cols-4">
            <input
              className="input"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar por nombre o RUT"
            />

            <select className="input" value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="academico">Tutor académico</option>
              <option value="administrativo">Apoyo administrativo</option>
            </select>

            <select className="input" value={carreraFilter} onChange={(e) => setCarreraFilter(e.target.value)}>
              <option value="">Todas las carreras</option>
              {carreras.map((carrera) => (
                <option key={carrera} value={carrera}>
                  {carrera}
                </option>
              ))}
            </select>

            <select className="input" value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-2xl">
              <thead>
                <tr className="bg-slate-100 text-left text-sm text-slate-700">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">RUT</th>
                  <th className="px-4 py-3">Carrera</th>
                  <th className="px-4 py-3">Semestre</th>
                  <th className="px-4 py-3">Tipo de postulación</th>
                  <th className="px-4 py-3">Fecha de postulación</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-t border-slate-200 bg-white text-sm hover:bg-slate-50"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td className="px-4 py-3">{item.postulante?.nombreCompleto ?? "-"}</td>
                    <td className="px-4 py-3">{item.postulante?.rut ?? "-"}</td>
                    <td className="px-4 py-3">{item.postulante?.carrera ?? "-"}</td>
                    <td className="px-4 py-3">{item.postulante?.semestre ?? "-"}</td>
                    <td className="px-4 py-3">{formatTipo(item.tipoPostulacion)}</td>
                    <td className="px-4 py-3">{new Date(item.createdAt).toLocaleDateString("es-CL")}</td>
                    <td className="px-4 py-3">{item.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-6 print:break-inside-avoid">
          <h2 className="section-title mb-4">Detalle de postulante</h2>

          {!selected && <p className="text-sm text-slate-500">No hay postulaciones para los filtros seleccionados.</p>}

          {selected && (
            <div className="space-y-4 text-sm text-slate-700">
              <p><strong>Nombre:</strong> {selected.postulante?.nombreCompleto ?? "-"}</p>
              <p><strong>RUT:</strong> {selected.postulante?.rut ?? "-"}</p>
              <p><strong>Correo:</strong> {selected.postulante?.correo ?? "-"}</p>
              <p><strong>Teléfono:</strong> {selected.postulante?.telefono ?? "-"}</p>
              <p><strong>Carrera:</strong> {selected.postulante?.carrera ?? "-"}</p>
              <p><strong>Semestre:</strong> {selected.postulante?.semestre ?? "-"}</p>
              <p><strong>Tipo de postulación:</strong> {formatTipo(selected.tipoPostulacion)}</p>
              <p><strong>Fecha de postulación:</strong> {new Date(selected.createdAt).toLocaleString("es-CL")}</p>
              <p><strong>Motivación:</strong> {selected.motivacion || "-"}</p>
              <p>
                <strong>Áreas o asignaturas postuladas:</strong>{" "}
                {selected.areas.map((area) => `${formatArea(area.area)}${area.notaAsignatura ? ` (${area.notaAsignatura.toFixed(1)})` : ""}`).join(", ") || "-"}
              </p>

              <div>
                <p className="mb-2"><strong>Disponibilidad resumida:</strong></p>
                <ul className="list-inside list-disc space-y-1">
                  {DIA_ORDEN.map((day) => (
                    <li key={day}>
                      {formatDay(day)}: {selectedByDay[day]?.length ? `bloques ${selectedByDay[day].join(", ")}` : "sin bloques"}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2"><strong>Calendario de disponibilidad:</strong></p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-center text-xs">
                    <thead>
                      <tr>
                        <th className="border border-slate-300 px-2 py-2 text-left">Bloque</th>
                        {DIAS_SEMANA.map((dia) => (
                          <th key={dia.value} className="border border-slate-300 px-2 py-2">{dia.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {BLOQUES.map((bloque) => (
                        <tr key={bloque.value}>
                          <td className="border border-slate-300 px-2 py-2 text-left">
                            {bloque.label}
                            <div className="text-[10px] text-slate-500">{bloque.rango}</div>
                          </td>
                          {DIAS_SEMANA.map((dia) => {
                            const isSelected = selected.disponibilidad.some(
                              (item) => item.diaSemana === dia.value && item.bloque === bloque.value
                            );

                            return (
                              <td
                                key={`${dia.value}-${bloque.value}`}
                                className={`border border-slate-300 px-2 py-2 ${isSelected ? "bg-ciac-light font-semibold text-ciac-blue" : "bg-white"}`}
                              >
                                {isSelected ? "✔" : ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="mb-2"><strong>Documentos:</strong></p>
                {selected.documentos.length === 0 && <p>No hay documentos registrados.</p>}
                {selected.documentos.length > 0 && (
                  <ul className="space-y-2">
                    {selected.documentos.map((doc, index) => (
                      <li key={`${doc.nombre}-${index}`} className="flex items-center gap-3">
                        <span>{doc.tipo}: {doc.nombre}</span>
                        {doc.url ? (
                          <a className="text-ciac-blue underline" href={doc.url} target="_blank" rel="noreferrer">
                            Ver documento
                          </a>
                        ) : (
                          <span className="text-slate-500">Sin enlace</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-2 print:hidden">
                <label className="label" htmlFor="estado-select">
                  Estado de postulación
                </label>
                <select
                  id="estado-select"
                  className="input max-w-xs"
                  value={selected.estado}
                  disabled={updatingId === selected.id}
                  onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        <section className="card p-6 print:break-before-page">
          <h2 className="section-title mb-4">Ranking de postulantes por nota</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="px-4 py-3">Posición</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">RUT</th>
                  <th className="px-4 py-3">Carrera</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Asignatura postulada</th>
                  <th className="px-4 py-3">Nota utilizada</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">{item.position}</td>
                    <td className="px-4 py-3">{item.postulante?.nombreCompleto ?? "-"}</td>
                    <td className="px-4 py-3">{item.postulante?.rut ?? "-"}</td>
                    <td className="px-4 py-3">{item.postulante?.carrera ?? "-"}</td>
                    <td className="px-4 py-3">{formatTipo(item.tipoPostulacion)}</td>
                    <td className="px-4 py-3">{item.rankingAreaLabel === "Promedio de asignaturas" ? item.rankingAreaLabel : item.rankingAreaLabel ? formatArea(item.rankingAreaLabel) : "-"}</td>
                    <td className="px-4 py-3">{item.rankingScore > 0 ? item.rankingScore.toFixed(2) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="hidden print:block">
          <h2 className="mb-2 text-2xl font-bold text-ciac-navy">Reporte general de postulantes</h2>
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border px-2 py-1">Nombre</th>
                <th className="border px-2 py-1">RUT</th>
                <th className="border px-2 py-1">Correo</th>
                <th className="border px-2 py-1">Teléfono</th>
                <th className="border px-2 py-1">Carrera</th>
                <th className="border px-2 py-1">Semestre</th>
                <th className="border px-2 py-1">Tipo</th>
                <th className="border px-2 py-1">Estado</th>
                <th className="border px-2 py-1">Fecha</th>
                <th className="border px-2 py-1">Disponibilidad</th>
                <th className="border px-2 py-1">Áreas</th>
                <th className="border px-2 py-1">Asignatura ranking</th>
                <th className="border px-2 py-1">Nota ranking</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item) => {
                const byDay = item.disponibilidad.reduce<Record<string, number[]>>((acc, disp) => {
                  acc[disp.diaSemana] = [...(acc[disp.diaSemana] ?? []), disp.bloque].sort((a, b) => a - b);
                  return acc;
                }, {});

                const resumenDisponibilidad = DIA_ORDEN
                  .map((day) => `${formatDay(day)}: ${byDay[day]?.join(",") ?? "-"}`)
                  .join(" | ");

                return (
                  <tr key={`print-${item.id}`}>
                    <td className="border px-2 py-1">{item.postulante?.nombreCompleto ?? "-"}</td>
                    <td className="border px-2 py-1">{item.postulante?.rut ?? "-"}</td>
                    <td className="border px-2 py-1">{item.postulante?.correo ?? "-"}</td>
                    <td className="border px-2 py-1">{item.postulante?.telefono ?? "-"}</td>
                    <td className="border px-2 py-1">{item.postulante?.carrera ?? "-"}</td>
                    <td className="border px-2 py-1">{item.postulante?.semestre ?? "-"}</td>
                    <td className="border px-2 py-1">{formatTipo(item.tipoPostulacion)}</td>
                    <td className="border px-2 py-1">{item.estado}</td>
                    <td className="border px-2 py-1">{new Date(item.createdAt).toLocaleDateString("es-CL")}</td>
                    <td className="border px-2 py-1">{resumenDisponibilidad}</td>
                    <td className="border px-2 py-1">{item.areas.map((area) => formatArea(area.area)).join(", ") || "-"}</td>
                    <td className="border px-2 py-1">{item.rankingAreaLabel === "Promedio de asignaturas" ? item.rankingAreaLabel : item.rankingAreaLabel ? formatArea(item.rankingAreaLabel) : "-"}</td>
                    <td className="border px-2 py-1">{item.rankingScore > 0 ? item.rankingScore.toFixed(2) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
