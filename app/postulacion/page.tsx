"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";
import {
  buildAvailabilityMatrix,
  getSelectedAvailabilityFromForm
} from "@/lib/utils/availability";

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

type FormErrors = Partial<
  Record<
    | "rut"
    | "nombre"
    | "correo"
    | "telefono"
    | "carrera"
    | "semestre"
    | "tipoPostulacion"
    | "asignatura"
    | "nota"
    | "motivacion"
    | "documentos"
    | "declaracion",
    string
  >
>;

const CARRERAS = [
  "Ingeniería Civil Industrial",
  "Ingeniería Comercial",
  "Ingeniería en Aviación Comercial",
  "Técnico Universitario en Administración de Empresas",
  "Programa de Formación de Piloto Comercial"
];

const ASIGNATURAS = [
  { value: "matematicas_i", label: "Matemáticas I" },
  { value: "matematicas_ii", label: "Matemáticas II" },
  { value: "matematicas_iii", label: "Matemáticas III" },
  { value: "matematicas_iv", label: "Matemáticas IV" },
  { value: "fisica_i", label: "Física I" },
  { value: "fisica_ii", label: "Física II" },
  { value: "fisica_120", label: "Física 120" },
  { value: "quimica", label: "Química" },
  { value: "programacion", label: "Programación" }
];

const SEMESTRES = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeNota(raw: string): number | null {
  const normalized = raw.replace(",", ".").trim();
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 1 || value > 7) return null;
  return Math.round(value * 100) / 100;
}

