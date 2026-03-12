"use client";

import { useEffect, useMemo, useState } from "react";

type EstadoPostulacion = "Pendiente" | "Seleccionado" | "Rechazado";
type CargoPostulacion = "Tutor" | "Administrativo" | "Difusión" | "Otro";

type Postulante = {
  id: string;
  nombreCompleto: string;
  correo: string;
  telefono: string;
  carrera: string;
  genero: string;
  cargo: CargoPostulacion;
  estado: EstadoPostulacion;
  disponibilidad: string[];
  comentario: string;
  fechaPostulacion: string;
  raw?: unknown;
};

type ApiResponse = unknown;

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function firstNumberLike(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "number") return String(value);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeEstado(value: string): EstadoPostulacion {
  const v = value.toLowerCase().trim();

  if (
    v.includes("seleccion") ||
    v.includes("aprob") ||
    v.includes("acept") ||
    v === "selected"
  ) {
    return "Seleccionado";
  }

  if (
    v.includes("rechaz") ||
    v.includes("declin") ||
    v === "rejected"
  ) {
    return "Rechazado";
  }

  return "Pendiente";
}

function normalizeCargo(value: string): CargoPostulacion {
  const v = value.toLowerCase().trim();

  if (v.includes("tutor")) return "Tutor";
  if (v.includes("admin")) return "Administrativo";
  if (v.includes("difu")) return "Difusión";
  return "Otro";
}

function normalizeDisponibilidad(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return item.trim() ? [item.trim()] : [];
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          const dia = firstString(obj.dia, obj.dia_semana, obj.day);
          const bloque = firstString(
            obj.bloque,
            obj.bloque_nombre,
            obj.block,
            obj.horario
          );
          const inicio = firstString(obj.inicio, obj.start);
          const fin = firstString(obj.fin, obj.end);

          const compuesto = [dia, bloque].filter(Boolean).join(" ");
          if (compuesto) return [compuesto.trim()];
          if (inicio || fin) return [[inicio, fin].filter(Boolean).join(" - ").trim()];
        }
        return [];
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      return normalizeDisponibilidad(parsed);
    } catch {
      return text
        .split(/[,;\n]+/)
        .map((x) => x.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function extractArrayFromResponse(data: ApiResponse): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    const candidates = [
      obj.data,
      obj.items,
      obj.postulaciones,
      obj.postulantes,
      obj.result,
      obj.rows,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(
          (x): x is Record<string, unknown> => !!x && typeof x === "object"
        );
      }
    }
  }

  return [];
}

function normalizePostulante(item: Record<string, unknown>, index: number): Postulante {
  const nombreCompleto = firstString(
    item.nombreCompleto,
    item.nombre_completo,
    item.nombre,
    item.nombres,
    item.postulante,
    item.full_name
  );

  const correo = firstString(
    item.correo,
    item.email,
    item.mail,
    item.correo_institucional
  );

  const telefono = firstString(
    item.telefono,
    item.telefono_contacto,
    item.celular,
    item.phone
  );

  const carrera = firstString(
    item.carrera,
    item.carrera_nombre,
    item.programa,
    item.major
  );

  const genero = firstString(
    item.genero,
    item.genre,
    item.sexo
  );

  const cargoRaw = firstString(
    item.cargo,
    item.cargo_postulacion,
    item.tipo_postulacion,
    item.rol,
    item.postula_a
  );

  const estadoRaw = firstString(
    item.estado,
    item.estado_postulacion,
    item.status
  );

  const comentario = firstString(
    item.comentario,
    item.motivacion,
    item.descripcion,
    item.observacion,
    item.observaciones
  );

  const fechaPostulacion = firstString(
    item.fechaPostulacion,
    item.fecha_postulacion,
    item.created_at,
    item.fecha
  );

  const disponibilidad = normalizeDisponibilidad(
    item.disponibilidad ??
      item.disponibilidad_bloques ??
      item.bloques ??
      item.horarios ??
      item.disponibilidad_json
  );

  const id = firstNumberLike(
    item.id,
    item.postulacion_id,
    item.uuid,
    item.slug,
    `${index + 1}`
  );

  return {
    id,
    nombreCompleto: nombreCompleto || `Postulante ${index + 1}`,
    correo,
    telefono,
    carrera,
    genero,
    cargo: normalizeCargo(cargoRaw || "Otro"),
    estado: normalizeEstado(estadoRaw || "Pendiente"),
    disponibilidad,
    comentario,
    fechaPostulacion,
    raw: item,
  };
}

