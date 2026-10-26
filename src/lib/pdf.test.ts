import { describe, expect, it } from "vitest";
import { pdfProblems, requiredPhrases } from "./pdf.ts";
import type { Resume } from "./schema.ts";

const expected = { maxPages: 2, phrases: ["Chase R. Cartwright", "Software Engineer II"] };

describe("pdfProblems", () => {
  it("accepts a PDF within the page limit that has every phrase", () => {
    const text = "Chase R. Cartwright\nIssuetrak Software Engineer II";
    expect(pdfProblems({ pages: 2, text }, expected)).toEqual([]);
  });

  it("reports a PDF over the page limit", () => {
    const text = "Chase R. Cartwright Software Engineer II";
    expect(pdfProblems({ pages: 3, text }, expected)).toEqual([
      "PDF has 3 pages; the limit is 2",
    ]);
  });

  it("reports each missing phrase", () => {
    expect(pdfProblems({ pages: 1, text: "Chase R. Cartwright" }, expected)).toEqual([
      'PDF text is missing "Software Engineer II"',
    ]);
  });

  it("matches phrases split across lines", () => {
    const text = "Chase R.\nCartwright  Software\n Engineer II";
    expect(pdfProblems({ pages: 1, text }, expected)).toEqual([]);
  });
});

describe("requiredPhrases", () => {
  it("lists the name, email and every role title", () => {
    const resume = {
      name: "A",
      email: "a@b.c",
      experience: [
        { company: "X", bullets: ["b"], roles: [{ title: "T1" }, { title: "T2" }] },
        { company: "Y", bullets: ["b"], roles: [{ title: "T3" }] },
      ],
    } as unknown as Resume;
    expect(requiredPhrases(resume)).toEqual(["A", "a@b.c", "T1", "T2", "T3"]);
  });
});
