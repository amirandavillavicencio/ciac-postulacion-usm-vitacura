
# CIAC USM Vitacura · Sistema de Postulación y Gestión de Postulantes

Sistema web para gestionar la postulación al CIAC USM Vitacura.

Permite:
- recibir postulaciones en línea
- registrar antecedentes académicos
- subir documentos obligatorios
- registrar disponibilidad horaria por bloques
- revisar postulantes desde un panel interno
- generar informes y proyección de horarios

---

## Arquitectura

Frontend: Next.js desplegado en Vercel  
Backend: Server Actions / API Routes  
Base de datos: Supabase (PostgreSQL + Storage)

---

## Módulos principales

1. Página pública de postulación
   `/postulacion`

2. Panel interno de revisión
   `/admin/postulantes`

---

## Datos que recoge el sistema

### Identificación
- nombre
- rut
- correo institucional
- teléfono
- carrera
- semestre

### Postulación
- tipo de postulación (académico / administrativo)
- área
- prioridad académica
- nota relevante
- experiencia

### Disponibilidad
bloques por día de la semana

### Documentos
- resumen académico SIGA
- CV
- disponibilidad horaria

---

## Stack tecnológico

Next.js  
React  
TypeScript  
Tailwind  
Supabase  
Vercel

---

## Próximo paso

1. Crear proyecto en Vercel
2. Crear proyecto Supabase
3. Ejecutar schema.sql
4. Conectar frontend con Supabase
