import { NextResponse } from "next/server";

import {
  getSupabaseServerClient,
  getSupabaseServerClientMeta,
} from "@/lib/supabase/server";
import { sortBloques } from "@/lib/utils/availability";

const ESTADOS = ["recibida", "en revisión", "aceptada", "rechazada"] as const;
const DELETE_PASSWORD = "Suna2060";
const DOCUMENTOS_BUCKET = "documentos_postulacion";

type EstadoPostulacion = (typeof ESTADOS)[number];

type AreaItem = {
  area: string;
  notaAsignatura: number | null;
};

type DisponibilidadItem = {
  diaSemana: string;
  bloque: string;
};

type DocumentoItem = {
  tipo: string;
  nombre: string;
  url: string;
};

type DocumentoDeleteRecord = {
  file_url?: string | null;
  url_publica?: string | null;
  url?: string | null;
  path?: string | null;
  file_path?: string | null;
  ruta?: string | null;
};

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

function normalizeDiaSemanaDirect(value: unknown): string | undefined {
  const raw = String(value ?? "").trim().toLowerCase();

  const diaMap: Record<string, string> = {
    lunes: "lunes",
    martes: "martes",
    miercoles: "miercoles",
    miércoles: "miercoles",
    jueves: "jueves",
    viernes: "viernes",
    sabado: "sabado",
    sábado: "sabado",
    domingo: "domingo",
    "1": "lunes",
    "2": "martes",
    "3": "miercoles",
    "4": "jueves",
    "5": "viernes",
    "6": "sabado",
    "7": "domingo",
  };

  return diaMap[raw];
}

function normalizeBloqueDirect(value: unknown): string | undefined {
  const raw = String(value ?? "").trim().toLowerCase();

  const bloqueMap: Record<string, string> = {
    "1": "1-2",
    "2": "3-4",
    "3": "5-6",
    "4": "7-8",
    "5": "9-10",
    "6": "11-12",
    "7": "13-14",
    "1-2": "1-2",
    "3-4": "3-4",
    "5-6": "5-6",
    "7-8": "7-8",
    "9-10": "9-10",
    "11-12": "11-12",
    "13-14": "13-14",
  };

  return bloqueMap[raw];
}

