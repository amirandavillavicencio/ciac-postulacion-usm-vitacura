const kpis = [
  { label: "Total postulantes", value: "0" },
  { label: "Académicos", value: "0" },
  { label: "Administrativos", value: "0" },
  { label: "Mixtos", value: "0" }
];

const postulantes = [
  {
    nombre: "Sin datos aún",
    rut: "-",
    tipo: "-",
    area: "-",
    estado: "Pendiente conexión"
  }
];

export default function AdminPostulantesPage() {
  return (
    <main className="py-10">
      <div className="container-page">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-ciac-blue">
            Panel interno
          </p>
          <h1 className="text-3xl font-bold text-ciac-navy md:text-4xl">
            Gestión de postulantes
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Vista inicial del panel. En la siguiente etapa se conectará con
            Supabase para mostrar postulantes reales.
          </p>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          {kpis.map((item) => (
            <div key={item.label} className="card p-5">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-bold text-ciac-navy">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="card p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="section-title">Listado base</h2>
            <div className="flex gap-3">
              <input className="input w-56" placeholder="Buscar por nombre o RUT" />
              <select className="input w-48">
                <option>Todos los estados</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-2xl">
              <thead>
                <tr className="bg-slate-100 text-left text-sm text-slate-700">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">RUT</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {postulantes.map((item) => (
                  <tr key={item.nombre} className="border-t border-slate-200 bg-white text-sm">
                    <td className="px-4 py-3">{item.nombre}</td>
                    <td className="px-4 py-3">{item.rut}</td>
                    <td className="px-4 py-3">{item.tipo}</td>
                    <td className="px-4 py-3">{item.area}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        {item.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
