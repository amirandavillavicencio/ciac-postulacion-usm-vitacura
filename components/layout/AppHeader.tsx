import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container-page flex items-center justify-between py-4">
        <Link href="/" className="text-lg font-bold text-ciac-navy">
          CIAC USM Vitacura
        </Link>

        <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
          <Link href="/postulacion" className="hover:text-ciac-blue">
            Postulación
          </Link>
          <Link href="/admin/postulantes" className="hover:text-ciac-blue">
            Panel interno
          </Link>
        </nav>
      </div>
    </header>
  );
}
