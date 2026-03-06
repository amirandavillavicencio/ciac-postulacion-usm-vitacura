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
};

type ApiResponse = {
  error?: string;
  debug?: ApiErrorDebug;
};

export default function PostulacionPage() {
  const matrix = useMemo(() => buildAvailabilityMatrix(), []);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [debugDetails, setDebugDetails] = useState<ApiErrorDebug | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitStatus("loading");
    setFeedbackMessage("");
    setDebugDetails(null);

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    const payload: PostulacionPayload = {
      nombreCompleto: String(formData.get("nombre") ?? "").trim(),
      rut: String(formData.get("rut") ?? "").trim(),
      correo: String(formData.get("correo") ?? "").trim(),
      telefono: String(formData.get("telefono") ?? "").trim(),
      carrera: String(formData.get("carrera") ?? "").trim(),
      semestre: Number(formData.get("semestre") ?? 0),
      tipoPostulacion: String(formData.get("tipoPostulacion") ?? "") as PostulacionPayload["tipoPostulacion"],
      area: String(formData.get("area") ?? "") as PostulacionPayload["area"],
      prioridadAcademica: Number(formData.get("prioridad") ?? 0),
      notaAsignatura: Number(formData.get("nota") ?? 0),
      experiencia: String(formData.get("experiencia") ?? "").trim(),
      motivacion: String(formData.get("motivacion") ?? "").trim(),
      disponibilidad: getSelectedAvailabilityFromForm(formData)
    };

    try {
      const response = await fetch("/api/postulacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setSubmitStatus("error");
        setFeedbackMessage(result.error ?? "No fue posible enviar la postulación.");
        setDebugDetails(result.debug ?? null);
        return;
      }

      setSubmitStatus("success");
      setFeedbackMessage("¡Postulación enviada correctamente!");
      setDebugDetails(null);
      formElement.reset();
    } catch {
      setSubmitStatus("error");
      setFeedbackMessage("Error de red al enviar la postulación. Intenta nuevamente.");
      setDebugDetails(null);
    }
  }

  return (
    <main className="py-10">
      <div className="container-page">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-ciac-blue">
            CIAC USM Vitacura
          </p>
          <h1 className="text-3xl font-bold text-ciac-navy md:text-4xl">
            Formulario de postulación
          </h1>
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
              </div>

              <div>
                <label className="label" htmlFor="rut">
                  RUT
                </label>
                <input id="rut" name="rut" className="input" placeholder="12.345.678-9" required />
              </div>

              <div>
                <label className="label" htmlFor="correo">
                  Correo institucional
                </label>
                <input id="correo" name="correo" type="email" className="input" required />
              </div>

              <div>
                <label className="label" htmlFor="telefono">
                  Teléfono
                </label>
                <input id="telefono" name="telefono" className="input" required />
              </div>

              <div>
                <label className="label" htmlFor="carrera">
                  Carrera
                </label>
                <input id="carrera" name="carrera" className="input" required />
              </div>

              <div>
                <label className="label" htmlFor="semestre">
                  Semestre actual
                </label>
                <input id="semestre" name="semestre" type="number" min="1" className="input" required />
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="section-title mb-6">2. Tipo de postulación</h2>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="label" htmlFor="tipoPostulacion">
                  Tipo
                </label>
                <select id="tipoPostulacion" name="tipoPostulacion" className="input" required>
                  <option value="">Selecciona una opción</option>
                  <option value="academico">Tutor académico</option>
                  <option value="administrativo">Apoyo administrativo</option>
                  <option value="mixto">Mixto</option>
                </select>
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
                <label className="label" htmlFor="prioridad">
                  Prioridad académica
                </label>
                <input
                  id="prioridad"
                  name="prioridad"
                  type="number"
                  step="0.01"
                  className="input"
                  required
                />
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
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="section-title mb-6">3. Disponibilidad horaria</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-2">
                <thead>
                  <tr>
                    <th className="rounded-xl bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Bloque
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
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Marca todos los bloques en que realmente podrías trabajar.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="section-title mb-6">4. Documentos</h2>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="label" htmlFor="siga">
                  Resumen académico SIGA
                </label>
                <input
                  id="siga"
                  name="siga"
                  type="file"
                  className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ciac-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ciac-blue"
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
                />
              </div>

              <div>
                <label className="label" htmlFor="horario">
                  Disponibilidad horaria adicional
                </label>
                <input
                  id="horario"
                  name="horario"
                  type="file"
                  className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ciac-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ciac-blue"
                />
              </div>
            </div>
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
