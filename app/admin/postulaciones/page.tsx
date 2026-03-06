"use client";

import { useEffect, useMemo, useState } from "react";

type PostulacionAdmin = {
  id: number;
  tipoPostulacion: string;
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
  areas: string[];
  disponibilidad: string[];
};

const ESTADOS = ["recibida", "en revisión", "aceptada", "rechazada"];

export default function AdminPostulacionesPage() {
  const [postulaciones, setPostulaciones] = useState<PostulacionAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [carreraFilter, setCarreraFilter] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<string>("");
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

  const filtered = useMemo(
    () =>
      postulaciones.filter((item) => {
        const tipoOk = tipoFilter ? item.tipoPostulacion === tipoFilter : true;
        const carreraOk = carreraFilter ? item.postulante?.carrera === carreraFilter : true;
        const estadoOk = estadoFilter ? item.estado === estadoFilter : true;

        return tipoOk && carreraOk && estadoOk;
      }),
    [carreraFilter, estadoFilter, postulaciones, tipoFilter]
  );

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const carreras = [...new Set(postulaciones.map((item) => item.postulante?.carrera).filter(Boolean))] as string[];

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

  return (
    <main className="py-10">
      <div className="container-page space-y-8">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-ciac-blue">Panel interno</p>
          <h1 className="text-3xl font-bold text-ciac-navy md:text-4xl">Postulaciones CIAC</h1>
          <p className="mt-3 max-w-3xl text-slate-600">Revisión y gestión de postulantes.</p>
        </div>

        <section className="card p-6">
          <div className="mb-5 grid gap-4 md:grid-cols-3">
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
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Fecha</th>
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
                    <td className="px-4 py-3">{item.tipoPostulacion}</td>
                    <td className="px-4 py-3">{new Date(item.createdAt).toLocaleDateString("es-CL")}</td>
                    <td className="px-4 py-3">{item.estado}</td>
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
            <div className="space-y-4 text-sm text-slate-700">
              <p><strong>Nombre:</strong> {selected.postulante?.nombreCompleto ?? "-"}</p>
              <p><strong>RUT:</strong> {selected.postulante?.rut ?? "-"}</p>
              <p><strong>Correo:</strong> {selected.postulante?.correo ?? "-"}</p>
              <p><strong>Teléfono:</strong> {selected.postulante?.telefono ?? "-"}</p>
              <p><strong>Carrera:</strong> {selected.postulante?.carrera ?? "-"}</p>
              <p><strong>Semestre:</strong> {selected.postulante?.semestre ?? "-"}</p>
              <p><strong>Motivación:</strong> {selected.motivacion}</p>
              <p><strong>Áreas postuladas:</strong> {selected.areas.join(", ") || "-"}</p>
              <p><strong>Disponibilidad:</strong> {selected.disponibilidad.join(", ") || "-"}</p>

              <div className="pt-2">
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
      </div>
    </main>
  );
}
