export type BlockOption =
  | "Contenidos de la Asignatura"
  | "Guías y Pautas"
  | "Videos con Resolución de Problemas"
  | "Autoevaluación: Practica lo Aprendido"
  | "Intensivos Online Grabados"
  | "Revisión manual";

export interface SubjectRule {
  subject: string;
  keywords: string[];
}

export interface AreaRule {
  area: string;
  subjects: SubjectRule[];
}

export interface BlockRule {
  block: Exclude<BlockOption, "Revisión manual">;
  keywords: string[];
}

export interface ClassificationResult {
  area: string;
  subject: string;
  block: BlockOption;
  confidence: number;
  explanation: string;
  matchedKeywords: string[];
}
