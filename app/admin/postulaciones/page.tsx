"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";
import { createXlsxBuffer, sanitizeSheetName, type ExcelCell, type ExcelSheet } from "@/lib/utils/xlsx";

type AreaInfo = {
  area: string;
  notaAsignatura: number | null;
};

type DisponibilidadInfo = {
  diaSemana: string;
  bloque: string;
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

function formatEstado(estado: string) {
  return estado.charAt(0).toUpperCase() + estado.slice(1);
}

function getTipoBadgeClass(tipo: string) {
  if (tipo === "academico") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (tipo === "administrativo") return "bg-violet-50 text-violet-700 ring-violet-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getEstadoBadgeClass(estado: string) {
  if (estado === "aceptada") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (estado === "rechazada") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (estado === "en revisión") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getRankingRowClass(position: number) {
  if (position === 1) return "bg-amber-50/80";
  if (position === 2) return "bg-slate-100/90";
  if (position === 3) return "bg-orange-50/80";
  return "bg-white";
}

export default function AdminPostulacionesPage() {
  const [postulaciones, setPostulaciones] = useState<PostulacionAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [carreraFilter, setCarreraFilter] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<string>("");
  const [asignaturaFilter, setAsignaturaFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [exportingSql, setExportingSql] = useState(false);

  useEffect(() => {
    async function fetchPostulaciones() {
      const response = await fetch("/api/admin/postulaciones", { cache: "no-store" });
      if (!response.ok) return;

      const data = (await response.json()) as { data: PostulacionAdmin[] };
      console.info("[admin/postulaciones] payload recibido", data.data);
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
      const asignaturaOk = asignaturaFilter
        ? item.areas.some((area) => area.area === asignaturaFilter)
        : true;
      const nombre = item.postulante?.nombreCompleto?.toLowerCase() ?? "";
      const rut = item.postulante?.rut?.toLowerCase() ?? "";
      const searchOk = term ? nombre.includes(term) || rut.includes(term) : true;

      return tipoOk && carreraOk && estadoOk && asignaturaOk && searchOk;
    });
  }, [asignaturaFilter, carreraFilter, estadoFilter, postulaciones, searchFilter, tipoFilter]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const selectedDisponibilidadSet = useMemo(
    () => new Set((selected?.disponibilidad ?? []).map((entry) => `${entry.diaSemana}:${entry.bloque}`)),
    [selected]
  );

  const carreras = [...new Set(postulaciones.map((item) => item.postulante?.carrera).filter(Boolean))] as string[];
  const asignaturas = [...new Set(postulaciones.flatMap((item) => item.areas.map((area) => area.area)))];

  const kpis = useMemo(() => {
    const total = postulaciones.length;
    const academicos = postulaciones.filter((item) => item.tipoPostulacion === "academico").length;
    const administrativos = postulaciones.filter((item) => item.tipoPostulacion === "administrativo").length;
    const revision = postulaciones.filter((item) => item.estado === "en revisión").length;

    return [
      { label: "Total general", value: total },
      { label: "Tutores", value: academicos },
      { label: "Administrativos", value: administrativos },
      { label: "En revisión", value: revision }
    ];
  }, [postulaciones]);

  const ranking = useMemo(() => {
    return [...postulaciones]
      .filter((item) => item.tipoPostulacion === "academico")
      .sort((a, b) => {
        if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;

        const nombreA = a.postulante?.nombreCompleto?.trim().toLocaleLowerCase("es-CL") ?? "";
        const nombreB = b.postulante?.nombreCompleto?.trim().toLocaleLowerCase("es-CL") ?? "";

        return nombreA.localeCompare(nombreB, "es-CL");
      })
      .map((item, index) => ({ ...item, position: index + 1 }));
  }, [postulaciones]);

  function getRankingSubject(item: PostulacionAdmin) {
    if (item.areas.length === 0) return "-";
    if (item.areas.length === 1) return formatArea(item.areas[0].area);
    return "Promedio simple";
  }

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

    return { byTipo, byCarrera, byArea, byEstado, bySemestre };
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

  async function handleDeletePostulacion(id: number) {
    const isConfirmed = window.confirm("¿Seguro que quieres eliminar esta postulación? Esta acción no se puede deshacer.");
    if (!isConfirmed) return;

    const clave = window.prompt("Ingresa la clave para confirmar eliminación:")?.trim() ?? "";

    if (!clave) {
      setDeleteError("Debes ingresar la clave para eliminar la postulación.");
      return;
    }

    setDeleteError("");
    setDeletingId(id);

    const response = await fetch("/api/admin/postulaciones", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, clave })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setDeleteError(payload.error ?? "No fue posible eliminar la postulación.");
      setDeletingId(null);
      return;
    }

    setPostulaciones((current) => {
      const next = current.filter((item) => item.id !== id);
      const stillSelected = next.some((item) => item.id === selectedId);
      setSelectedId(stillSelected ? selectedId : (next[0]?.id ?? null));
      return next;
    });
    setDeletingId(null);
  }

  async function handleExportExcel() {
    if (filtered.length === 0) return;

    setExporting(true);

    const list = [...filtered].sort((a, b) => {
      if (tipoFilter === "academico") return b.rankingScore - a.rankingScore;
      if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
      const nameA = a.postulante?.nombreCompleto?.toLocaleLowerCase("es-CL") ?? "";
      const nameB = b.postulante?.nombreCompleto?.toLocaleLowerCase("es-CL") ?? "";
      return nameA.localeCompare(nameB, "es-CL");
    });

    const summaryHeaders = [
      "Nombre",
      "RUT",
      "Correo",
      "Teléfono",
      "Carrera",
      "Semestre",
      "Tipo de postulación",
      "Asignatura postulada",
      "Nota",
      "Estado",
      "Fecha de postulación"
    ];

    const summaryRows: ExcelCell[][] = [summaryHeaders.map((value) => ({ value, style: 1 }))];

    for (const item of list) {
      summaryRows.push([
        { value: item.postulante?.nombreCompleto ?? "-" },
        { value: item.postulante?.rut ?? "-" },
        { value: item.postulante?.correo ?? "-" },
        { value: item.postulante?.telefono ?? "-" },
        { value: item.postulante?.carrera ?? "-" },
        { value: item.postulante?.semestre ? String(item.postulante.semestre) : "-" },
        { value: formatTipo(item.tipoPostulacion) },
        { value: item.areas.map((area) => formatArea(area.area)).join(", ") || "-" },
        {
          value:
            item.areas.length > 1
              ? item.rankingScore.toFixed(2)
              : item.areas[0]?.notaAsignatura?.toFixed(2) ?? "-"
        },
        { value: formatEstado(item.estado) },
        { value: new Date(item.createdAt).toLocaleString("es-CL") }
      ]);
    }

    const sheets: ExcelSheet[] = [
      {
        name: "RESUMEN",
        columns: [28, 16, 28, 16, 24, 12, 22, 28, 10, 16, 24],
        rows: summaryRows
      }
    ];

    const usedNames = new Set<string>(["RESUMEN"]);

    for (const item of list) {
      const disponibilidadSet = new Set(item.disponibilidad.map((entry) => `${entry.diaSemana}:${entry.bloque}`));
      const rows: ExcelCell[][] = [];

      const addSectionTitle = (title: string) => {
        rows.push([{ value: title, style: 1 }]);
      };

      const addKeyValue = (label: string, value: string) => {
        rows.push([{ value: label, style: 1 }, { value }]);
      };

      addSectionTitle("A. DATOS PERSONALES");
      addKeyValue("Nombre", item.postulante?.nombreCompleto ?? "-");
      addKeyValue("RUT", item.postulante?.rut ?? "-");
      addKeyValue("Correo", item.postulante?.correo ?? "-");
      addKeyValue("Teléfono", item.postulante?.telefono ?? "-");
      rows.push([{ value: "" }]);

      addSectionTitle("B. INFORMACIÓN ACADÉMICA");
      addKeyValue("Carrera", item.postulante?.carrera ?? "-");
      addKeyValue("Semestre", item.postulante?.semestre ? String(item.postulante.semestre) : "-");
      addKeyValue("Tipo de postulación", formatTipo(item.tipoPostulacion));
      addKeyValue("Asignatura postulada", item.areas.map((area) => formatArea(area.area)).join(", ") || "-");
      addKeyValue(
        "Nota",
        item.areas.length > 1
          ? `${item.rankingScore.toFixed(2)} (promedio)`
          : item.areas[0]?.notaAsignatura?.toFixed(2) ?? "-"
      );
      rows.push([{ value: "" }]);

      addSectionTitle("C. ESTADO DE POSTULACIÓN");
      addKeyValue("Estado actual", formatEstado(item.estado));
      addKeyValue("Fecha de postulación", new Date(item.createdAt).toLocaleString("es-CL"));
      rows.push([{ value: "" }]);

      addSectionTitle("D. DISPONIBILIDAD HORARIA");
      rows.push([
        { value: "Bloque", style: 1 },
        ...DIAS_SEMANA.map((dia) => ({ value: dia.label, style: 1 }))
      ]);

      for (const bloque of BLOQUES) {
        rows.push([
          { value: `${bloque.label} (${bloque.rango})`, style: 1 },
          ...DIAS_SEMANA.map((dia) => ({
            value: disponibilidadSet.has(`${dia.value}:${bloque.value}`) ? "✔" : ""
          }))
        ]);
      }

      rows.push([{ value: "" }]);
      addSectionTitle("E. DOCUMENTOS");
      rows.push([
        { value: "Tipo de documento", style: 1 },
        { value: "Nombre de archivo", style: 1 },
        { value: "URL / referencia", style: 1 }
      ]);

      if (item.documentos.length === 0) {
        rows.push([{ value: "Sin documentos" }, { value: "-" }, { value: "-" }]);
      } else {
        for (const doc of item.documentos) {
          rows.push([{ value: doc.tipo }, { value: doc.nombre || "-" }, { value: doc.url || "-" }]);
        }
      }

      const rawName = `${item.postulante?.nombreCompleto?.split(" ")[0] ?? "Postulante"} ${item.postulante?.rut ?? item.id}`;
      let sheetName = sanitizeSheetName(rawName);
      let suffix = 2;

      while (usedNames.has(sheetName)) {
        sheetName = sanitizeSheetName(`${rawName} ${suffix}`);
        suffix += 1;
      }

      usedNames.add(sheetName);

      sheets.push({
        name: sheetName,
        columns: [30, 28, 42, 42, 42, 42],
        rows
      });
    }

    const fileBytes = createXlsxBuffer(sheets);
    const blob = new Blob([fileBytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const suffix = tipoFilter === "academico" ? "tutores" : tipoFilter === "administrativo" ? "administrativos" : "general";
    anchor.href = href;
    anchor.download = `postulaciones_${suffix}.xlsx`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
    setExporting(false);
  }

  async function handleExportSql() {
    setExportingSql(true);

    const response = await fetch("/api/admin/export-sql", { cache: "no-store" });

    if (!response.ok) {
      setExportingSql(false);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "postulantes_ciac_export.sql";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    setExportingSql(false);
  }

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
    <main className="bg-slate-50 py-6 print:bg-white print:py-3 md:py-8">
      <div className="container-page space-y-5 print:space-y-3 md:space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm print:rounded-none print:border-none print:p-0 print:shadow-none md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-5 print:hidden">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 md:flex">
                <Image
                  src="/9164867d-71e4-4978-8a3c-5463f69deaad.png"
                  alt="Logo CIAC"
                  width={44}
                  height={44}
                  className="h-11 w-11 object-contain"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ciac-blue">Panel interno CIAC</p>
                <h1 className="text-2xl font-bold tracking-tight text-ciac-navy md:text-3xl">Gestión de postulantes</h1>
                <p className="max-w-3xl text-sm text-slate-600 md:text-base">
                Revisa postulaciones académicas y administrativas, filtra candidatos y actualiza su estado desde una vista operativa única.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/admin/postulantes/informe-administrativo"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-ciac-blue bg-white px-4 py-2.5 text-sm font-semibold text-ciac-blue transition hover:bg-blue-50"
              >
                Generar informe cobertura admin
              </Link>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting || filtered.length === 0}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? "Exportando..." : "Exportar Excel (.xlsx)"}
              </button>
              <button
                type="button"
                onClick={handleExportSql}
                disabled={exportingSql}
                className="rounded-lg bg-ciac-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingSql ? "Generando SQL..." : "Exportar SQL"}
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
          {kpis.map((item) => (
            <article key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
              <p className="mt-1.5 text-2xl font-bold leading-none text-ciac-navy">{item.value}</p>
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
          </div>
        </section>

        <section className="card p-5 print:hidden md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-ciac-navy">Postulaciones recibidas</h2>
              <p className="text-sm text-slate-500">Selecciona una fila para ver el detalle completo del postulante.</p>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1.5">
              {[
                { value: "", label: "Todos" },
                { value: "academico", label: "Tutores" },
                { value: "administrativo", label: "Administrativos" }
              ].map((tab) => {
                const active = tipoFilter === tab.value;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => setTipoFilter(tab.value)}
                    className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                      active
                        ? "bg-white text-ciac-navy shadow-sm ring-1 ring-slate-200"
                        : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 md:p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Filtros de búsqueda</p>
              <p className="text-xs text-slate-500">{filtered.length} resultados</p>
            </div>
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
              <input
                className="input !py-2.5"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar por nombre o RUT"
              />

              <select className="input !py-2.5" value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}>
                <option value="">Todos los estados</option>
                {ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>

              <select className="input !py-2.5" value={carreraFilter} onChange={(e) => setCarreraFilter(e.target.value)}>
                <option value="">Todas las carreras</option>
                {carreras.map((carrera) => (
                  <option key={carrera} value={carrera}>
                    {carrera}
                  </option>
                ))}
              </select>

              <select
                className="input !py-2.5"
                value={asignaturaFilter}
                onChange={(e) => setAsignaturaFilter(e.target.value)}
                disabled={tipoFilter === "administrativo"}
              >
                <option value="">Todas las asignaturas</option>
                {asignaturas.map((asignatura) => (
                  <option key={asignatura} value={asignatura}>
                    {formatArea(asignatura)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full overflow-hidden bg-white text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-left text-xs uppercase tracking-[0.08em] text-slate-700">
                  <th className="px-4 py-3">Postulante</th>
                  <th className="px-4 py-3">Carrera / semestre</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Asignatura</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-center">Docs</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isSelected = selected?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`cursor-pointer border-t border-slate-100 align-top transition hover:bg-slate-50 ${isSelected ? "bg-blue-50/50 ring-1 ring-inset ring-blue-100" : "bg-white"}`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{item.postulante?.nombreCompleto ?? "-"}</p>
                        <p className="text-xs text-slate-500">{item.postulante?.rut ?? "-"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-700">{item.postulante?.carrera ?? "-"}</p>
                        <p className="text-xs text-slate-500">Semestre: {item.postulante?.semestre ?? "-"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getTipoBadgeClass(item.tipoPostulacion)}`}>
                          {formatTipo(item.tipoPostulacion)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {item.areas.length === 0 && <span className="text-slate-500">-</span>}
                          {item.areas.map((area) => (
                            <span
                              key={`${item.id}-${area.area}`}
                              className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                            >
                              {formatArea(area.area)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{new Date(item.createdAt).toLocaleDateString("es-CL")}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getEstadoBadgeClass(item.estado)}`}>
                          {formatEstado(item.estado)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex min-w-7 items-center justify-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {item.documentos.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-5 print:break-inside-avoid md:p-6">
          <h2 className="section-title mb-4">Detalle de postulante</h2>

          {!selected && <p className="text-sm text-slate-500">No hay postulaciones para los filtros seleccionados.</p>}

          {selected && (
            <div className="space-y-5 text-sm text-slate-700">
              <div className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ciac-navy">Datos personales</h3>
                  <div className="space-y-1.5">
                    <p><strong>Nombre:</strong> {selected.postulante?.nombreCompleto ?? "-"}</p>
                    <p><strong>RUT:</strong> {selected.postulante?.rut ?? "-"}</p>
                    <p><strong>Correo:</strong> {selected.postulante?.correo ?? "-"}</p>
                    <p><strong>Teléfono:</strong> {selected.postulante?.telefono ?? "-"}</p>
                  </div>
                </article>

                <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ciac-navy">Datos académicos</h3>
                  <div className="space-y-1.5">
                    <p><strong>Carrera:</strong> {selected.postulante?.carrera ?? "-"}</p>
                    <p><strong>Semestre:</strong> {selected.postulante?.semestre ?? "-"}</p>
                    <p><strong>Tipo:</strong> {formatTipo(selected.tipoPostulacion)}</p>
                    <p><strong>Asignaturas:</strong> {selected.areas.map((a) => formatArea(a.area)).join(", ") || "-"}</p>
                    <p><strong>Fecha:</strong> {new Date(selected.createdAt).toLocaleString("es-CL")}</p>
                  </div>
                </article>
              </div>

              <article className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ciac-navy">Motivación</h3>
                <p className="whitespace-pre-wrap text-slate-700">{selected.motivacion || "-"}</p>
              </article>

              <article className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ciac-navy">Disponibilidad</h3>
                {selected.disponibilidad.length === 0 && <p className="text-sm text-slate-500">Sin disponibilidad registrada.</p>}
                {selected.disponibilidad.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-[640px] text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-left font-semibold text-slate-700">
                          <th className="px-3 py-2">Bloque</th>
                          {DIAS_SEMANA.map((dia) => (
                            <th key={`disp-head-${dia.value}`} className="px-3 py-2 text-center">
                              {dia.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {BLOQUES.map((bloque) => (
                          <tr key={`disp-row-${bloque.value}`} className="border-t border-slate-200">
                            <td className="px-3 py-2 font-medium text-slate-700">
                              {bloque.label} <span className="text-slate-500">({bloque.rango})</span>
                            </td>
                            {DIAS_SEMANA.map((dia) => (
                              <td key={`disp-cell-${dia.value}-${bloque.value}`} className="px-3 py-2 text-center text-base font-bold text-emerald-600">
                                {selectedDisponibilidadSet.has(`${dia.value}:${bloque.value}`) ? "✔" : ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <article className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ciac-navy">Documentos</h3>
                {selected.documentos.length === 0 && <p className="text-slate-500">No hay documentos registrados.</p>}
                {selected.documentos.length > 0 && (
                  <ul className="space-y-2">
                    {selected.documentos.map((doc, index) => (
                      <li key={`${doc.nombre}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <span className="text-slate-700">
                          <strong className="mr-1 inline-flex rounded bg-slate-200 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-700">{doc.tipo}</strong>
                          {doc.nombre}
                        </span>
                        {doc.url ? (
                          <a
                            className="inline-flex rounded-md border border-ciac-blue px-2.5 py-1 text-xs font-semibold text-ciac-blue transition hover:bg-ciac-blue hover:text-white"
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver documento
                          </a>
                        ) : (
                          <span className="inline-flex rounded-md bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">Sin enlace</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <div className="pt-1 print:hidden">
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

              <div className="pt-2 print:hidden">
                <button
                  type="button"
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={deletingId === selected.id}
                  onClick={() => handleDeletePostulacion(selected.id)}
                >
                  {deletingId === selected.id ? "Eliminando..." : "Eliminar postulación"}
                </button>
                {deleteError ? <p className="mt-2 text-sm text-rose-600">{deleteError}</p> : null}
              </div>
            </div>
          )}
        </section>

        <section className="card p-5 print:break-before-page md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-title">Ranking de tutores por nota</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Ordenado de mayor a menor puntaje</span>
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-3 print:hidden">
            {ranking.slice(0, 3).map((item) => (
              <article key={`top-${item.id}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">#{item.position} destacado</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-ciac-navy">{item.postulante?.nombreCompleto ?? "-"}</p>
                <p className="text-xs text-slate-600">{getRankingSubject(item)} · {item.rankingScore > 0 ? item.rankingScore.toFixed(2) : "-"}</p>
              </article>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-700">
                  <th className="px-4 py-3">Posición</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">RUT</th>
                  <th className="px-4 py-3">Carrera</th>
                  <th className="px-4 py-3">Asignatura</th>
                  <th className="px-4 py-3">Nota</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((item) => (
                  <tr key={item.id} className={`border-t border-slate-200 ${getRankingRowClass(item.position)}`}>
                    <td className="px-4 py-3">
                      <span className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-xs font-bold ${item.position <= 3 ? "bg-ciac-blue text-white" : "bg-slate-200 text-slate-700"}`}>
                        #{item.position}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.postulante?.nombreCompleto ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.postulante?.rut ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{item.postulante?.carrera ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{getRankingSubject(item)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex min-w-16 items-center justify-center rounded-md bg-white px-2.5 py-1 text-base font-bold text-ciac-navy ring-1 ring-slate-200">
                        {item.rankingScore > 0 ? item.rankingScore.toFixed(2) : "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="hidden print:block">
          <h2 className="mb-3 border-b border-slate-300 pb-1.5 text-2xl font-bold text-ciac-navy">Reporte general de postulantes</h2>
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-400 px-2 py-1.5">Nombre</th>
                <th className="border border-slate-400 px-2 py-1.5">RUT</th>
                <th className="border border-slate-400 px-2 py-1.5">Correo</th>
                <th className="border border-slate-400 px-2 py-1.5">Teléfono</th>
                <th className="border border-slate-400 px-2 py-1.5">Carrera</th>
                <th className="border border-slate-400 px-2 py-1.5">Semestre</th>
                <th className="border border-slate-400 px-2 py-1.5">Tipo</th>
                <th className="border border-slate-400 px-2 py-1.5">Estado</th>
                <th className="border border-slate-400 px-2 py-1.5">Fecha</th>
                <th className="border border-slate-400 px-2 py-1.5">Asignatura</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item) => (
                <tr key={`print-${item.id}`}>
                  <td className="border border-slate-300 px-2 py-1">{item.postulante?.nombreCompleto ?? "-"}</td>
                  <td className="border border-slate-300 px-2 py-1">{item.postulante?.rut ?? "-"}</td>
                  <td className="border border-slate-300 px-2 py-1">{item.postulante?.correo ?? "-"}</td>
                  <td className="border border-slate-300 px-2 py-1">{item.postulante?.telefono ?? "-"}</td>
                  <td className="border border-slate-300 px-2 py-1">{item.postulante?.carrera ?? "-"}</td>
                  <td className="border border-slate-300 px-2 py-1">{item.postulante?.semestre ?? "-"}</td>
                  <td className="border border-slate-300 px-2 py-1">{formatTipo(item.tipoPostulacion)}</td>
                  <td className="border border-slate-300 px-2 py-1">{formatEstado(item.estado)}</td>
                  <td className="border border-slate-300 px-2 py-1">{new Date(item.createdAt).toLocaleDateString("es-CL")}</td>
                  <td className="border border-slate-300 px-2 py-1">{item.areas.map((area) => formatArea(area.area)).join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
