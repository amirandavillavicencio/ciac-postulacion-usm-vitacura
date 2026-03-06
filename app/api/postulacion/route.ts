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

export async function POST(request: Request) {
  let step = "start";

  try {
    step = "parse-body";
    const body = await request.json();

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
      nota_asignatura: payload.notaAsignatura,
      prioridad_academica: payload.prioridadAcademica
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

    const disponibilidadRows = payload.disponibilidad.map((item) => ({
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
