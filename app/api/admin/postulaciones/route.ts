import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeBloqueValue, sortBloques } from "@/lib/utils/availability";

const ESTADOS = ["recibida", "en revisión", "aceptada", "rechazada"] as const;

type EstadoPostulacion = (typeof ESTADOS)[number];

function isMissingTableError(message?: string) {
  return typeof message === "string" && message.toLowerCase().includes("does not exist");
}

export async function GET() {
  const supabase = getSupabaseServerClient();

  const { data: postulaciones, error: postulacionesError } = await supabase
    .from("postulaciones")
    .select("id,postulante_id,tipo_postulacion,motivacion,estado,created_at")
    .order("created_at", { ascending: false });

  if (postulacionesError) {
    return NextResponse.json({ error: postulacionesError.message }, { status: 500 });
  }

  const postulanteIds = [...new Set((postulaciones ?? []).map((item) => item.postulante_id))].filter(Boolean);
  const postulacionIds = (postulaciones ?? []).map((item) => item.id);

  const [
    { data: postulantes, error: postulantesError },
    { data: areas, error: areasError },
    { data: disponibilidad, error: disponibilidadError },
    docsResult
  ] = await Promise.all([
    postulanteIds.length > 0
      ? supabase
          .from("postulantes")
          .select("id,nombre_completo,rut,correo,telefono,carrera,semestre")
          .in("id", postulanteIds)
      : Promise.resolve({ data: [], error: null }),
    postulacionIds.length > 0
      ? supabase
          .from("postulacion_areas")
          .select("postulacion_id,area,nota_asignatura")
          .in("postulacion_id", postulacionIds)
      : Promise.resolve({ data: [], error: null }),
    postulacionIds.length > 0
      ? supabase
          .from("disponibilidad_bloques")
          .select("postulacion_id,dia_semana,bloque,disponible")
          .in("postulacion_id", postulacionIds)
          .eq("disponible", true)
      : Promise.resolve({ data: [], error: null }),
    postulacionIds.length > 0
      ? supabase.from("documentos_postulacion").select("*").in("postulacion_id", postulacionIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (postulantesError || areasError || disponibilidadError) {
    return NextResponse.json(
      {
        error:
          postulantesError?.message ??
          areasError?.message ??
          disponibilidadError?.message ??
          "No fue posible cargar las postulaciones"
      },
      { status: 500 }
    );
  }

  if (docsResult.error && !isMissingTableError(docsResult.error.message)) {
    return NextResponse.json({ error: docsResult.error.message }, { status: 500 });
  }

  const postulantesMap = new Map((postulantes ?? []).map((item) => [item.id, item]));
  const areasMap = new Map<number, { area: string; notaAsignatura: number | null }[]>();
  for (const item of areas ?? []) {
    const list = areasMap.get(item.postulacion_id) ?? [];
    list.push({ area: item.area, notaAsignatura: item.nota_asignatura });
    areasMap.set(item.postulacion_id, list);
  }

  const disponibilidadMap = new Map<number, { diaSemana: string; bloque: string }[]>();
  for (const item of disponibilidad ?? []) {
    const bloque = normalizeBloqueValue(item.bloque);
    if (!bloque) continue;

    const list = disponibilidadMap.get(item.postulacion_id) ?? [];
    list.push({ diaSemana: item.dia_semana, bloque });
    list.sort((a, b) => sortBloques(a.bloque, b.bloque));
    disponibilidadMap.set(item.postulacion_id, list);
  }

  const documentosMap = new Map<number, { tipo: string; nombre: string; url: string }[]>();
  for (const item of docsResult.data ?? []) {
    const list = documentosMap.get(item.postulacion_id) ?? [];
    list.push({
      tipo: item.tipo_documento ?? item.tipo ?? "Documento",
      nombre: item.nombre_archivo ?? item.nombre ?? "Archivo",
      url: item.url_publica ?? item.url ?? item.path ?? ""
    });
    documentosMap.set(item.postulacion_id, list);
  }

  const response = (postulaciones ?? []).map((item) => {
    const postulante = postulantesMap.get(item.postulante_id);
    const areasData = areasMap.get(item.id) ?? [];

    const areasConNota = areasData.filter((entry): entry is { area: string; notaAsignatura: number } =>
      typeof entry.notaAsignatura === "number"
    );

    const rankingScore =
      areasConNota.length > 0
        ? areasConNota.reduce((acc, entry) => acc + entry.notaAsignatura, 0) / areasConNota.length
        : 0;

    const rankingAreaLabel =
      areasConNota.length === 1
        ? areasConNota[0].area
        : areasConNota.length > 1
          ? "Promedio de asignaturas"
          : areasData[0]?.area ?? "";

    return {
      id: item.id,
      tipoPostulacion: item.tipo_postulacion,
      motivacion: item.motivacion,
      estado: item.estado,
      createdAt: item.created_at,
      postulante: postulante
        ? {
            nombreCompleto: postulante.nombre_completo,
            rut: postulante.rut,
            correo: postulante.correo,
            telefono: postulante.telefono,
            carrera: postulante.carrera,
            semestre: postulante.semestre
          }
        : null,
      areas: areasData,
      disponibilidad: disponibilidadMap.get(item.id) ?? [],
      documentos: documentosMap.get(item.id) ?? [],
      rankingScore,
      rankingAreaLabel
    };
  });

  return NextResponse.json({ data: response });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: number; estado?: string };

  if (!body?.id || !body.estado || !ESTADOS.includes(body.estado as EstadoPostulacion)) {
    return NextResponse.json({ error: "Datos inválidos para actualizar estado." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("postulaciones")
    .update({ estado: body.estado })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
