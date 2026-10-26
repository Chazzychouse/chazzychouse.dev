import { describe, expect, it } from "vitest";
import { formatDate, formatRange } from "./dates.ts";

describe("formatDate", () => {
  it("formats a year and month", () => expect(formatDate("2024-05")).toBe("May 2024"));
  it("keeps a bare year", () => expect(formatDate("2018")).toBe("2018"));
  it("names the present", () => expect(formatDate("present")).toBe("Present"));
  it("rejects a month that doesn't exist", () =>
    expect(() => formatDate("2024-13")).toThrow(RangeError));
});

describe("formatRange", () => {
  it("joins two dates with a spaced en dash", () =>
    expect(formatRange("2022-10", "2023-05")).toBe("Oct 2022 – May 2023"));
  it("handles bare years", () => expect(formatRange("2018", "2022")).toBe("2018 – 2022"));
});
