# CIAC USM Vitacura · Sistema de Postulación

Proyecto en Next.js para desplegar en Vercel y conectar con Supabase.

## Requisitos
- Node.js 20+
- npm 10+

## Instalación
```bash
npm install
npm run dev
```

## Scripts disponibles
- `npm run dev`: inicia el entorno local en modo desarrollo.
- `npm run build`: compila la aplicación para producción.
- `npm run start`: ejecuta la app compilada.
- `npm run lint`: ejecuta el linter de Next.js.
- `npm run typecheck`: valida tipos con TypeScript sin emitir archivos.

## Variables de entorno
Crea un archivo `.env.local` basado en `.env.example`.

## Estructura inicial
- `/` inicio
- `/postulacion` formulario público
- `/admin/postulantes` panel interno base

## Integración continua
El workflow de CI ejecuta:
1. instalación con `npm ci`
2. chequeo de tipos con `npm run typecheck`
3. build con `npm run build`
