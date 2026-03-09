import { AREA_RULES, BLOCK_RULES, DEFAULT_BLOCK, MANUAL_REVIEW_THRESHOLD } from "./rules";
import { BlockOption, ClassificationResult } from "./types";

interface Candidate {
  area: string;
  subject: string;
  score: number;
  matchedKeywords: string[];
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordScore(text: string, keyword: string): number {
  if (!text || !keyword) return 0;
  if (!text.includes(keyword)) return 0;
  const words = keyword.split(" ").filter(Boolean).length;
  return 1 + words * 0.25;
}

function classifyBlock(normalizedText: string): BlockOption {
  let topBlock: BlockOption = DEFAULT_BLOCK;
  let topScore = 0;

  for (const rule of BLOCK_RULES) {
    const score = rule.keywords.reduce((acc, keyword) => acc + keywordScore(normalizedText, keyword), 0);
    if (score > topScore) {
      topScore = score;
      topBlock = rule.block;
    }
  }

  return topBlock;
}

export function classifyContent(input: string): ClassificationResult {
  const normalizedInput = normalizeText(input);
  if (!normalizedInput) {
    return {
      area: "Revisión manual",
      subject: "Revisión manual",
      block: "Revisión manual",
      confidence: 0,
      explanation: "No se detectó texto para clasificar. Pega una descripción para sugerir destino.",
      matchedKeywords: []
    };
  }

  const candidates: Candidate[] = [];

  for (const areaRule of AREA_RULES) {
    for (const subjectRule of areaRule.subjects) {
      let score = 0;
      const matchedKeywords: string[] = [];

      for (const rawKeyword of subjectRule.keywords) {
        const keyword = normalizeText(rawKeyword);
        const points = keywordScore(normalizedInput, keyword);
        if (points > 0) {
          score += points;
          matchedKeywords.push(rawKeyword);
        }
      }

      if (score > 0) {
        candidates.push({
          area: areaRule.area,
          subject: subjectRule.subject,
          score,
          matchedKeywords
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];
  const second = candidates[1];

  if (!best) {
    return {
      area: "Revisión manual",
      subject: "Revisión manual",
      block: "Revisión manual",
      confidence: 0.1,
      explanation: "No hubo coincidencias claras con las reglas actuales. Se recomienda revisión manual.",
      matchedKeywords: []
    };
  }

  const confidence = second ? best.score / (best.score + second.score) : 0.9;

  if (confidence < MANUAL_REVIEW_THRESHOLD) {
    return {
      area: "Revisión manual",
      subject: "Revisión manual",
      block: "Revisión manual",
      confidence,
      explanation: `Se encontraron coincidencias distribuidas entre varias asignaturas (${best.subject} y otras). Requiere revisión manual.`,
      matchedKeywords: best.matchedKeywords
    };
  }

  const block = classifyBlock(normalizedInput);

  return {
    area: best.area,
    subject: best.subject,
    block,
    confidence,
    explanation: `Coincide principalmente con ${best.subject} (${best.area}) por términos como: ${best.matchedKeywords
      .slice(0, 4)
      .join(", ")}.`,
    matchedKeywords: best.matchedKeywords
  };
}
