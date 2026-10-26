/** What the resume PDF must satisfy: a page limit, and the facts a reader must not lose. */
import type { Resume } from "./schema.ts";

export interface PdfFacts {
  pages: number;
  text: string;
}

export interface PdfExpectations {
  maxPages: number;
  phrases: string[];
}

export function pdfProblems(facts: PdfFacts, expected: PdfExpectations): string[] {
  const problems: string[] = [];
  if (facts.pages > expected.maxPages) {
    problems.push(`PDF has ${facts.pages} pages; the limit is ${expected.maxPages}`);
  }
  const text = normalize(facts.text);
  for (const phrase of expected.phrases) {
    if (!text.includes(normalize(phrase))) problems.push(`PDF text is missing "${phrase}"`);
  }
  return problems;
}

export function requiredPhrases(resume: Resume): string[] {
  const titles = resume.experience.flatMap((job) => job.roles.map((role) => role.title));
  return [resume.name, resume.email, ...titles];
}

/** PDF text extraction breaks lines anywhere, so compare with whitespace collapsed. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
