# CIAC Content Classifier

Aplicación web en **Next.js + TypeScript** para apoyar la migración de recursos desde el aula antigua CIAC hacia la nueva estructura del Aula CIAC.

## ¿Qué hace?

Dado un texto breve (título, descripción o contenido), la app sugiere:

- **Área** (Matemática, Física, Programación, Química, Área Psicoeducativa).
- **Asignatura destino**.
- **Bloque interno sugerido**:
  - Contenidos de la Asignatura
  - Guías y Pautas
  - Videos con Resolución de Problemas
  - Autoevaluación: Practica lo Aprendido
  - Intensivos Online Grabados
- **Explicación breve** de la sugerencia.
- **Nivel de confianza aproximado**.

Si la confianza es baja o no hay coincidencias relevantes, retorna **Revisión manual**.

## Requisitos

- Node.js 20+
- npm 10+

## Instalación y ejecución

```bash
npm install
npm run dev
```

La app quedará disponible en `http://localhost:3000`.

## Arquitectura (simple y editable)

- `app/page.tsx`: interfaz principal (textarea, botón Clasificar, ejemplos, resultado).
- `lib/classifier/rules.ts`: tabla editable de reglas (áreas, asignaturas y palabras clave) + reglas de bloques.
- `lib/classifier/engine.ts`: motor de clasificación por puntaje (coincidencias múltiples + selección de mejor sugerencia).
- `lib/classifier/examples.ts`: ejemplos precargados.
- `lib/classifier/types.ts`: tipos TypeScript de la clasificación.

## Cómo editar reglas

Toda la configuración está en `lib/classifier/rules.ts`.

### 1) Editar área/asignatura/palabras clave

Dentro de `AREA_RULES` puedes:
- agregar una nueva área,
- agregar una nueva asignatura,
- editar palabras clave existentes.

Ejemplo de estructura:

```ts
{
  area: "Matemática",
  subjects: [
    {
      subject: "MAT070",
      keywords: ["funciones", "logaritmos", "limites"]
    }
  ]
}
```

### 2) Editar bloques sugeridos

En `BLOCK_RULES` puedes ajustar palabras clave para cada bloque interno.

### 3) Ajustar umbral de revisión manual

En `MANUAL_REVIEW_THRESHOLD` puedes subir o bajar la exigencia de confianza.

## Despliegue en Vercel

El proyecto queda listo para desplegar en Vercel con configuración estándar de Next.js:

1. Subir el repositorio a GitHub.
2. Importar proyecto en Vercel.
3. Framework detectado: **Next.js**.
4. Build command: `npm run build`.
5. Output: automático de Next.js.

No requiere base de datos ni variables de entorno para esta versión.
