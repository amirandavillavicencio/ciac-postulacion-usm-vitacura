import { AreaRule, BlockRule } from "./types";

export const AREA_RULES: AreaRule[] = [
  {
    area: "Matemática",
    subjects: [
      {
        subject: "MAT060",
        keywords: [
          "algebra",
          "factorizacion",
          "polinomios",
          "trigonometria",
          "geometria analitica",
          "ecuaciones",
          "fracciones algebraicas"
        ]
      },
      {
        subject: "MAT070",
        keywords: [
          "funciones",
          "funcion inversa",
          "funciones inversas",
          "funciones implicitas",
          "exponenciales",
          "logaritmos",
          "limites",
          "continuidad",
          "derivada inicial"
        ]
      },
      {
        subject: "MAT071",
        keywords: [
          "derivadas",
          "regla de la cadena",
          "derivacion implicita",
          "aplicaciones de la derivada",
          "integrales basicas"
        ]
      },
      {
        subject: "MAT021",
        keywords: [
          "algebra y trigonometria de base",
          "geometria analitica",
          "inicio del calculo diferencial"
        ]
      },
      {
        subject: "MAT022",
        keywords: [
          "integrales",
          "integral definida",
          "integral indefinida",
          "teorema fundamental del calculo"
        ]
      },
      {
        subject: "MAT023",
        keywords: [
          "matrices",
          "varias variables",
          "derivadas parciales",
          "gradiente",
          "optimizacion multivariable",
          "ecuaciones diferenciales"
        ]
      },
      {
        subject: "MAT024",
        keywords: [
          "integrales dobles",
          "integrales triples",
          "calculo vectorial",
          "curvas",
          "superficies",
          "parametrizacion"
        ]
      },
      {
        subject: "MATE-10",
        keywords: ["nivelacion", "algebra elemental", "geometria elemental", "aritmetica"]
      },
      {
        subject: "MATE-11",
        keywords: ["razonamiento logico", "conjuntos", "algebra escolar"]
      },
      {
        subject: "MATE-20",
        keywords: ["algebra lineal", "matrices", "determinantes", "vectores", "espacios vectoriales"]
      }
    ]
  },
  {
    area: "Física",
    subjects: [
      {
        subject: "FIS100",
        keywords: [
          "vectores",
          "unidades",
          "magnitudes",
          "cinematica",
          "movimiento rectilineo",
          "movimiento parabolico",
          "movimiento circular",
          "velocidad",
          "aceleracion"
        ]
      },
      {
        subject: "FIS110 / FIS111",
        keywords: [
          "leyes de newton",
          "fuerza",
          "friccion",
          "diagrama de cuerpo libre",
          "trabajo",
          "energia",
          "potencia",
          "impulso",
          "momentum"
        ]
      },
      {
        subject: "FIS120",
        keywords: [
          "electricidad",
          "ley de coulomb",
          "campo electrico",
          "potencial electrico",
          "corriente",
          "resistencia",
          "circuitos",
          "ley de ohm",
          "capacitores"
        ]
      },
      {
        subject: "FIS130",
        keywords: [
          "ondas",
          "sonido",
          "frecuencia",
          "longitud de onda",
          "temperatura",
          "calor",
          "termodinamica",
          "gases ideales"
        ]
      }
    ]
  },
  {
    area: "Programación",
    subjects: [
      {
        subject: "INF129 / IWI131",
        keywords: [
          "algoritmos",
          "pseudocodigo",
          "variables",
          "condicionales",
          "ciclos",
          "programacion basica"
        ]
      },
      {
        subject: "INF130",
        keywords: [
          "funciones en programacion",
          "arreglos",
          "estructuras de datos basicas",
          "programacion modular"
        ]
      }
    ]
  },
  {
    area: "Química",
    subjects: [
      {
        subject: "QUI010",
        keywords: [
          "estructura atomica",
          "enlaces",
          "estequiometria",
          "mol",
          "soluciones",
          "reacciones quimicas",
          "quimica general"
        ]
      }
    ]
  },
  {
    area: "Área Psicoeducativa",
    subjects: [
      {
        subject: "Ansiedad y Estrés Estudiantil",
        keywords: ["ansiedad", "estres", "autocuidado", "regulacion emocional"]
      },
      {
        subject: "Gestión del Tiempo",
        keywords: ["planificacion", "organizacion", "agenda", "gestion del tiempo", "procrastinacion"]
      },
      {
        subject: "Estrategias de Estudio",
        keywords: ["tecnicas de estudio", "estrategias de aprendizaje", "aprendizaje activo", "comprension"]
      },
      {
        subject: "Estrategias para preparar evaluaciones",
        keywords: ["pruebas", "evaluaciones", "control de examenes", "preparacion de pruebas"]
      },
      {
        subject: "Motivación",
        keywords: ["motivacion", "persistencia", "autoeficacia", "metas"]
      }
    ]
  }
];

export const BLOCK_RULES: BlockRule[] = [
  {
    block: "Guías y Pautas",
    keywords: ["guia", "guias", "pauta", "pautas", "instructivo"]
  },
  {
    block: "Videos con Resolución de Problemas",
    keywords: ["video", "videos", "resolucion", "problemas resueltos", "clase grabada"]
  },
  {
    block: "Autoevaluación: Practica lo Aprendido",
    keywords: ["autoevaluacion", "practica", "quiz", "ejercicios", "preguntas"]
  },
  {
    block: "Intensivos Online Grabados",
    keywords: ["intensivo", "online", "grabado", "repaso intensivo", "masterclass"]
  }
];

export const DEFAULT_BLOCK = "Contenidos de la Asignatura";

export const MANUAL_REVIEW_THRESHOLD = 0.35;
