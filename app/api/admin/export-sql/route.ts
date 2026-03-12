import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Primitive = string | number | boolean | null;

type TableConfig = {
  name: string;
  columns: string[];
  rows: Record<string, Primitive>[];
};

function escapeSqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function toSqlValue(value: Primitive) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return escapeSqlString(value);
}

function buildInsertStatements(config: TableConfig) {
  if (config.rows.length === 0) {
    return `-- ${config.name}: sin registros para exportar`;
  }

  const columnsSql = config.columns.join(", ");
  const valuesSql = config.rows
    .map((row) => {
      const values = config.columns.map((column) => toSqlValue((row[column] as Primitive) ?? null));
      return `(${values.join(", ")})`;
    })
    .join(",\n");

  return `INSERT INTO ${config.name} (${columnsSql})\nVALUES\n${valuesSql};`;
}

function buildSqlFile(configs: TableConfig[]) {
  const header = [
    "-- Export SQL generado desde /admin/postulantes",
    `-- Fecha: ${new Date().toISOString()}`,
    ""
  ].join("\n");

  const body = configs.map((config) => buildInsertStatements(config)).join("\n\n");
  return `${header}${body}\n`;
}

export async function GET() {
  const supabase = getSupabaseServerClient({ useServiceRole: true });

  const { data: postulaciones, error: postulacionesError } = await supabase
    .from("postulaciones")
    .select("id,postulante_id,tipo_postulacion,motivacion,estado,created_at")
    .order("id", { ascending: true });

  if (postulacionesError) {
    return NextResponse.json({ error: postulacionesError.message }, { status: 500 });
  }

  const postulacionesRows = postulaciones ?? [];
  const postulacionIds = postulacionesRows.map((item) => item.id);
  const postulanteIds = [...new Set(postulacionesRows.map((item) => item.postulante_id).filter(Boolean))];

  const emptyResult = { data: [], error: null };

  const [
    { data: postulantes, error: postulantesError },
    { data: postulacionAreas, error: postulacionAreasError },
    { data: disponibilidadBloques, error: disponibilidadBloquesError }
  ] = await Promise.all([
    postulanteIds.length > 0
      ? supabase
          .from("postulantes")
          .select("id,rut,nombre_completo,correo,telefono,carrera,semestre,created_at")
          .in("id", postulanteIds)
          .order("id", { ascending: true })
      : Promise.resolve(emptyResult),
    postulacionIds.length > 0
      ? supabase
          .from("postulacion_areas")
          .select("id,postulacion_id,area,nota_asignatura,prioridad_academica")
          .in("postulacion_id", postulacionIds)
          .order("id", { ascending: true })
      : Promise.resolve(emptyResult),
    postulacionIds.length > 0
      ? supabase
          .from("disponibilidad_bloques")
          .select("id,postulacion_id,dia_semana,bloque,disponible")
          .in("postulacion_id", postulacionIds)
          .order("id", { ascending: true })
      : Promise.resolve(emptyResult)
  ]);

  const firstError = postulantesError ?? postulacionAreasError ?? disponibilidadBloquesError;

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const sql = buildSqlFile([
    {
      name: "postulantes",
      columns: ["id", "rut", "nombre_completo", "correo", "telefono", "carrera", "semestre", "created_at"],
      rows: (postulantes ?? []) as Record<string, Primitive>[]
    },
    {
      name: "postulaciones",
      columns: ["id", "postulante_id", "tipo_postulacion", "motivacion", "estado", "created_at"],
      rows: postulacionesRows as Record<string, Primitive>[]
    },
    {
      name: "postulacion_areas",
      columns: ["id", "postulacion_id", "area", "nota_asignatura", "prioridad_academica"],
      rows: (postulacionAreas ?? []) as Record<string, Primitive>[]
    },
    {
      name: "disponibilidad_bloques",
      columns: ["id", "postulacion_id", "dia_semana", "bloque", "disponible"],
      rows: (disponibilidadBloques ?? []) as Record<string, Primitive>[]
    }
  ]);

  return new NextResponse(sql, {
    status: 200,
    headers: {
      "Content-Type": "application/sql; charset=utf-8",
      "Content-Disposition": 'attachment; filename="postulantes_ciac_export.sql"',
      "Cache-Control": "no-store"
    }
  });
}
