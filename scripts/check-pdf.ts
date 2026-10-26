/** Fails if dist/resume.pdf is too long or has lost the name, email or a job title. */
import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";
import { parse } from "yaml";
import { pdfProblems, requiredPhrases } from "../src/lib/pdf.ts";
import { resumeSchema } from "../src/lib/schema.ts";

const MAX_PAGES = 2;

const raw: unknown = parse(await readFile("src/data/resume.yaml", "utf8"));
const resume = resumeSchema.parse((raw as { resume: unknown }).resume);
const pdf = await getDocumentProxy(new Uint8Array(await readFile("dist/resume.pdf")));
const { totalPages, text } = await extractText(pdf, { mergePages: true });

const problems = pdfProblems(
  { pages: totalPages, text },
  { maxPages: MAX_PAGES, phrases: requiredPhrases(resume) },
);
if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(`✓ resume.pdf: ${totalPages} page(s), all required text present`);
