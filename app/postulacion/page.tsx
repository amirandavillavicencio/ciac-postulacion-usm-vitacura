"use client";

import { FormEvent, useMemo, useState } from "react";

import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";
import {
  buildAvailabilityMatrix,
  getSelectedAvailabilityFromForm
} from "@/lib/utils/availability";
import type { PostulacionPayload } from "@/types/postulacion";

type SubmitStatus = "idle" | "loading" | "success" | "error";

type ApiErrorDebug = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
  step?: string | null;
  stack?: string | null;
};

type ApiResponse = {
  error?: string;
  debug?: ApiErrorDebug;
};

type FormErrors = Partial<Record<
  | "rut"
  | "nombre"
  | "correo"
  | "telefono"
  | "carrera"
  | "semestre"
  | "tipoPostulacion"
  | "motivacion"
  | "documentos"
  | "disponibilidad",
  string
>>;

const CARRERAS = [
  "Ingeniería Civil Industrial",
  "Ingeniería Comercial",
  "Ingeniería en Aviación Comercial",
  "Técnico Universitario en Administración de Empresas",
  "Programa de Formación de Piloto Comercial"
];

const SEMESTRES = Array.from({ length: 12 }, (_, index) => String(index + 1));

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function PostulacionPage() {
  const matrix = useMemo(() => buildAvailabilityMatrix(), []);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [debugDetails, setDebugDetails] = useState<ApiErrorDebug | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackMessage("");
    setDebugDetails(null);

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    const nombre = String(formData.get("nombre") ?? "").trim();
    const rut = String(formData.get("rut") ?? "").trim();
    const correo = String(formData.get("correo") ?? "").trim();
    const telefono = String(formData.get("telefono") ?? "").trim();
    const carrera = String(formData.get("carrera") ?? "").trim();
    const semestre = String(formData.get("semestre") ?? "").trim();
    const tipoPostulacion = String(formData.get("tipoPostulacion") ?? "").trim();
    const motivacion = String(formData.get("motivacion") ?? "").trim();

    const siga = formData.get("siga");
    const cv = formData.get("cv");
    const disponibilidad = getSelectedAvailabilityFromForm(formData);

    const nextErrors: FormErrors = {};

    if (!rut) nextErrors.rut = "El RUT es obligatorio.";
    if (!nombre) nextErrors.nombre = "El nombre es obligatorio.";
    if (!correo) nextErrors.correo = "El correo es obligatorio.";
    else if (!isValidEmail(correo)) nextErrors.correo = "Ingresa un correo válido.";
    if (!telefono) nextErrors.telefono = "El teléfono es obligatorio.";
    if (!carrera) nextErrors.carrera = "La carrera es obligatoria.";
    if (!semestre) nextErrors.semestre = "El semestre es obligatorio.";
    if (!tipoPostulacion) nextErrors.tipoPostulacion = "El tipo de postulación es obligatorio.";
    if (!motivacion) nextErrors.motivacion = "La motivación es obligatoria.";

    const docsCompleted = [siga, cv].every((file) => file instanceof File && file.size > 0);
    if (!docsCompleted) {
      nextErrors.documentos = "Debes adjuntar los documentos solicitados para enviar la postulación.";
    }

    if (disponibilidad.length === 0) {
      nextErrors.disponibilidad = "Debes seleccionar al menos un tramo de disponibilidad.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitStatus("error");
      setFeedbackMessage("Revisa los campos marcados e intenta nuevamente.");
      return;
    }

    setErrors({});
    setSubmitStatus("loading");

    const payload: PostulacionPayload = {
      nombreCompleto: nombre,
      rut,
      correo,
      telefono,
      carrera,
      semestre: Number(semestre),
      tipoPostulacion: tipoPostulacion as PostulacionPayload["tipoPostulacion"],
      area: String(formData.get("area") ?? "") as PostulacionPayload["area"],
      notaAsignatura: Number(formData.get("nota") ?? 0),
      experiencia: String(formData.get("experiencia") ?? "").trim(),
      motivacion,
      disponibilidad
    };

    const submitFormData = new FormData();
    submitFormData.append("payload", JSON.stringify(payload));
    submitFormData.append("siga", siga as File);
    submitFormData.append("cv", cv as File);

    try {
      const response = await fetch("/api/postulacion", {
        method: "POST",
        body: submitFormData
      });

      let result: ApiResponse | null = null;

      try {
        result = (await response.json()) as ApiResponse;
      } catch {
        result = null;
      }

      if (!response.ok) {
        setSubmitStatus("error");
        setFeedbackMessage(result?.error ?? "No fue posible enviar la postulación.");
        setDebugDetails(result?.debug ?? null);
        return;
      }

      setSubmitStatus("success");
      setFeedbackMessage("¡Postulación enviada correctamente!");
      setDebugDetails(null);
      formElement.reset();
      setErrors({});
    } catch (error) {
      setSubmitStatus("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Error de red al enviar la postulación. Intenta nuevamente.");
      setDebugDetails(
        error instanceof Error
          ? {
              message: error.message,
              details: null,
              hint: null,
              code: null,
              step: "fetch",
              stack: error.stack ?? null
            }
          : null
      );
    }
  }

  return (
    <main className="py-6 sm:py-8 md:py-10">
      <div className="container-page">
        <div className="mb-5 sm:mb-7 md:mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ciac-blue sm:text-sm">
            CIAC USM Vitacura
          </p>
          <h1 className="text-2xl font-bold text-ciac-navy sm:text-3xl md:text-4xl">
            Formulario de postulación
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:mt-3 sm:text-base">
            Completa el formulario para enviar tu postulación al CIAC.
          </p>
        </div>

        <form className="space-y-5 sm:space-y-6 md:space-y-8" onSubmit={handleSubmit}>
          <section className="card p-4 sm:p-5 md:p-6">
            <h2 className="section-title mb-4 text-lg sm:mb-5 sm:text-xl md:mb-6">1. Datos personales</h2>

            <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="nombre">
                  Nombre completo
                </label>
                <input id="nombre" name="nombre" className="input" required />
                {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>}
              </div>

              <div>
                <label className="label" htmlFor="rut">
                  RUT
                </label>
                <input id="rut" name="rut" className="input" placeholder="12.345.678-9" required />
                {errors.rut && <p className="mt-1 text-sm text-red-600">{errors.rut}</p>}
              </div>

              <div>
                <label className="label" htmlFor="correo">
                  Correo institucional
                </label>
                <input id="correo" name="correo" type="email" className="input" required />
                {errors.correo && <p className="mt-1 text-sm text-red-600">{errors.correo}</p>}
              </div>

              <div>
                <label className="label" htmlFor="telefono">
                  Teléfono
                </label>
                <input id="telefono" name="telefono" className="input" required />
                {errors.telefono && <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>}
              </div>

              <div>
                <label className="label" htmlFor="carrera">
                  Carrera
                </label>
                <select id="carrera" name="carrera" className="input" required defaultValue="">
                  <option value="" disabled>
                    Selecciona una carrera
                  </option>
                  {CARRERAS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.carrera && <p className="mt-1 text-sm text-red-600">{errors.carrera}</p>}
              </div>

              <div>
                <label className="label" htmlFor="semestre">
                  Semestre actual
                </label>
                <select id="semestre" name="semestre" className="input" required defaultValue="">
                  <option value="" disabled>
                    Selecciona semestre
                  </option>
                  {SEMESTRES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.semestre && <p className="mt-1 text-sm text-red-600">{errors.semestre}</p>}
              </div>
            </div>
          </section>

          <section className="card p-4 sm:p-5 md:p-6">
            <h2 className="section-title mb-4 text-lg sm:mb-5 sm:text-xl md:mb-6">2. Tipo de postulación</h2>

            <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
              <div>
                <label className="label" htmlFor="tipoPostulacion">
                  Tipo
                </label>
                <select id="tipoPostulacion" name="tipoPostulacion" className="input" required defaultValue="">
                  <option value="" disabled>
                    Selecciona una opción
                  </option>
                  <option value="academico">Tutor académico</option>
                  <option value="administrativo">Apoyo administrativo</option>
                </select>
                {errors.tipoPostulacion && (
                  <p className="mt-1 text-sm text-red-600">{errors.tipoPostulacion}</p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="area">
                  Área principal
                </label>
                <select id="area" name="area" className="input" required>
                  <option value="">Selecciona una opción</option>
                  <option value="matematica">Matemática</option>
                  <option value="fisica_1_2">Física I y II</option>
                  <option value="fisica_120">Física 120</option>
                  <option value="programacion">Programación</option>
                  <option value="quimica">Química</option>
                  <option value="administrativo">Administrativo</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="nota">
                  Nota asignatura relevante
                </label>
                <input id="nota" name="nota" type="number" step="0.1" className="input" required />
              </div>

              <div className="md:col-span-2">
                <label className="label" htmlFor="experiencia">
                  Experiencia previa
                </label>
                <textarea
                  id="experiencia"
                  name="experiencia"
                  className="input min-h-28"
                  placeholder="Ayudantías, tutorías, apoyo administrativo u otras experiencias relevantes"
                  required
                />
              </div>

              <div className="md:col-span-3">
                <label className="label" htmlFor="motivacion">
                  Motivación
                </label>
                <textarea
                  id="motivacion"
                  name="motivacion"
                  className="input min-h-32"
                  placeholder="Explica por qué quieres postular al CIAC"
                  required
                />
                {errors.motivacion && <p className="mt-1 text-sm text-red-600">{errors.motivacion}</p>}
              </div>
            </div>
          </section>

          <section className="card p-4 sm:p-5 md:p-6">
            <h2 className="section-title mb-4 text-lg sm:mb-5 sm:text-xl md:mb-6">3. Disponibilidad horaria</h2>

            <div className="space-y-3 md:hidden">
              {BLOQUES.map((bloque) => (
                <article key={bloque.value} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-800">{bloque.label} ({bloque.rango})</p>
                  <p className="mb-3 text-xs text-slate-500">Selecciona los días para este tramo.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {matrix[bloque.value].map((cell) => (
                      <label
                        key={cell.key}
                        htmlFor={cell.key}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <span>{DIAS_SEMANA.find((dia) => dia.value === cell.day)?.label ?? cell.day}</span>
                        <input
                          id={cell.key}
                          type="checkbox"
                          name={cell.key}
                          value="true"
                          className="h-5 w-5 rounded border-slate-300"
                        />
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full border-separate border-spacing-2">
                <thead>
                  <tr>
                    <th className="rounded-xl bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Tramo
                    </th>
                    {DIAS_SEMANA.map((dia) => (
                      <th
                        key={dia.value}
                        className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-700"
                      >
                        {dia.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BLOQUES.map((bloque) => (
                    <tr key={bloque.value}>
                      <td className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                        <div>{bloque.label} ({bloque.rango})</div>
                      </td>
                      {matrix[bloque.value].map((cell) => (
                        <td
                          key={cell.key}
                          className="rounded-xl bg-white px-4 py-3 text-center ring-1 ring-slate-200"
                        >
                          <input
                            type="checkbox"
                            name={cell.key}
                            value="true"
                            className="h-5 w-5 rounded border-slate-300"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Marca todos los tramos en que realmente podrías trabajar.
            </p>
            {errors.disponibilidad && <p className="mt-2 text-sm font-medium text-red-600">{errors.disponibilidad}</p>}
          </section>

          <section className="card p-4 sm:p-5 md:p-6">
            <h2 className="section-title mb-4 text-lg sm:mb-5 sm:text-xl md:mb-6">4. Documentos</h2>

            <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="siga">
                  Resumen académico SIGA
                </label>
                <input
                  id="siga"
                  name="siga"
                  type="file"
                  className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ciac-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ciac-blue"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="cv">
                  Currículum Vitae
                </label>
                <input
                  id="cv"
                  name="cv"
                  type="file"
                  className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ciac-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ciac-blue"
                  required
                />
              </div>
            </div>
            {errors.documentos && <p className="mt-3 text-sm font-medium text-red-600">{errors.documentos}</p>}
          </section>

          {submitStatus !== "idle" && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                submitStatus === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : submitStatus === "error"
                    ? "bg-red-50 text-red-700"
                    : "bg-slate-100 text-slate-700"
              }`}
              aria-live="polite"
            >
              {submitStatus === "loading" ? "Enviando postulación..." : feedbackMessage}

              {submitStatus === "error" && debugDetails && (
                <pre className="mt-3 overflow-x-auto rounded-lg bg-black/5 p-3 text-xs leading-relaxed">
                  {JSON.stringify(debugDetails, null, 2)}
                </pre>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <button
              type="submit"
              disabled={submitStatus === "loading"}
              className="min-h-11 rounded-xl bg-ciac-blue px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitStatus === "loading" ? "Enviando..." : "Enviar postulación"}
            </button>
            <button
              type="reset"
              disabled={submitStatus === "loading"}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Limpiar formulario
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
