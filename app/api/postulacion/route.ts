import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { validatePostulacionPayload } from "@/lib/validations/postulacion";

type SupabaseDebugError = {
  message: string;
  details: string | null;
  hint: string | null;
  code: string | null;
  step: string;
  stack: string | null;
};

type DocumentoPostulacion = {
  tipoDocumento: string;
  fileUrl: string;
};

function buildSupabaseDebugError(error: {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}, step: string): SupabaseDebugError {
  return {
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
    code: error.code ?? null,
    step,
    stack: null
  };
}

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();
}

function mapBloqueToLegacyNumericValue(bloque: string): number {
  const [firstPart] = bloque.split("-");
  if (bloque === "almuerzo") return 0;

  const parsed = Number(firstPart);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function uploadDocument(
  postulacionId: number,
  tipoDocumento: string,
  file: File,
  bucket: string
): Promise<DocumentoPostulacion | null> {
  if (!(file instanceof File) || file.size <= 0) return null;

  const supabase = getSupabaseServerClient();
  const extension = file.name.split(".").pop() ?? "bin";
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));
  const path = `postulaciones/${postulacionId}/${tipoDocumento}-${Date.now()}-${safeName}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream"
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    tipoDocumento,
    fileUrl: publicData.publicUrl
  };
}

export async function POST(request: Request) {
  let step = "start";

  try {
    step = "read-body";
    const contentType = request.headers.get("content-type") ?? "";

    let body: unknown;
    let sigaFile: File | null = null;
    let cvFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const payloadRaw = formData.get("payload");

      if (typeof payloadRaw !== "string") {
        return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
      }

      body = JSON.parse(payloadRaw);
      sigaFile = formData.get("siga") as File | null;
      cvFile = formData.get("cv") as File | null;
    } else {
      body = await request.json();
    }

    step = "validate-payload";
    const validation = validatePostulacionPayload(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const payload = validation.data;

    step = "create-supabase-client";
    const supabase = getSupabaseServerClient();

    step = "find-existing-postulante";
    const { data: existingPostulante, error: existingPostulanteError } = await supabase
      .from("postulantes")
      .select("id")
      .eq("rut", payload.rut)
      .limit(1)
      .maybeSingle();

    if (existingPostulanteError && existingPostulanteError.code !== "PGRST116") {
      return NextResponse.json(
        {
          error: "No fue posible consultar postulante existente.",
          debug: buildSupabaseDebugError(existingPostulanteError, step)
        },
        { status: 500 }
      );
    }

    let postulanteId = existingPostulante?.id;

    if (!postulanteId) {
      step = "insert-postulante";
      const { data: insertedPostulante, error: insertPostulanteError } = await supabase
        .from("postulantes")
        .insert({
          rut: payload.rut,
          nombre_completo: payload.nombreCompleto,
          correo: payload.correo,
          telefono: payload.telefono,
          carrera: payload.carrera,
          semestre: payload.semestre
        })
        .select("id")
        .single();

      if (insertPostulanteError) {
        return NextResponse.json(
          {
            error: "No fue posible crear postulante.",
            debug: buildSupabaseDebugError(insertPostulanteError, step)
          },
          { status: 500 }
        );
      }

      postulanteId = insertedPostulante.id;
    }

    step = "insert-postulacion";
    const { data: insertedPostulacion, error: insertPostulacionError } = await supabase
      .from("postulaciones")
      .insert({
        postulante_id: postulanteId,
        tipo_postulacion: payload.tipoPostulacion,
        motivacion: payload.motivacion,
        estado: "recibida"
      })
      .select("id")
      .single();

    if (insertPostulacionError) {
      return NextResponse.json(
        {
          error: "No fue posible crear postulación.",
          debug: buildSupabaseDebugError(insertPostulacionError, step)
        },
        { status: 500 }
      );
    }

    const postulacionId = insertedPostulacion.id;

    step = "insert-area";
    const { error: insertAreaError } = await supabase.from("postulacion_areas").insert({
      postulacion_id: postulacionId,
      area: payload.area,
      nota_asignatura: payload.notaAsignatura
    });

    if (insertAreaError) {
      return NextResponse.json(
        {
          error: "No fue posible guardar el área de postulación.",
          debug: buildSupabaseDebugError(insertAreaError, step)
        },
        { status: 500 }
      );
    }

    step = "insert-disponibilidad";
    const rows = payload.disponibilidad.map((item) => ({
      postulacion_id: postulacionId,
      dia_semana: item.diaSemana,
      bloque: item.bloque,
      disponible: true
    }));

    let { error: insertDisponibilidadError } = await supabase.from("disponibilidad_bloques").insert(rows);

    if (insertDisponibilidadError?.code === "22P02") {
      const legacyRows = payload.disponibilidad.map((item) => ({
        postulacion_id: postulacionId,
        dia_semana: item.diaSemana,
        bloque: mapBloqueToLegacyNumericValue(item.bloque),
        disponible: true
      }));

      const fallbackInsert = await supabase.from("disponibilidad_bloques").insert(legacyRows);
      insertDisponibilidadError = fallbackInsert.error;
    }

    if (insertDisponibilidadError) {
      return NextResponse.json(
        {
          error: "No fue posible guardar la disponibilidad.",
          debug: buildSupabaseDebugError(insertDisponibilidadError, step)
        },
        { status: 500 }
      );
    }

    if (sigaFile || cvFile) {
      step = "upload-documentos";
      const bucket = process.env.SUPABASE_DOCUMENTS_BUCKET ?? "documentos_postulacion";
      const uploaded = (
        await Promise.all([
          uploadDocument(postulacionId, "resumen_siga", sigaFile as File, bucket),
          uploadDocument(postulacionId, "curriculum_vitae", cvFile as File, bucket)
        ])
      ).filter((item): item is DocumentoPostulacion => Boolean(item));

      if (uploaded.length > 0) {
        step = "insert-documentos";
        const { error: insertDocsError } = await supabase.from("documentos_postulacion").insert(
          uploaded.map((item) => ({
            postulacion_id: postulacionId,
            tipo_documento: item.tipoDocumento,
            file_url: item.fileUrl
          }))
        );

        if (insertDocsError) {
          return NextResponse.json(
            {
              error: "La postulación se guardó, pero no fue posible registrar los documentos.",
              debug: buildSupabaseDebugError(insertDocsError, step)
            },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "El cuerpo de la solicitud no es JSON válido.",
          debug: {
            message: error.message,
            details: null,
            hint: null,
            code: null,
            step,
            stack: error.stack ?? null
          }
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "No fue posible procesar la postulación.",
          debug: {
            message: error.message,
            details: null,
            hint: null,
            code: null,
            step,
            stack: error.stack ?? null
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Error inesperado al procesar la postulación." }, { status: 500 });
  }
}
