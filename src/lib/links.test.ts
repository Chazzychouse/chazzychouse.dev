import { describe, expect, it } from "vitest";
import { routeOf } from "./dist.ts";
import { checkSite, externalLinks, extractLinks } from "./links.ts";

const site = (pages: Record<string, string>) => new Map(Object.entries(pages));

describe("extractLinks", () => {
  it("finds href and src values", () => {
    expect(extractLinks('<a href="/a/">x</a><img src="/i.svg" alt="">')).toEqual(["/a/", "/i.svg"]);
  });
});

describe("checkSite", () => {
  it("accepts links to pages, files and existing anchors", () => {
    const pages = site({
      "index.html": '<a href="/resume/">r</a><a href="/resume.pdf">p</a><a href="/resume/#skills">s</a><a href="#top">t</a><h1 id="top">x</h1>',
      "resume/index.html": '<h2 id="skills">Skills</h2>',
      "resume.pdf": "",
    });
    expect(checkSite(pages)).toEqual([]);
  });

  it("ignores external and mailto links", () => {
    const pages = site({ "index.html": '<a href="https://github.com/x">g</a><a href="mailto:a@b.c">m</a>' });
    expect(checkSite(pages)).toEqual([]);
  });

  it("reports a missing page", () => {
    const pages = site({ "index.html": '<a href="/nope/">n</a>' });
    expect(checkSite(pages)).toEqual([{ page: "index.html", href: "/nope/", reason: "no such page" }]);
  });

  it("reports a missing anchor", () => {
    const pages = site({ "index.html": '<a href="/about/#story">a</a>', "about/index.html": "<p>x</p>" });
    expect(checkSite(pages)).toEqual([
      { page: "index.html", href: "/about/#story", reason: 'no element with id "story"' },
    ]);
  });

  it("reports relative links", () => {
    const pages = site({ "index.html": '<a href="about/">a</a>' });
    expect(checkSite(pages)).toEqual([
      { page: "index.html", href: "about/", reason: "relative link; use a root-relative path" },
    ]);
  });
});

describe("externalLinks", () => {
  it("lists each http(s) link once", () => {
    const pages = site({
      "index.html": '<a href="https://github.com/x">g</a><a href="/a/">a</a>',
      "a/index.html": '<a href="https://github.com/x">g</a><a href="mailto:a@b.c">m</a>',
    });
    expect(externalLinks(pages)).toEqual(["https://github.com/x"]);
  });
});

describe("routeOf", () => {
  it("maps index files to directory routes", () => {
    expect(routeOf("index.html")).toBe("/");
    expect(routeOf("projects/csvql/index.html")).toBe("/projects/csvql/");
    expect(routeOf("404.html")).toBe("/404");
  });
});