export default function AdminPostulantesPage() {
  const [postulantes, setPostulantes] = useState<Postulante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("Todos");
  const [filtroCarrera, setFiltroCarrera] = useState("Todas");
  const [filtroGenero, setFiltroGenero] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [postulanteActivo, setPostulanteActivo] = useState<Postulante | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPostulantes() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/postulaciones", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: no se pudo obtener postulaciones`);
        }

        const data: ApiResponse = await response.json();
        const rows = extractArrayFromResponse(data);
        const normalizados = rows.map(normalizePostulante);

        if (!cancelled) {
          setPostulantes(normalizados);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error desconocido al cargar postulantes");
          setPostulantes([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPostulantes();

    return () => {
      cancelled = true;
    };
  }, []);

  const carreras = useMemo(() => {
    return Array.from(
      new Set(postulantes.map((p) => p.carrera).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [postulantes]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return postulantes.filter((p) => {
      const coincideTexto =
        texto === "" ||
        p.nombreCompleto.toLowerCase().includes(texto) ||
        p.correo.toLowerCase().includes(texto) ||
        p.carrera.toLowerCase().includes(texto);

      const coincideCargo = filtroCargo === "Todos" || p.cargo === filtroCargo;
      const coincideCarrera = filtroCarrera === "Todas" || p.carrera === filtroCarrera;
      const coincideGenero = filtroGenero === "Todos" || p.genero === filtroGenero;
      const coincideEstado = filtroEstado === "Todos" || p.estado === filtroEstado;

      return (
        coincideTexto &&
        coincideCargo &&
        coincideCarrera &&
        coincideGenero &&
        coincideEstado
      );
    });
  }, [postulantes, busqueda, filtroCargo, filtroCarrera, filtroGenero, filtroEstado]);

  const metricas = useMemo(() => {
    return {
      total: postulantes.length,
      tutores: postulantes.filter((p) => p.cargo === "Tutor").length,
      administrativos: postulantes.filter((p) => p.cargo === "Administrativo").length,
      seleccionados: postulantes.filter((p) => p.estado === "Seleccionado").length,
      pendientes: postulantes.filter((p) => p.estado === "Pendiente").length,
    };
  }, [postulantes]);

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroCargo("Todos");
    setFiltroCarrera("Todas");
    setFiltroGenero("Todos");
    setFiltroEstado("Todos");
  }

  async function refrescar() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/postulaciones", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: no se pudo refrescar la información`);
      }

      const data: ApiResponse = await response.json();
      const rows = extractArrayFromResponse(data);
      setPostulantes(rows.map(normalizePostulante));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al refrescar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
                Panel de administración
              </p>
              <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                Postulantes CIAC
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                Revisa, filtra y gestiona postulaciones reales cargadas desde la API
                administrativa del sistema.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Limpiar filtros
              </button>

              <button
                type="button"
                onClick={refrescar}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Refrescar
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total postulantes" value={metricas.total} />
          <MetricCard label="Tutores" value={metricas.tutores} />
          <MetricCard label="Administrativos" value={metricas.administrativos} />
          <MetricCard label="Seleccionados" value={metricas.seleccionados} />
          <MetricCard label="Pendientes" value={metricas.pendientes} />
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Buscar
              </label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, carrera o correo"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Cargo
              </label>
              <select
                value={filtroCargo}
                onChange={(e) => setFiltroCargo(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              >
                <option>Todos</option>
                <option>Tutor</option>
                <option>Administrativo</option>
                <option>Difusión</option>
                <option>Otro</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Carrera
              </label>
              <select
                value={filtroCarrera}
                onChange={(e) => setFiltroCarrera(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              >
                <option>Todas</option>
                {carreras.map((carrera) => (
                  <option key={carrera} value={carrera}>
                    {carrera}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Género
                </label>
                <select
                  value={filtroGenero}
                  onChange={(e) => setFiltroGenero(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                >
                  <option>Todos</option>
                  <option>Mujer</option>
                  <option>Hombre</option>
                  <option>No binario</option>
                  <option>Prefiere no decir</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Estado
                </label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                >
                  <option>Todos</option>
                  <option>Pendiente</option>
                  <option>Seleccionado</option>
                  <option>Rechazado</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Listado de postulantes
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Resultados encontrados:{" "}
                <span className="font-bold text-slate-900">{filtrados.length}</span>
              </p>
            </div>

            {loading && (
              <span className="text-sm font-semibold text-blue-700">Cargando datos...</span>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Carrera</TableHead>
                  <TableHead>Género</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Disponibilidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </tr>
              </thead>
              <tbody>
                {!loading && filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      No hay postulantes que coincidan con los filtros o la API no devolvió registros.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((postulante) => (
                    <tr key={postulante.id} className="border-b border-slate-100">
                      <td className="px-4 py-4 align-top">
                        <div className="font-bold text-slate-900">
                          {postulante.nombreCompleto}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {postulante.telefono || "Sin teléfono"}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-slate-700">
                        {postulante.correo || "Sin correo"}
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-slate-700">
                        {postulante.carrera || "Sin carrera"}
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-slate-700">
                        {postulante.genero || "Sin dato"}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <Badge>{postulante.cargo}</Badge>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex max-w-[260px] flex-wrap gap-2">
                          {postulante.disponibilidad.length > 0 ? (
                            postulante.disponibilidad.slice(0, 3).map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                              >
                                {item}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">Sin disponibilidad</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <EstadoBadge estado={postulante.estado} />
                      </td>

                      <td className="px-4 py-4 align-top">
                        <button
                          type="button"
                          onClick={() => setPostulanteActivo(postulante)}
                          className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-300"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {postulanteActivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setPostulanteActivo(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
                  Detalle del postulante
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {postulanteActivo.nombreCompleto}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{postulanteActivo.cargo}</Badge>
                  <EstadoBadge estado={postulanteActivo.estado} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPostulanteActivo(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DetailCard label="Correo" value={postulanteActivo.correo || "Sin dato"} />
              <DetailCard label="Teléfono" value={postulanteActivo.telefono || "Sin dato"} />
              <DetailCard label="Carrera" value={postulanteActivo.carrera || "Sin dato"} />
              <DetailCard label="Género" value={postulanteActivo.genero || "Sin dato"} />
              <DetailCard
                label="Fecha de postulación"
                value={postulanteActivo.fechaPostulacion || "Sin dato"}
              />
              <DetailCard label="Cargo" value={postulanteActivo.cargo} />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-700">Disponibilidad</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {postulanteActivo.disponibilidad.length > 0 ? (
                  postulanteActivo.disponibilidad.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Sin disponibilidad</span>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold text-slate-700">Comentario</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {postulanteActivo.comentario || "Sin comentario adicional."}
              </p>
            </div>

            <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <summary className="cursor-pointer text-sm font-bold text-slate-700">
                Ver JSON crudo
              </summary>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
                {JSON.stringify(postulanteActivo.raw, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-600">
      {children}
    </th>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
      {children}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: EstadoPostulacion }) {
  if (estado === "Seleccionado") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        {estado}
      </span>
    );
  }

  if (estado === "Rechazado") {
    return (
      <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
        {estado}
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
      {estado}
    </span>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
