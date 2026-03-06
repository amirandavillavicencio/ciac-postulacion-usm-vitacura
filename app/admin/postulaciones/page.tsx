"use client";

import { useEffect, useMemo, useState } from "react";

import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";

type Documento = {
  tipoDocumento: string;
  fileUrl: string;
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
  area: string | null;
  notaAsignatura: number | null;
  disponibilidad: { diaSemana: string; bloque: number }[];
  documentos: Documento[];
};

const ESTADOS = ["recibida", "en revisión", "aceptada", "rechazada"];

function formatTipo(tipo: string) {
  if (tipo === "academico") return "Tutor académico";
  if (tipo === "administrativo") return "Apoyo administrativo";
  return tipo;
}

function formatArea(area: string | null) {
  const areasMap: Record<string, string> = {
    matematicas_i: "Matemáticas I",
    matematicas_ii: "Matemáticas II",
    matematicas_iii: "Matemáticas III",
    matematicas_iv: "Matemáticas IV",
    fisica_i: "Física I",
    fisica_ii: "Física II",
    fisica_120: "Física 120",
    quimica: "Química",
    programacion: "Programación",
    administrativo: "No aplica"
  };

  return area ? areasMap[area] ?? area : "-";
}

function estadoBadge(estado: string) {
  if (estado === "aceptada") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (estado === "rechazada") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (estado === "en revisión") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function buildDisponibilidadMap(rows: { diaSemana: string; bloque: number }[]) {
  return new Set(rows.map((item) => `${item.diaSemana}_${item.bloque}`));
}

export default function AdminPostulacionesPage() {
  const [postulaciones, setPostulaciones] = useState<PostulacionAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [asignaturaFilter, setAsignaturaFilter] = useState<string>("");
  const [carreraFilter, setCarreraFilter] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [internalActions, setInternalActions] = useState<Record<number, {
    documentosValidos: boolean;
    pruebaAsignada: boolean;
    entrevistaAgendada: boolean;
    comentario: string;
  }>>({});

  useEffect(() => {
    async function fetchPostulaciones() {
      setLoading(true);
      setError("");
      const response = await fetch("/api/admin/postulaciones", { cache: "no-store" });
      if (!response.ok) {
        setError("No fue posible cargar postulaciones.");
        setLoading(false);
        return;
      }

      const data = (await response.json()) as { data: PostulacionAdmin[] };
      setPostulaciones(data.data);
      setSelectedId(data.data[0]?.id ?? null);
      setLoading(false);
    }

    fetchPostulaciones();
  }, []);

  const filtered = useMemo(() => {
    const term = searchFilter.trim().toLowerCase();

    return postulaciones.filter((item) => {
      const tipoOk = tipoFilter ? item.tipoPostulacion === tipoFilter : true;
      const asignaturaOk = asignaturaFilter ? item.area === asignaturaFilter : true;
      const carreraOk = carreraFilter ? item.postulante?.carrera === carreraFilter : true;
      const estadoOk = estadoFilter ? item.estado === estadoFilter : true;
      const nombre = item.postulante?.nombreCompleto?.toLowerCase() ?? "";
      const rut = item.postulante?.rut?.toLowerCase() ?? "";
      const searchOk = term ? nombre.includes(term) || rut.includes(term) : true;

      return tipoOk && asignaturaOk && carreraOk && estadoOk && searchOk;
    });
  }, [asignaturaFilter, carreraFilter, estadoFilter, postulaciones, searchFilter, tipoFilter]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const carreras = [...new Set(postulaciones.map((item) => item.postulante?.carrera).filter(Boolean))] as string[];
  const asignaturas = [...new Set(postulaciones.map((item) => item.area).filter(Boolean))] as string[];

  const kpis = useMemo(() => {
    const total = postulaciones.length;
    const academicos = postulaciones.filter((item) => item.tipoPostulacion === "academico").length;
    const administrativos = postulaciones.filter((item) => item.tipoPostulacion === "administrativo").length;

    return [
      { label: "Total postulaciones", value: total },
      { label: "Tutor académico", value: academicos },
      { label: "Apoyo administrativo", value: administrativos }
    ];
  }, [postulaciones]);

  const grouped = useMemo(() => {
    const byTipo = new Map<string, number>();
    const byCarrera = new Map<string, number>();
    const byAsignatura = new Map<string, number>();
    const byEstado = new Map<string, number>();
    const bySemestre = new Map<string, number>();

    for (const item of postulaciones) {
      byTipo.set(formatTipo(item.tipoPostulacion), (byTipo.get(formatTipo(item.tipoPostulacion)) ?? 0) + 1);
      byCarrera.set(item.postulante?.carrera ?? "Sin carrera", (byCarrera.get(item.postulante?.carrera ?? "Sin carrera") ?? 0) + 1);
      byAsignatura.set(formatArea(item.area), (byAsignatura.get(formatArea(item.area)) ?? 0) + 1);
      byEstado.set(item.estado, (byEstado.get(item.estado) ?? 0) + 1);
      bySemestre.set(String(item.postulante?.semestre ?? "Sin dato"), (bySemestre.get(String(item.postulante?.semestre ?? "Sin dato")) ?? 0) + 1);
    }

    return {
      tipo: Array.from(byTipo.entries()),
      carrera: Array.from(byCarrera.entries()),
      asignatura: Array.from(byAsignatura.entries()),
      estado: Array.from(byEstado.entries()),
      semestre: Array.from(bySemestre.entries())
    };
  }, [postulaciones]);

  const ranking = useMemo(() => {
    return postulaciones
      .filter((item) => item.notaAsignatura !== null)
      .sort((a, b) => (b.notaAsignatura ?? 0) - (a.notaAsignatura ?? 0))
      .slice(0, 20);
  }, [postulaciones]);

  async function handleStatusChange(id: number, estado: string) {
    setUpdatingId(id);
    const response = await fetch("/api/admin/postulaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado })
    });

    if (response.ok) {
      setPostulaciones((current) => current.map((item) => (item.id === id ? { ...item, estado } : item)));
    }

    setUpdatingId(null);
  }

  function renderSimpleChart(title: string, data: [string, number][]) {
    const maxValue = Math.max(...data.map((item) => item[1]), 1);

    return (
      <article className="card p-5">
        <h3 className="mb-4 text-base font-semibold text-ciac-navy">{title}</h3>
        <div className="space-y-3">
          {data.length === 0 && <p className="text-sm text-slate-500">Sin datos disponibles.</p>}
          {data.map(([label, value]) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-ciac-blue"
                  style={{ width: `${Math.max((value / maxValue) * 100, 8)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>
    );
  }

  return (
    <main className="py-10 print:py-0">
      <div className="container-page space-y-8">
        <div className="no-print flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-ciac-blue">Panel interno</p>
            <h1 className="text-3xl font-bold text-ciac-navy md:text-4xl">Postulaciones CIAC</h1>
            <p className="mt-3 max-w-3xl text-slate-600">Revisión, ranking y gestión con datos reales de Supabase.</p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            onClick={() => window.print()}
          >
            Generar reporte PDF / Imprimir reporte
          </button>
        </div>

        {loading && <p className="text-sm text-slate-500">Cargando postulaciones...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              {kpis.map((item) => (
                <article key={item.label} className="card p-5">
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-bold text-ciac-navy">{item.value}</p>
                </article>
              ))}
            </section>

            <section className="no-print card p-6">
              <div className="mb-5 grid gap-4 md:grid-cols-5">
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

                <select className="input" value={asignaturaFilter} onChange={(e) => setAsignaturaFilter(e.target.value)}>
                  <option value="">Todas las asignaturas</option>
                  {asignaturas.map((asignatura) => (
                    <option key={asignatura} value={asignatura}>
                      {formatArea(asignatura)}
                    </option>
                  ))}
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
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Asignatura</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Documentos</th>
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
                        <td className="px-4 py-3">{formatArea(item.area)}</td>
                        <td className="px-4 py-3">{new Date(item.createdAt).toLocaleDateString("es-CL")}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${estadoBadge(item.estado)}`}>
                            {item.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {item.documentos.length === 0 && <span className="text-slate-400">Sin docs</span>}
                            {item.documentos.map((doc) => (
                              <a
                                key={`${item.id}-${doc.tipoDocumento}-${doc.fileUrl}`}
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-ciac-blue"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {doc.tipoDocumento.toUpperCase()}
                              </a>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card p-6">
              <h2 className="section-title mb-4">Detalle de postulante</h2>

              {!selected && <p className="text-sm text-slate-500">No hay postulaciones para los filtros seleccionados.</p>}

              {selected && (
                <div className="space-y-6 text-sm text-slate-700">
                  <div className="grid gap-4 md:grid-cols-2">
                    <p><strong>Nombre:</strong> {selected.postulante?.nombreCompleto ?? "-"}</p>
                    <p><strong>RUT:</strong> {selected.postulante?.rut ?? "-"}</p>
                    <p><strong>Correo:</strong> {selected.postulante?.correo ?? "-"}</p>
                    <p><strong>Teléfono:</strong> {selected.postulante?.telefono ?? "-"}</p>
                    <p><strong>Carrera:</strong> {selected.postulante?.carrera ?? "-"}</p>
                    <p><strong>Semestre:</strong> {selected.postulante?.semestre ?? "-"}</p>
                    <p><strong>Tipo:</strong> {formatTipo(selected.tipoPostulacion)}</p>
                    <p><strong>Asignatura:</strong> {formatArea(selected.area)}</p>
                    <p><strong>Nota asignatura:</strong> {selected.notaAsignatura ?? "-"}</p>
                    <p><strong>Fecha de postulación:</strong> {new Date(selected.createdAt).toLocaleString("es-CL")}</p>
                  </div>

                  <div>
                    <p className="mb-2"><strong>Motivación:</strong></p>
                    <p className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">{selected.motivacion || "-"}</p>
                  </div>

                  <div>
                    <p className="mb-2"><strong>Documentos:</strong></p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {selected.documentos.length === 0 && <p className="text-slate-500">Sin documentos adjuntos.</p>}
                      {selected.documentos.map((doc) => (
                        <div key={doc.fileUrl} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                          <p className="font-semibold">{doc.tipoDocumento.toUpperCase()}</p>
                          <div className="mt-2 flex gap-2">
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-ciac-blue underline">
                              Ver
                            </a>
                            <a href={doc.fileUrl} download className="text-ciac-blue underline">
                              Descargar
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2"><strong>Disponibilidad por día:</strong></p>
                    <div className="grid gap-3 md:grid-cols-5">
                      {DIAS_SEMANA.map((dia) => {
                        const bloquesDia = selected.disponibilidad
                          .filter((item) => item.diaSemana === dia.value)
                          .map((item) => item.bloque)
                          .sort((a, b) => a - b);

                        return (
                          <div key={dia.value} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                            <p className="font-semibold">{dia.label}</p>
                            <p className="text-xs text-slate-600">
                              {bloquesDia.length > 0 ? `Bloques: ${bloquesDia.join(", ")}` : "Sin bloques"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <p className="mb-2"><strong>Grilla de disponibilidad (bloques 1 a 10)</strong></p>
                    <table className="min-w-full border-separate border-spacing-2">
                      <thead>
                        <tr>
                          <th className="rounded-xl bg-slate-100 px-3 py-2 text-left text-xs">Bloque</th>
                          {DIAS_SEMANA.map((dia) => (
                            <th key={dia.value} className="rounded-xl bg-slate-100 px-3 py-2 text-center text-xs">
                              {dia.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {BLOQUES.map((bloque) => {
                          const availabilityMap = buildDisponibilidadMap(selected.disponibilidad);

                          return (
                            <tr key={bloque.value}>
                              <td className="rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-slate-200">{bloque.label}</td>
                              {DIAS_SEMANA.map((dia) => {
                                const key = `${dia.value}_${bloque.value}`;
                                const active = availabilityMap.has(key);

                                return (
                                  <td
                                    key={key}
                                    className={`rounded-xl px-3 py-2 text-center text-xs ring-1 ring-slate-200 ${
                                      active ? "bg-ciac-light font-semibold text-ciac-blue" : "bg-white text-slate-400"
                                    }`}
                                  >
                                    {active ? "Disponible" : "-"}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="no-print pt-2">
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

                  <div className="no-print rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="mb-3 text-sm font-semibold text-ciac-navy">Acciones internas (UI mínima operativa)</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={internalActions[selected.id]?.documentosValidos ?? false}
                          onChange={(e) =>
                            setInternalActions((current) => ({
                              ...current,
                              [selected.id]: {
                                documentosValidos: e.target.checked,
                                pruebaAsignada: current[selected.id]?.pruebaAsignada ?? false,
                                entrevistaAgendada: current[selected.id]?.entrevistaAgendada ?? false,
                                comentario: current[selected.id]?.comentario ?? ""
                              }
                            }))
                          }
                        />
                        Marcar documentos como válidos
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={internalActions[selected.id]?.pruebaAsignada ?? false}
                          onChange={(e) =>
                            setInternalActions((current) => ({
                              ...current,
                              [selected.id]: {
                                documentosValidos: current[selected.id]?.documentosValidos ?? false,
                                pruebaAsignada: e.target.checked,
                                entrevistaAgendada: current[selected.id]?.entrevistaAgendada ?? false,
                                comentario: current[selected.id]?.comentario ?? ""
                              }
                            }))
                          }
                        />
                        Asignar prueba de selección
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={internalActions[selected.id]?.entrevistaAgendada ?? false}
                          onChange={(e) =>
                            setInternalActions((current) => ({
                              ...current,
                              [selected.id]: {
                                documentosValidos: current[selected.id]?.documentosValidos ?? false,
                                pruebaAsignada: current[selected.id]?.pruebaAsignada ?? false,
                                entrevistaAgendada: e.target.checked,
                                comentario: current[selected.id]?.comentario ?? ""
                              }
                            }))
                          }
                        />
                        Agendar entrevista psicolaboral
                      </label>
                    </div>
                    <textarea
                      className="input mt-3 min-h-24"
                      placeholder="Comentarios internos"
                      value={internalActions[selected.id]?.comentario ?? ""}
                      onChange={(e) =>
                        setInternalActions((current) => ({
                          ...current,
                          [selected.id]: {
                            documentosValidos: current[selected.id]?.documentosValidos ?? false,
                            pruebaAsignada: current[selected.id]?.pruebaAsignada ?? false,
                            entrevistaAgendada: current[selected.id]?.entrevistaAgendada ?? false,
                            comentario: e.target.value
                          }
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="grid gap-4 md:grid-cols-2 print:grid-cols-1">
              {renderSimpleChart("Postulantes por tipo", grouped.tipo)}
              {renderSimpleChart("Postulantes por carrera", grouped.carrera)}
              {renderSimpleChart("Postulaciones por asignatura", grouped.asignatura)}
              {renderSimpleChart("Postulaciones por estado", grouped.estado)}
              {renderSimpleChart("Postulaciones por semestre", grouped.semestre)}
            </section>

            <section className="card p-6">
              <h2 className="section-title mb-4">Ranking por nota de asignatura</h2>
              <p className="mb-4 text-sm text-slate-600">
                Regla de ranking: orden descendente por nota registrada en la asignatura postulada.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-left">
                      <th className="px-3 py-2">Posición</th>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">RUT</th>
                      <th className="px-3 py-2">Carrera</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Asignatura</th>
                      <th className="px-3 py-2">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((item, index) => (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">{item.postulante?.nombreCompleto ?? "-"}</td>
                        <td className="px-3 py-2">{item.postulante?.rut ?? "-"}</td>
                        <td className="px-3 py-2">{item.postulante?.carrera ?? "-"}</td>
                        <td className="px-3 py-2">{formatTipo(item.tipoPostulacion)}</td>
                        <td className="px-3 py-2">{formatArea(item.area)}</td>
                        <td className="px-3 py-2 font-semibold">{item.notaAsignatura ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="print-only card p-6">
              <h2 className="section-title mb-4">Reporte general de postulantes</h2>
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="px-2 py-2">Nombre</th>
                    <th className="px-2 py-2">RUT</th>
                    <th className="px-2 py-2">Correo</th>
                    <th className="px-2 py-2">Teléfono</th>
                    <th className="px-2 py-2">Carrera</th>
                    <th className="px-2 py-2">Sem.</th>
                    <th className="px-2 py-2">Tipo</th>
                    <th className="px-2 py-2">Asignatura</th>
                    <th className="px-2 py-2">Estado</th>
                    <th className="px-2 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {postulaciones.map((item) => (
                    <tr key={`print-${item.id}`} className="border-t border-slate-200">
                      <td className="px-2 py-2">{item.postulante?.nombreCompleto ?? "-"}</td>
                      <td className="px-2 py-2">{item.postulante?.rut ?? "-"}</td>
                      <td className="px-2 py-2">{item.postulante?.correo ?? "-"}</td>
                      <td className="px-2 py-2">{item.postulante?.telefono ?? "-"}</td>
                      <td className="px-2 py-2">{item.postulante?.carrera ?? "-"}</td>
                      <td className="px-2 py-2">{item.postulante?.semestre ?? "-"}</td>
                      <td className="px-2 py-2">{formatTipo(item.tipoPostulacion)}</td>
                      <td className="px-2 py-2">{formatArea(item.area)}</td>
                      <td className="px-2 py-2">{item.estado}</td>
                      <td className="px-2 py-2">{new Date(item.createdAt).toLocaleDateString("es-CL")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
