import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { validatePostulacionPayload } from "@/lib/validations/postulacion";
import type { DocumentoRequerido } from "@/types/postulacion";

type SupabaseDebugError = {
  message: string;
  details: string | null;
  hint: string | null;
  code: string | null;
  step: string;
  stack: string | null;
};

function buildSupabaseDebugError(
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  },
  step: string
): SupabaseDebugError {
  return {
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
    code: error.code ?? null,
    step,
    stack: null
  };
}

async function fileToDocumento(file: File, tipo: "siga" | "cv"): Promise<DocumentoRequerido> {
  const buffer = await file.arrayBuffer();

  return {
    tipo,
    nombre: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    contentBase64: Buffer.from(buffer).toString("base64")
  };
}

export async function POST(request: Request) {
  let step = "start";

  try {
    step = "parse-form-data";
    const formData = await request.formData();

    const tipoPostulacion = String(formData.get("tipoPostulacion") ?? "").trim();
    const notaNormalizada = String(formData.get("notaNormalizada") ?? "").trim();

    const sigaFile = formData.get("siga");
    const cvFile = formData.get("cv");

    const documentos: DocumentoRequerido[] = [];

    if (sigaFile instanceof File && sigaFile.size > 0) {
      documentos.push(await fileToDocumento(sigaFile, "siga"));
    }

    if (cvFile instanceof File && cvFile.size > 0) {
      documentos.push(await fileToDocumento(cvFile, "cv"));
    }

    const payload = {
      nombreCompleto: String(formData.get("nombre") ?? "").trim(),
      rut: String(formData.get("rut") ?? "").trim(),
      correo: String(formData.get("correo") ?? "").trim(),
      telefono: String(formData.get("telefono") ?? "").trim(),
      carrera: String(formData.get("carrera") ?? "").trim(),
      semestre: Number(formData.get("semestre") ?? 0),
      tipoPostulacion,
      area:
        tipoPostulacion === "administrativo"
          ? "administrativo"
          : String(formData.get("asignatura") ?? "").trim(),
      notaAsignatura:
        tipoPostulacion === "administrativo"
          ? null
          : notaNormalizada
            ? Number(notaNormalizada)
            : null,
      experienciaTutorias: formData.get("tieneExperiencia") === "si",
      experiencia: String(formData.get("experiencia") ?? "").trim(),
      motivacion: String(formData.get("motivacion") ?? "").trim(),
      disponibilidad: JSON.parse(String(formData.get("disponibilidad") ?? "[]")),
      documentos,
      declaracionAceptada: formData.get("declaracion") === "on"
    };

    step = "validate-payload";
    const validation = validatePostulacionPayload(payload);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const validatedPayload = validation.data;

    step = "create-supabase-client";
    const supabase = getSupabaseServerClient();

    step = "find-existing-postulante";
    const { data: existingPostulante, error: existingPostulanteError } = await supabase
      .from("postulantes")
      .select("id")
      .eq("rut", validatedPayload.rut)
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
          rut: validatedPayload.rut,
          nombre_completo: validatedPayload.nombreCompleto,
          correo: validatedPayload.correo,
          telefono: validatedPayload.telefono,
          carrera: validatedPayload.carrera,
          semestre: validatedPayload.semestre
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
        tipo_postulacion: validatedPayload.tipoPostulacion,
        motivacion: validatedPayload.motivacion,
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
      area: validatedPayload.area,
      nota_asignatura: validatedPayload.notaAsignatura
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

    const disponibilidadRows = validatedPayload.disponibilidad.map((item) => ({
      postulacion_id: postulacionId,
      dia_semana: item.diaSemana,
      bloque: item.bloque,
      disponible: true
    }));

    step = "insert-disponibilidad";
    const { error: insertDisponibilidadError } = await supabase
      .from("disponibilidad_bloques")
      .insert(disponibilidadRows);

    if (insertDisponibilidadError) {
      return NextResponse.json(
        {
          error: "No fue posible guardar la disponibilidad.",
          debug: buildSupabaseDebugError(insertDisponibilidadError, step)
        },
        { status: 500 }
      );
    }

    step = "upload-documentos";
    const bucket = process.env.SUPABASE_POSTULACIONES_BUCKET ?? "postulaciones-documentos";

    for (const documento of validatedPayload.documentos) {
      const extension = documento.nombre.includes(".")
        ? documento.nombre.split(".").pop()
        : "bin";
      const cleanRut = validatedPayload.rut.replace(/[^0-9kK]/g, "");
      const path = `${postulacionId}/${documento.tipo}-${cleanRut}-${Date.now()}.${extension}`;
      const binary = Buffer.from(documento.contentBase64, "base64");

      const { data: uploaded, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, binary, {
          contentType: documento.mimeType,
          upsert: false
        });

      if (uploadError) {
        return NextResponse.json(
          {
            error: "No fue posible subir los documentos obligatorios.",
            debug: buildSupabaseDebugError(uploadError, step)
          },
          { status: 500 }
        );
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(uploaded.path);

      const { error: documentError } = await supabase.from("documentos_postulacion").insert({
        postulacion_id: postulacionId,
        tipo_documento: documento.tipo,
        file_url: publicData.publicUrl
      });

      if (documentError) {
        return NextResponse.json(
          {
            error: "No fue posible registrar los documentos de postulación.",
            debug: buildSupabaseDebugError(documentError, "insert-documento")
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, postulacionId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    const stack = error instanceof Error ? error.stack ?? null : null;

    return NextResponse.json(
      {
        error: "No fue posible procesar la postulación.",
        debug: {
          message,
          details: null,
          hint: null,
          code: null,
          step,
          stack
        }
      },
      { status: 500 }
    );
  }
}
