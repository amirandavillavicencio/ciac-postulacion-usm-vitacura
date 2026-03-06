import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { validatePostulacionPayload } from "@/lib/validations/postulacion";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validatePostulacionPayload(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const payload = validation.data;
    const supabase = getSupabaseServerClient();
    const normalizedRut = payload.rut.trim();

    const { data: existingPostulante, error: existingPostulanteError } = await supabase
      .from("postulantes")
      .select("id")
      .eq("rut", normalizedRut)
      .maybeSingle();

    const isPostulanteNotFound =
      existingPostulanteError?.code === "PGRST116" ||
      existingPostulanteError?.message.toLowerCase().includes("0 rows");

    if (existingPostulanteError && !isPostulanteNotFound) {
      console.error("Error consultando postulante existente", {
        message: existingPostulanteError.message,
        details: existingPostulanteError.details,
        hint: existingPostulanteError.hint,
        code: existingPostulanteError.code
      });

      return NextResponse.json(
        {
          error: "No fue posible consultar postulante existente.",
          debug: {
            message: existingPostulanteError.message,
            details: existingPostulanteError.details,
            hint: existingPostulanteError.hint,
            code: existingPostulanteError.code
          }
        },
        { status: 500 }
      );
    }

    let postulanteId = existingPostulante?.id;

    if (!postulanteId) {
      const { data: insertedPostulante, error: insertPostulanteError } = await supabase
        .from("postulantes")
        .insert({
          rut: normalizedRut,
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
          { error: "No fue posible crear postulante.", details: insertPostulanteError.message },
          { status: 500 }
        );
      }

      postulanteId = insertedPostulante.id;
    }

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
        { error: "No fue posible crear postulación.", details: insertPostulacionError.message },
        { status: 500 }
      );
    }

    const postulacionId = insertedPostulacion.id;

    const { error: insertAreaError } = await supabase.from("postulacion_areas").insert({
      postulacion_id: postulacionId,
      area: payload.area,
      nota_asignatura: payload.notaAsignatura,
      prioridad_academica: payload.prioridadAcademica
    });

    if (insertAreaError) {
      return NextResponse.json(
        { error: "No fue posible guardar el área de postulación.", details: insertAreaError.message },
        { status: 500 }
      );
    }

    const disponibilidadRows = payload.disponibilidad.map((item) => ({
      postulacion_id: postulacionId,
      dia_semana: item.diaSemana,
      bloque: item.bloque,
      disponible: true
    }));

    const { error: insertDisponibilidadError } = await supabase
      .from("disponibilidad_bloques")
      .insert(disponibilidadRows);

    if (insertDisponibilidadError) {
      return NextResponse.json(
        {
          error: "No fue posible guardar la disponibilidad.",
          details: insertDisponibilidadError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, postulacionId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json(
      { error: "No fue posible procesar la postulación.", details: message },
      { status: 500 }
    );
  }
}
