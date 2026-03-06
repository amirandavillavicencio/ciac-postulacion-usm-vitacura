import { BLOQUES, DIAS_SEMANA } from "@/lib/constants/form";
import { buildAvailabilityMatrix } from "@/lib/utils/availability";

export default function PostulacionPage() {
  const matrix = buildAvailabilityMatrix();

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
            Esta es la primera versión visual del formulario. Aún no guarda en
            base de datos. El siguiente paso será conectar el envío con
            Supabase.
          </p>
        </div>

        <form className="space-y-8">
          <section className="card p-6">
            <h2 className="section-title mb-6">1. Datos personales</h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="nombre">
                  Nombre completo
                </label>
                <input id="nombre" name="nombre" className="input" />
              </div>

              <div>
                <label className="label" htmlFor="rut">
                  RUT
                </label>
                <input id="rut" name="rut" className="input" placeholder="12.345.678-9" />
              </div>

              <div>
                <label className="label" htmlFor="correo">
                  Correo institucional
                </label>
                <input id="correo" name="correo" type="email" className="input" />
              </div>

              <div>
                <label className="label" htmlFor="telefono">
                  Teléfono
                </label>
                <input id="telefono" name="telefono" className="input" />
              </div>

              <div>
                <label className="label" htmlFor="carrera">
                  Carrera
                </label>
                <input id="carrera" name="carrera" className="input" />
              </div>

              <div>
                <label className="label" htmlFor="semestre">
                  Semestre actual
                </label>
                <input id="semestre" name="semestre" type="number" min="1" className="input" />
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
                <select id="tipoPostulacion" name="tipoPostulacion" className="input">
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
                <select id="area" name="area" className="input">
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
                <input id="prioridad" name="prioridad" type="number" step="0.01" className="input" />
              </div>

              <div>
                <label className="label" htmlFor="nota">
                  Nota asignatura relevante
                </label>
                <input id="nota" name="nota" type="number" step="0.1" className="input" />
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
                <input id="siga" name="siga" type="file" className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ciac-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ciac-blue" />
              </div>

              <div>
                <label className="label" htmlFor="cv">
                  Currículum Vitae
                </label>
                <input id="cv" name="cv" type="file" className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ciac-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ciac-blue" />
              </div>

              <div>
                <label className="label" htmlFor="horario">
                  Disponibilidad horaria adicional
                </label>
                <input id="horario" name="horario" type="file" className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ciac-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ciac-blue" />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-4">
            <button
              type="submit"
              className="rounded-xl bg-ciac-blue px-6 py-3 font-semibold text-white transition hover:translate-y-[-1px]"
            >
              Enviar postulación
            </button>
            <button
              type="reset"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700"
            >
              Limpiar formulario
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
