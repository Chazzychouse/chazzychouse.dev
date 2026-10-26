import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { projectSchema, resumeSchema } from "./lib/schema.ts";

const resume = defineCollection({ loader: file("src/data/resume.yaml"), schema: resumeSchema });

const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "src/content/projects" }),
  schema: projectSchema,
});

export const collections = { resume, projects };
