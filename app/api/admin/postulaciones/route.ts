import { NextResponse } from "next/server";

import { getSupabaseServerClient, getSupabaseServerClientMeta } from "@/lib/supabase/server";
import { normalizeBloqueValue, normalizeDiaSemanaValue, sortBloques } from "@/lib/utils/availability";

const ESTADOS = ["recibida", "en revisión", "aceptada", "rechazada"] as const;

type EstadoPostulacion = (typeof ESTADOS)[number];

function isMissingTableError(message?: string) {
  return typeof message === "string" && message.toLowerCase().includes("does not exist");
}

function isDisponibleValue(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "t" || normalized === "1";
  }

  return false;
}

export async function GET() {
  const supabase = getSupabaseServerClient({ useServiceRole: true });
  const supabaseMeta = getSupabaseServerClientMeta({ useServiceRole: true });
  console.info("[admin/postulaciones] supabase client meta:", {
    keyType: supabaseMeta.keyType,
    projectRef: supabaseMeta.projectRef
  });

  const { data: postulaciones, error: postulacionesError } = await supabase
    .from("postulaciones")
    .select("id,postulante_id,tipo_postulacion,motivacion,estado,created_at")
    .order("created_at", { ascending: false });

  if (postulacionesError) {
    console.error("[admin/postulaciones] postulaciones error:", postulacionesError);
    return NextResponse.json({ error: postulacionesError.message }, { status: 500 });
  }

  console.info("[admin/postulaciones] postulaciones count:", postulaciones?.length ?? 0);

  const postulanteIds = [...new Set((postulaciones ?? []).map((item) => item.postulante_id))].filter(Boolean);
  const postulacionIds = (postulaciones ?? []).map((item) => item.id);
  console.info("[admin/postulaciones] postulacionIds:", postulacionIds);

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
      : Promise.resolve({ data: [], error: null }),
    postulacionIds.length > 0
      ? supabase.from("documentos_postulacion").select("*").in("postulacion_id", postulacionIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (postulantesError || areasError || disponibilidadError) {
    if (postulantesError) console.error("[admin/postulaciones] postulantes error:", postulantesError);
    if (areasError) console.error("[admin/postulaciones] areas error:", areasError);
    if (disponibilidadError) console.error("[admin/postulaciones] disponibilidad error:", disponibilidadError);

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

  console.info("[admin/postulaciones] disponibilidad rows count:", disponibilidad?.length ?? 0);
  if (disponibilidadError) {
    console.error("[admin/postulaciones] disponibilidadError full:", disponibilidadError);
  } else if (!disponibilidad || disponibilidad.length === 0) {
    console.warn("[admin/postulaciones] disponibilidad query returned empty without error");
  } else {
    console.info("[admin/postulaciones] disponibilidad sample:", disponibilidad.slice(0, 10));
  }

  if (docsResult.error && !isMissingTableError(docsResult.error.message)) {
    return NextResponse.json({ error: docsResult.error.message }, { status: 500 });
  }

  const postulantesMap = new Map((postulantes ?? []).map((item) => [item.id, item]));
  const areasMap = new Map<string, { area: string; notaAsignatura: number | null }[]>();
  for (const item of areas ?? []) {
    const postulacionId = String(item.postulacion_id);
    const list = areasMap.get(postulacionId) ?? [];
    list.push({ area: item.area, notaAsignatura: item.nota_asignatura });
    areasMap.set(postulacionId, list);
  }

  const disponibilidadMap = new Map<string, { diaSemana: string; bloque: string }[]>();
  for (const item of disponibilidad ?? []) {
    if (!isDisponibleValue(item.disponible)) continue;

    const bloque = normalizeBloqueValue(item.bloque);
    const diaSemana = normalizeDiaSemanaValue(item.dia_semana);
    if (!bloque || !diaSemana) continue;

    const postulacionId = String(item.postulacion_id);
    const list = disponibilidadMap.get(postulacionId) ?? [];
    list.push({ diaSemana, bloque });
    list.sort((a, b) => sortBloques(a.bloque, b.bloque));
    disponibilidadMap.set(postulacionId, list);
  }

  console.info("[admin/postulaciones] disponibilidadMap keys:", [...disponibilidadMap.keys()].slice(0, 10));

  const documentosMap = new Map<string, { tipo: string; nombre: string; url: string }[]>();
  for (const item of docsResult.data ?? []) {
    const postulacionId = String(item.postulacion_id);
    const list = documentosMap.get(postulacionId) ?? [];
    list.push({
      tipo: item.tipo_documento ?? item.tipo ?? "Documento",
      nombre: item.nombre_archivo ?? item.nombre ?? "Archivo",
      url: item.file_url ?? item.url_publica ?? item.url ?? item.path ?? ""
    });
    documentosMap.set(postulacionId, list);
  }

  const response = (postulaciones ?? []).map((item) => {
    const postulante = postulantesMap.get(item.postulante_id);
    const postulacionId = String(item.id);
    const areasData = areasMap.get(postulacionId) ?? [];

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
      disponibilidad: disponibilidadMap.get(postulacionId) ?? [],
      documentos: documentosMap.get(postulacionId) ?? [],
      rankingScore,
      rankingAreaLabel
    };
  });

  console.info(
    "[admin/postulaciones] response summary:",
    response.slice(0, 50).map((item) => ({
      postulacionId: item.id,
      disponibilidadCount: item.disponibilidad.length
    }))
  );

  return NextResponse.json({ data: response });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: number; estado?: string };

  if (!body?.id || !body.estado || !ESTADOS.includes(body.estado as EstadoPostulacion)) {
    return NextResponse.json({ error: "Datos inválidos para actualizar estado." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient({ useServiceRole: true });

  const { error } = await supabase
    .from("postulaciones")
    .update({ estado: body.estado })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
