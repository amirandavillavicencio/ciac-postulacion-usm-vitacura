"use client";

import { useMemo, useState } from "react";

type EstadoPostulacion = "Pendiente" | "Seleccionado" | "Rechazado";

type AreaPostulacion = "Tutor" | "Administrativo";

type Genero = "Mujer" | "Hombre" | "No binario" | "Prefiero no decir";

interface Postulante {
  id: number;
  nombreCompleto: string;
  correo: string;
  carrera: string;
  genero: Genero;
  cargo: AreaPostulacion;
  disponibilidadResumen: string;
  estado: EstadoPostulacion;
  telefono: string;
  semestresAprobados: number;
  motivacion: string;
  experiencia: string;
}

const mockPostulantes: Postulante[] = [
  {
    id: 1,
    nombreCompleto: "Camila Fuentes Rojas",
    correo: "camila.fuentes@usm.cl",
    carrera: "Ingeniería Civil Informática",
    genero: "Mujer",
    cargo: "Tutor",
    disponibilidadResumen: "Lun a Jue (17:00-20:00)",
    estado: "Pendiente",
    telefono: "+56 9 7123 4567",
    semestresAprobados: 7,
    motivacion:
      "Quiero apoyar a estudiantes de primer año en programación y estructuras de datos.",
    experiencia:
      "2 ayudantías en Intro a la Programación y monitorías internas de CIAC.",
  },
  {
    id: 2,
    nombreCompleto: "Martín Hidalgo Pérez",
    correo: "martin.hidalgo@usm.cl",
    carrera: "Ingeniería Comercial",
    genero: "Hombre",
    cargo: "Administrativo",
    disponibilidadResumen: "Mar y Vie (09:00-14:00)",
    estado: "Seleccionado",
    telefono: "+56 9 8456 1122",
    semestresAprobados: 8,
    motivacion:
      "Me interesa la gestión de procesos y atención de estudiantes en programas de apoyo.",
    experiencia: "Coordinador de centro de alumnos y gestión documental en secretaría académica.",
  },
  {
    id: 3,
    nombreCompleto: "Valentina Araya Silva",
    correo: "valentina.araya@usm.cl",
    carrera: "Ingeniería Civil Industrial",
    genero: "Mujer",
    cargo: "Administrativo",
    disponibilidadResumen: "Lun a Vie (08:30-12:30)",
    estado: "Pendiente",
    telefono: "+56 9 6334 1200",
    semestresAprobados: 6,
    motivacion: "Busco colaborar en la organización y seguimiento de postulaciones CIAC.",
    experiencia: "Práctica en gestión de operaciones y manejo de paneles en Google Data Studio.",
  },
  {
    id: 4,
    nombreCompleto: "Diego Acuña Morales",
    correo: "diego.acuna@usm.cl",
    carrera: "Ingeniería Civil Telemática",
    genero: "Hombre",
    cargo: "Tutor",
    disponibilidadResumen: "Mié a Sáb (16:00-19:00)",
    estado: "Rechazado",
    telefono: "+56 9 9012 0071",
    semestresAprobados: 5,
    motivacion:
      "Me interesa hacer tutorías de matemáticas y física para nivelación de ingreso.",
    experiencia: "Tutor voluntario en programa de acompañamiento escolar comunitario.",
  },
  {
    id: 5,
    nombreCompleto: "Isidora Contreras Vega",
    correo: "isidora.contreras@usm.cl",
    carrera: "Ingeniería en Diseño de Productos",
    genero: "No binario",
    cargo: "Tutor",
    disponibilidadResumen: "Lun, Mié y Vie (14:00-18:00)",
    estado: "Seleccionado",
    telefono: "+56 9 7788 9900",
    semestresAprobados: 9,
    motivacion: "Quiero aportar a los talleres de creatividad aplicada y metodología de estudio.",
    experiencia: "3 semestres como tutor par y facilitador de talleres de prototipado rápido.",
  },
  {
    id: 6,
    nombreCompleto: "Sebastián Muñoz Cortés",
    correo: "sebastian.munoz@usm.cl",
    carrera: "Ingeniería Civil Electrónica",
    genero: "Prefiero no decir",
    cargo: "Administrativo",
    disponibilidadResumen: "Jue y Vie (10:00-16:00)",
    estado: "Pendiente",
    telefono: "+56 9 6655 4411",
    semestresAprobados: 7,
    motivacion: "Busco apoyar en el control de datos y coordinación operativa del equipo CIAC.",
    experiencia: "Trabajo administrativo en laboratorio y apoyo en coordinación de ayudantes.",
  },
];