function deriveStoragePath(value: string, bucket: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    const directPath = trimmed.replace(/^\/+/, "");
    const bucketPrefix = `${bucket}/`;
    return directPath.startsWith(bucketPrefix) ? directPath.slice(bucketPrefix.length) : directPath;
  }

  try {
    const url = new URL(trimmed);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const encodedMarker = `/storage/v1/object/public/${bucket}%2F`;

    if (url.pathname.includes(marker)) {
      return decodeURIComponent(url.pathname.split(marker)[1] ?? "");
    }

    if (url.pathname.includes(encodedMarker)) {
      return decodeURIComponent(url.pathname.split(encodedMarker)[1] ?? "");
    }

    const genericMarker = `/storage/v1/object/public/`;
    if (!url.pathname.includes(genericMarker)) return null;

    const fullPath = decodeURIComponent(url.pathname.split(genericMarker)[1] ?? "").replace(/^\/+/, "");
    const bucketPrefix = `${bucket}/`;
    return fullPath.startsWith(bucketPrefix) ? fullPath.slice(bucketPrefix.length) : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const supabase = getSupabaseServerClient({ useServiceRole: true });

  console.info(
    "[admin/postulaciones] Supabase client",
    getSupabaseServerClientMeta({ useServiceRole: true })
  );

  const { data: postulaciones, error: postulacionesError } = await supabase
    .from("postulaciones")
    .select("id,postulante_id,tipo_postulacion,motivacion,estado,created_at")
    .order("created_at", { ascending: false });

  if (postulacionesError) {
    return NextResponse.json({ error: postulacionesError.message }, { status: 500 });
  }

  const postulacionesData = postulaciones ?? [];
  const postulanteIds = [
    ...new Set(postulacionesData.map((item) => item.postulante_id).filter(Boolean)),
  ];
  const postulacionIds = postulacionesData.map((item) => item.id);

  const emptyResult = { data: [], error: null };

  const [
    { data: postulantes, error: postulantesError },
    { data: areas, error: areasError },
    { data: disponibilidad, error: disponibilidadError },
    docsResult,
  ] = await Promise.all([
    postulanteIds.length > 0
      ? supabase
          .from("postulantes")
          .select("id,nombre_completo,rut,correo,telefono,carrera,semestre")
          .in("id", postulanteIds)
      : Promise.resolve(emptyResult),

    postulacionIds.length > 0
      ? supabase
          .from("postulacion_areas")
          .select("postulacion_id,area,nota_asignatura")
          .in("postulacion_id", postulacionIds)
      : Promise.resolve(emptyResult),

    postulacionIds.length > 0
      ? supabase
          .from("disponibilidad_bloques")
          .select("postulacion_id,dia_semana,bloque,disponible")
          .in("postulacion_id", postulacionIds)
      : Promise.resolve(emptyResult),

    postulacionIds.length > 0
      ? supabase.from("documentos_postulacion").select("*").in("postulacion_id", postulacionIds)
      : Promise.resolve(emptyResult),
  ]);

  if (postulantesError || areasError || disponibilidadError) {
    return NextResponse.json(
      {
        error:
          postulantesError?.message ??
          areasError?.message ??
          disponibilidadError?.message ??
          "No fue posible cargar las postulaciones",
      },
      { status: 500 }
    );
  }

  if (docsResult.error && !isMissingTableError(docsResult.error.message)) {
    return NextResponse.json({ error: docsResult.error.message }, { status: 500 });
  }

  console.info("[admin/postulaciones] disponibilidad rows", {
    count: disponibilidad?.length ?? 0,
    sample: (disponibilidad ?? []).slice(0, 10),
  });

  const postulantesMap = new Map((postulantes ?? []).map((item) => [item.id, item]));

  const areasMap = new Map<string, AreaItem[]>();
  for (const item of areas ?? []) {
    const postulacionId = String(item.postulacion_id);
    const list = areasMap.get(postulacionId) ?? [];
    list.push({
      area: item.area,
      notaAsignatura: item.nota_asignatura,
    });
    areasMap.set(postulacionId, list);
  }

  const disponibilidadMap = new Map<string, DisponibilidadItem[]>();
  for (const item of disponibilidad ?? []) {
    if (!isDisponibleValue(item.disponible)) continue;

    const diaSemana = normalizeDiaSemanaDirect(item.dia_semana);
    const bloque = normalizeBloqueDirect(item.bloque);

    if (!diaSemana || !bloque) {
      console.info("[admin/postulaciones] disponibilidad descartada", {
        postulacionId: item.postulacion_id,
        dia_semana: item.dia_semana,
        bloque: item.bloque,
        disponible: item.disponible,
        diaSemanaNormalizado: diaSemana,
        bloqueNormalizado: bloque,
      });
      continue;
    }

    const postulacionId = String(item.postulacion_id);
    const list = disponibilidadMap.get(postulacionId) ?? [];
    list.push({ diaSemana, bloque });
    list.sort((a, b) => sortBloques(a.bloque, b.bloque));
    disponibilidadMap.set(postulacionId, list);
  }

  const documentosMap = new Map<string, DocumentoItem[]>();
  for (const item of docsResult.data ?? []) {
    const postulacionId = String(item.postulacion_id);
    const list = documentosMap.get(postulacionId) ?? [];
    list.push({
      tipo: item.tipo_documento ?? item.tipo ?? "Documento",
      nombre: item.nombre_archivo ?? item.nombre ?? "Archivo",
      url: item.file_url ?? item.url_publica ?? item.url ?? item.path ?? "",
    });
    documentosMap.set(postulacionId, list);
  }

  const response = postulacionesData.map((item) => {
    const postulante = postulantesMap.get(item.postulante_id);
    const postulacionId = String(item.id);
    const areasData = areasMap.get(postulacionId) ?? [];

    const areasConNota = areasData.filter(
      (entry): entry is { area: string; notaAsignatura: number } =>
        typeof entry.notaAsignatura === "number"
    );

    const rankingScore =
      areasConNota.length > 0
        ? areasConNota.reduce((acc, entry) => acc + entry.notaAsignatura, 0) /
          areasConNota.length
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
            semestre: postulante.semestre,
          }
        : null,
      areas: areasData,
      disponibilidad: disponibilidadMap.get(postulacionId) ?? [],
      documentos: documentosMap.get(postulacionId) ?? [],
      rankingScore,
      rankingAreaLabel,
    };
  });

  console.info(
    "[admin/postulaciones] Disponibilidad por postulación",
    response.map((item) => ({
      postulacionId: item.id,
      disponibilidadCount: item.disponibilidad.length,
      disponibilidad: item.disponibilidad,
    }))
  );

  return NextResponse.json({ data: response });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: number; estado?: string };

  if (!body?.id || !body.estado || !ESTADOS.includes(body.estado as EstadoPostulacion)) {
    return NextResponse.json(
      { error: "Datos inválidos para actualizar estado." },
      { status: 400 }
    );
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

export async function DELETE(request: Request) {
  const body = (await request.json()) as { id?: number; clave?: string };
  const postulacionId = Number(body?.id);

  if (!Number.isInteger(postulacionId) || postulacionId <= 0 || !body?.clave) {
    return NextResponse.json({ error: "Datos inválidos para eliminar postulación." }, { status: 400 });
  }

  if (body.clave !== DELETE_PASSWORD) {
    return NextResponse.json({ error: "Clave incorrecta." }, { status: 403 });
  }

  const supabase = getSupabaseServerClient({ useServiceRole: true });

  const { data: documentos, error: documentosError } = await supabase
    .from("documentos_postulacion")
    .select("file_url,url_publica,url,path,file_path,ruta")
    .eq("postulacion_id", postulacionId);

  if (documentosError && !isMissingTableError(documentosError.message)) {
    return NextResponse.json({ error: documentosError.message }, { status: 500 });
  }

  const storagePaths = new Set<string>();
  for (const documento of (documentos ?? []) as DocumentoDeleteRecord[]) {
    const candidates = [
      documento.path,
      documento.file_path,
      documento.ruta,
      documento.file_url,
      documento.url_publica,
      documento.url,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const path = deriveStoragePath(candidate, DOCUMENTOS_BUCKET);
      if (path) storagePaths.add(path);
    }
  }

  if (storagePaths.size > 0) {
    const { error: storageError } = await supabase.storage
      .from(DOCUMENTOS_BUCKET)
      .remove([...storagePaths]);

    if (storageError) {
      console.warn("[admin/postulaciones] No fue posible eliminar archivos de storage", {
        postulacionId,
        error: storageError.message,
      });
    }
  }

  const { error: disponibilidadError } = await supabase
    .from("disponibilidad_bloques")
    .delete()
    .eq("postulacion_id", postulacionId);

  if (disponibilidadError) {
    return NextResponse.json({ error: disponibilidadError.message }, { status: 500 });
  }

  const { error: areasError } = await supabase
    .from("postulacion_areas")
    .delete()
    .eq("postulacion_id", postulacionId);

  if (areasError) {
    return NextResponse.json({ error: areasError.message }, { status: 500 });
  }

  const { error: documentosDeleteError } = await supabase
    .from("documentos_postulacion")
    .delete()
    .eq("postulacion_id", postulacionId);

  if (documentosDeleteError && !isMissingTableError(documentosDeleteError.message)) {
    return NextResponse.json({ error: documentosDeleteError.message }, { status: 500 });
  }

  const { error: postulacionError } = await supabase.from("postulaciones").delete().eq("id", postulacionId);

  if (postulacionError) {
    return NextResponse.json({ error: postulacionError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
