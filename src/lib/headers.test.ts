import { describe, expect, it } from "vitest";
import { headerNames } from "./headers.ts";

describe("headerNames", () => {
  it("lists the lowercased headers set for every path", () => {
    const file = "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n\n/fonts/*\n  Cache-Control: max-age=1\n";
    expect(headerNames(file)).toEqual(["x-content-type-options", "referrer-policy"]);
  });
});
