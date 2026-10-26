/** Content schemas: the shape of resume.yaml and of each project's frontmatter. */
import { z } from "astro/zod";

const yearMonth = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, "use YYYY or YYYY-MM");
const endDate = z.union([yearMonth, z.literal("present")]);

const role = z.object({ title: z.string(), start: yearMonth, end: endDate });

export const resumeSchema = z.object({
  name: z.string(),
  location: z.string(),
  email: z.email(),
  github: z.url(),
  headline: z.string(),
  summary: z.string(),
  experience: z
    .array(
      z.object({
        company: z.string(),
        roles: z.array(role).min(1),
        bullets: z.array(z.string()).min(1),
      }),
    )
    .min(1),
  skills: z.array(z.object({ label: z.string(), items: z.array(z.string()).min(1) })).min(1),
  education: z.array(
    z.object({
      school: z.string(),
      program: z.string(),
      start: yearMonth,
      end: endDate,
      note: z.string().optional(),
    }),
  ),
  earlier: z.array(
    z.object({
      title: z.string(),
      org: z.string(),
      start: yearMonth,
      end: endDate,
      note: z.string().optional(),
      detail: z.string(),
    }),
  ),
});

export type Resume = z.infer<typeof resumeSchema>;

export const projectSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  stack: z.array(z.string()).min(1),
  repo: z.url(),
  order: z.number().int().positive(),
  /**
   * Bullets for the resume's Projects section; the write-up body is the page. Projects without
   * them get one line on the resume, which keeps it to two pages.
   */
  highlights: z.array(z.string()).min(1).max(4).optional(),
});