const estadoStyles: Record<EstadoPostulacion, string> = {
  Pendiente: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  Seleccionado: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  Rechazado: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
};

export default function AdminPostulantesPage() {
  const [postulantes, setPostulantes] = useState<Postulante[]>(mockPostulantes);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("Todos");
  const [filtroCarrera, setFiltroCarrera] = useState("Todas");
  const [filtroGenero, setFiltroGenero] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [postulanteSeleccionado, setPostulanteSeleccionado] = useState<Postulante | null>(null);

  const carreras = useMemo(
    () => ["Todas", ...new Set(postulantes.map((p) => p.carrera))],
    [postulantes],
  );

  const postulantesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return postulantes.filter((postulante) => {
      const coincideBusqueda =
        termino.length === 0 ||
        postulante.nombreCompleto.toLowerCase().includes(termino) ||
        postulante.carrera.toLowerCase().includes(termino) ||
        postulante.correo.toLowerCase().includes(termino);

      const coincideCargo = filtroCargo === "Todos" || postulante.cargo === filtroCargo;
      const coincideCarrera = filtroCarrera === "Todas" || postulante.carrera === filtroCarrera;
      const coincideGenero = filtroGenero === "Todos" || postulante.genero === filtroGenero;
      const coincideEstado = filtroEstado === "Todos" || postulante.estado === filtroEstado;

      return (
        coincideBusqueda &&
        coincideCargo &&
        coincideCarrera &&
        coincideGenero &&
        coincideEstado
      );
    });
  }, [busqueda, filtroCargo, filtroCarrera, filtroEstado, filtroGenero, postulantes]);

  const metricas = useMemo(() => {
    const total = postulantes.length;
    const tutores = postulantes.filter((p) => p.cargo === "Tutor").length;
    const administrativos = postulantes.filter((p) => p.cargo === "Administrativo").length;
    const seleccionados = postulantes.filter((p) => p.estado === "Seleccionado").length;
    const pendientes = postulantes.filter((p) => p.estado === "Pendiente").length;

    return { total, tutores, administrativos, seleccionados, pendientes };
  }, [postulantes]);

  const actualizarEstado = (id: number, estado: EstadoPostulacion) => {
    setPostulantes((actuales) =>
      actuales.map((postulante) =>
        postulante.id === id ? { ...postulante, estado } : postulante,
      ),
    );

    if (postulanteSeleccionado?.id === id) {
      setPostulanteSeleccionado((actual) => (actual ? { ...actual, estado } : null));
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Postulantes CIAC</h1>
          <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
            Administra postulaciones, revisa perfiles, filtra por criterios clave y toma
            decisiones de selección de forma centralizada.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total postulantes" value={metricas.total} />
          <KpiCard label="Tutores" value={metricas.tutores} />
          <KpiCard label="Administrativos" value={metricas.administrativos} />
          <KpiCard label="Seleccionados" value={metricas.seleccionados} />
          <KpiCard label="Pendientes" value={metricas.pendientes} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre, carrera o correo"
              className="xl:col-span-2 h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none ring-offset-2 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            <SelectFiltro
              value={filtroCargo}
              onChange={setFiltroCargo}
              options={["Todos", "Tutor", "Administrativo"]}
              ariaLabel="Filtrar por cargo"
            />
            <SelectFiltro
              value={filtroCarrera}
              onChange={setFiltroCarrera}
              options={carreras}
              ariaLabel="Filtrar por carrera"
            />
            <SelectFiltro
              value={filtroGenero}
              onChange={setFiltroGenero}
              options={["Todos", "Mujer", "Hombre", "No binario", "Prefiero no decir"]}
              ariaLabel="Filtrar por género"
            />
            <SelectFiltro
              value={filtroEstado}
              onChange={setFiltroEstado}
              options={["Todos", "Pendiente", "Seleccionado", "Rechazado"]}
              ariaLabel="Filtrar por estado"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Postulante</th>
                  <th className="px-4 py-3 font-semibold">Carrera</th>
                  <th className="px-4 py-3 font-semibold">Género</th>
                  <th className="px-4 py-3 font-semibold">Cargo</th>
                  <th className="px-4 py-3 font-semibold">Disponibilidad</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {postulantesFiltrados.map((postulante) => (
                  <tr key={postulante.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{postulante.nombreCompleto}</p>
                      <p className="text-slate-500">{postulante.correo}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{postulante.carrera}</td>
                    <td className="px-4 py-3 text-slate-700">{postulante.genero}</td>
                    <td className="px-4 py-3 text-slate-700">{postulante.cargo}</td>
                    <td className="px-4 py-3 text-slate-700">{postulante.disponibilidadResumen}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${estadoStyles[postulante.estado]}`}>
                        {postulante.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPostulanteSeleccionado(postulante)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Ver detalle
                        </button>
                        <button
                          type="button"
                          onClick={() => actualizarEstado(postulante.id, "Seleccionado")}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => actualizarEstado(postulante.id, "Rechazado")}
                          className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700"
                        >
                          Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {postulantesFiltrados.length === 0 && (
            <div className="border-t border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              No hay postulantes que coincidan con los filtros aplicados.
            </div>
          )}
        </section>
      </div>

      {postulanteSeleccionado && (
        <PostulanteDetalleModal
          postulante={postulanteSeleccionado}
          onClose={() => setPostulanteSeleccionado(null)}
          onAprobar={() => actualizarEstado(postulanteSeleccionado.id, "Seleccionado")}
          onRechazar={() => actualizarEstado(postulanteSeleccionado.id, "Rechazado")}
        />
      )}
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  );
}

function SelectFiltro({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-offset-2 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function PostulanteDetalleModal({
  postulante,
  onClose,
  onAprobar,
  onRechazar,
}: {
  postulante: Postulante;
  onClose: () => void;
  onAprobar: () => void;
  onRechazar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{postulante.nombreCompleto}</h2>
            <p className="text-sm text-slate-500">{postulante.correo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <DetalleItem etiqueta="Carrera" valor={postulante.carrera} />
          <DetalleItem etiqueta="Cargo" valor={postulante.cargo} />
          <DetalleItem etiqueta="Género" valor={postulante.genero} />
          <DetalleItem etiqueta="Semestres aprobados" valor={String(postulante.semestresAprobados)} />
          <DetalleItem etiqueta="Teléfono" valor={postulante.telefono} />
          <DetalleItem etiqueta="Disponibilidad" valor={postulante.disponibilidadResumen} />
        </div>

        <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
          <div>
            <p className="font-medium text-slate-700">Motivación</p>
            <p className="text-slate-600">{postulante.motivacion}</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Experiencia</p>
            <p className="text-slate-600">{postulante.experiencia}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onRechazar}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={onAprobar}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Aprobar / Seleccionar
          </button>
        </div>
      </div>
    </div>
  );
}

function DetalleItem({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{etiqueta}</p>
      <p className="mt-1 text-sm text-slate-800">{valor}</p>
    </div>
  );
}