export default function PostulacionPage() {
  const matrix = useMemo(() => buildAvailabilityMatrix(), []);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [debugDetails, setDebugDetails] = useState<ApiErrorDebug | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [tipoPostulacion, setTipoPostulacion] = useState<string>("");
  const [tieneExperiencia, setTieneExperiencia] = useState<"si" | "no">("no");
  const [notaInput, setNotaInput] = useState<string>("");
  const [sigaFilename, setSigaFilename] = useState<string>("");
  const [cvFilename, setCvFilename] = useState<string>("");

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void
  ) {
    const file = event.target.files?.[0];
    setter(file ? file.name : "");
  }

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
    const currentTipoPostulacion = String(formData.get("tipoPostulacion") ?? "").trim();
    const asignatura = String(formData.get("asignatura") ?? "").trim();
    const motivacion = String(formData.get("motivacion") ?? "").trim();
    const declaracion = formData.get("declaracion");

    const siga = formData.get("siga");
    const cv = formData.get("cv");

    const nextErrors: FormErrors = {};

    if (!rut) nextErrors.rut = "El RUT es obligatorio.";
    if (!nombre) nextErrors.nombre = "El nombre es obligatorio.";
    if (!correo) nextErrors.correo = "El correo es obligatorio.";
    else if (!isValidEmail(correo)) nextErrors.correo = "Ingresa un correo válido.";
    if (!telefono) nextErrors.telefono = "El teléfono es obligatorio.";
    if (!carrera) nextErrors.carrera = "La carrera es obligatoria.";
    if (!semestre) nextErrors.semestre = "El semestre es obligatorio.";
    if (!currentTipoPostulacion) nextErrors.tipoPostulacion = "El tipo de postulación es obligatorio.";

    const isAcademico = currentTipoPostulacion === "academico";

    if (isAcademico && !asignatura) {
      nextErrors.asignatura = "Debes seleccionar una asignatura para tutor académico.";
    }

    if (isAcademico) {
      const notaValue = normalizeNota(String(formData.get("nota") ?? ""));
      if (notaValue === null) {
        nextErrors.nota = "Ingresa una nota válida entre 1.0 y 7.0 (usa coma o punto).";
      }
    }

    if (!motivacion) nextErrors.motivacion = "La motivación es obligatoria.";

    const docsCompleted = [siga, cv].every((file) => file instanceof File && file.size > 0);
    const docsWithinSize = [siga, cv].every(
      (file) => file instanceof File && file.size > 0 && file.size <= MAX_FILE_SIZE_BYTES
    );

    if (!docsCompleted) {
      nextErrors.documentos = "Debes adjuntar los documentos solicitados para enviar la postulación.";
    } else if (!docsWithinSize) {
      nextErrors.documentos = `Cada documento debe pesar como máximo ${MAX_FILE_SIZE_MB}MB.`;
    }

    if (declaracion !== "on") {
      nextErrors.declaracion = "Debes aceptar la declaración antes de enviar.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitStatus("error");
      setFeedbackMessage("Revisa los campos marcados e intenta nuevamente.");
      return;
    }

    setErrors({});
    setSubmitStatus("loading");

    const disponibilidad = getSelectedAvailabilityFromForm(formData);
    if (disponibilidad.length === 0) {
      setSubmitStatus("error");
      setFeedbackMessage("Debes seleccionar al menos un bloque de disponibilidad.");
      return;
    }

    formData.set("disponibilidad", JSON.stringify(disponibilidad));

    const notaNormalizada = normalizeNota(String(formData.get("nota") ?? ""));
    formData.set("notaNormalizada", notaNormalizada !== null ? String(notaNormalizada) : "");

    if (!isAcademico) {
      formData.set("asignatura", "");
      formData.set("notaNormalizada", "");
    }

    try {
      const response = await fetch("/api/postulacion", {
        method: "POST",
        body: formData
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
      setTipoPostulacion("");
      setTieneExperiencia("no");
      setNotaInput("");
      setSigaFilename("");
      setCvFilename("");
      setErrors({});
    } catch (error) {
      setSubmitStatus("error");
      setFeedbackMessage(
        error instanceof Error ? error.message : "Error de red al enviar la postulación. Intenta nuevamente."
      );
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

  const isAcademico = tipoPostulacion === "academico";

  return (
    <main className="py-10">
      <div className="container-page">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-ciac-blue">
            CIAC USM Vitacura
          </p>
          <h1 className="text-3xl font-bold text-ciac-navy md:text-4xl">Formulario de postulación</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Completa el formulario para enviar tu postulación al CIAC.
          </p>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
          <section className="card p-6">
            <h2 className="section-title mb-6">1. Datos personales</h2>

            <div className="grid gap-5 md:grid-cols-2">
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
            </div>
          </section>

          <section className="card p-6">
            <h2 className="section-title mb-6">2. Datos académicos</h2>

            <div className="grid gap-5 md:grid-cols-2">
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

          <section className="card p-6">
            <h2 className="section-title mb-6">3. Tipo de postulación</h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="tipoPostulacion">
                  Tipo
                </label>
                <select
                  id="tipoPostulacion"
                  name="tipoPostulacion"
                  className="input"
                  required
                  defaultValue=""
                  onChange={(event) => setTipoPostulacion(event.target.value)}
                >
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

              {isAcademico ? (
                <>
                  <div>
                    <label className="label" htmlFor="asignatura">
                      Asignatura a la que postula
                    </label>
                    <select id="asignatura" name="asignatura" className="input" defaultValue="">
                      <option value="" disabled>
                        Selecciona asignatura
                      </option>
                      {ASIGNATURAS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.asignatura && <p className="mt-1 text-sm text-red-600">{errors.asignatura}</p>}
                  </div>

                  <div>
                    <label className="label" htmlFor="nota">
                      Nota en la asignatura
                    </label>
                    <input
                      id="nota"
                      name="nota"
                      className="input"
                      inputMode="decimal"
                      value={notaInput}
                      onChange={(event) => setNotaInput(event.target.value)}
                      placeholder="Ej: 6,3"
                    />
                    <p className="mt-1 text-xs text-slate-500">Acepta coma o punto. Rango válido: 1.0 a 7.0.</p>
                    {errors.nota && <p className="mt-1 text-sm text-red-600">{errors.nota}</p>}
                  </div>
                </>
              ) : (
                <div className="md:col-span-1">
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                    Para apoyo administrativo no se solicita asignatura ni nota.
                  </p>
                </div>
              )}

              <div>
                <label className="label" htmlFor="tieneExperiencia">
                  ¿Tienes experiencia en ayudantías o tutorías?
                </label>
                <select
                  id="tieneExperiencia"
                  name="tieneExperiencia"
                  className="input"
                  value={tieneExperiencia}
                  onChange={(event) => setTieneExperiencia(event.target.value as "si" | "no")}
                >
                  <option value="no">No</option>
                  <option value="si">Sí</option>
                </select>
              </div>

              {tieneExperiencia === "si" && (
                <div>
                  <label className="label" htmlFor="experiencia">
                    Describe brevemente tu experiencia
                  </label>
                  <textarea
                    id="experiencia"
                    name="experiencia"
                    className="input min-h-24"
                    placeholder="Ejemplo: ayudante de Matemáticas II durante 2 semestres"
                  />
                </div>
              )}

              <div className="md:col-span-2">
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

          <section className="card p-6">
            <h2 className="section-title mb-6">4. Disponibilidad horaria</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-2">
                <thead>
                  <tr>
                    <th className="sticky left-0 rounded-xl bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Bloque / horario
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
                      <td className="sticky left-0 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                        {bloque.label}
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

            <p className="mt-4 text-sm text-slate-500">Marca bloques reales de disponibilidad (bloques 1 a 10).</p>
          </section>

          <section className="card p-6">
            <h2 className="section-title mb-6">5. Documentos obligatorios</h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="siga">
                  Resumen académico / SIGA
                </label>
                <input
                  id="siga"
                  name="siga"
                  type="file"
                  accept=".pdf,image/*"
                  className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ciac-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ciac-blue"
                  required
                  onChange={(event) => handleFileChange(event, setSigaFilename)}
                />
                {sigaFilename && <p className="mt-1 text-xs text-slate-500">Archivo: {sigaFilename}</p>}
              </div>

              <div>
                <label className="label" htmlFor="cv">
                  Currículum Vitae
                </label>
                <input
                  id="cv"
                  name="cv"
                  type="file"
                  accept=".pdf,image/*"
                  className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ciac-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ciac-blue"
                  required
                  onChange={(event) => handleFileChange(event, setCvFilename)}
                />
                {cvFilename && <p className="mt-1 text-xs text-slate-500">Archivo: {cvFilename}</p>}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Formatos permitidos: PDF o imagen. Tamaño máximo: 10MB por archivo.</p>
            {errors.documentos && <p className="mt-3 text-sm text-red-600">{errors.documentos}</p>}
          </section>

          <section className="card p-6">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input type="checkbox" name="declaracion" className="mt-1 h-4 w-4" />
              <span>
                Declaro que los datos proporcionados son válidos y acepto rendir las pruebas de selección y entrevista psicolaboral.
              </span>
            </label>
            {errors.declaracion && <p className="mt-2 text-sm text-red-600">{errors.declaracion}</p>}
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
            >
              {submitStatus === "loading" ? "Enviando postulación..." : feedbackMessage}

              {submitStatus === "error" && debugDetails && (
                <pre className="mt-3 overflow-x-auto rounded-lg bg-black/5 p-3 text-xs leading-relaxed">
                  {JSON.stringify(debugDetails, null, 2)}
                </pre>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <button
              type="submit"
              disabled={submitStatus === "loading"}
              className="rounded-xl bg-ciac-blue px-6 py-3 font-semibold text-white transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitStatus === "loading" ? "Enviando..." : "Enviar postulación"}
            </button>
            <button
              type="reset"
              disabled={submitStatus === "loading"}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Limpiar formulario
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
