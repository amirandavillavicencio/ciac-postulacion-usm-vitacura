"use client";

import { useMemo, useState } from "react";
import { classifyContent } from "@/lib/classifier/engine";
import { EXAMPLES } from "@/lib/classifier/examples";

export default function HomePage() {
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);

  const result = useMemo(() => {
    if (!touched) return null;
    return classifyContent(text);
  }, [text, touched]);

  return (
    <main className="min-h-screen bg-slate-100 py-10 text-slate-900">
      <div className="container-page mx-auto max-w-4xl space-y-6 px-4">
        <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ciac-blue">CIAC Content Classifier</p>
          <h1 className="mt-2 text-3xl font-bold text-ciac-navy">Clasifica contenidos para migración de Aula CIAC</h1>
          <p className="mt-2 text-sm text-slate-600">
            Pega un título, descripción o texto corto del recurso para sugerir área, asignatura y bloque interno.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <label htmlFor="content" className="label">
            Contenido a clasificar
          </label>
          <textarea
            id="content"
            className="input min-h-44"
            placeholder="Ejemplo: Guía de integración por partes con ejercicios de integral definida..."
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setTouched(true)}
              className="rounded-xl bg-ciac-blue px-5 py-2.5 font-semibold text-white transition hover:bg-ciac-navy"
            >
              Clasificar
            </button>
            <button
              type="button"
              onClick={() => {
                setText("");
                setTouched(false);
              }}
              className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-ciac-navy">Ejemplos precargados</h2>
          <div className="mt-3 grid gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => {
                  setText(example);
                  setTouched(false);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        {result && (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-ciac-navy">Resultado sugerido</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ResultItem label="Área sugerida" value={result.area} />
              <ResultItem label="Asignatura sugerida" value={result.subject} />
              <ResultItem label="Bloque sugerido" value={result.block} />
              <ResultItem label="Confianza aproximada" value={`${Math.round(result.confidence * 100)}%`} />
            </div>
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{result.explanation}</p>
          </section>
        )}
      </div>
    </main>
  );
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
