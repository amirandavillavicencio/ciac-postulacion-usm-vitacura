
-- =====================================
-- CIAC USM VITACURA
-- ESQUEMA BASE DE DATOS
-- =====================================

CREATE TABLE postulantes (
    id SERIAL PRIMARY KEY,
    rut TEXT NOT NULL UNIQUE,
    nombre_completo TEXT NOT NULL,
    correo TEXT NOT NULL,
    telefono TEXT,
    carrera TEXT,
    semestre INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE postulaciones (
    id SERIAL PRIMARY KEY,
    postulante_id INTEGER REFERENCES postulantes(id),
    tipo_postulacion TEXT,
    motivacion TEXT,
    estado TEXT DEFAULT 'recibida',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE postulacion_areas (
    id SERIAL PRIMARY KEY,
    postulacion_id INTEGER REFERENCES postulaciones(id),
    area TEXT,
    nota_asignatura NUMERIC,
    prioridad_academica NUMERIC
);

CREATE TABLE disponibilidad_bloques (
    id SERIAL PRIMARY KEY,
    postulacion_id INTEGER REFERENCES postulaciones(id),
    dia_semana TEXT,
    bloque INTEGER,
    disponible BOOLEAN DEFAULT TRUE
);

CREATE TABLE documentos_postulacion (
    id SERIAL PRIMARY KEY,
    postulacion_id INTEGER REFERENCES postulaciones(id),
    tipo_documento TEXT,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE evaluaciones (
    id SERIAL PRIMARY KEY,
    postulacion_id INTEGER REFERENCES postulaciones(id),
    evaluador TEXT,
    puntaje INTEGER,
    comentario TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
