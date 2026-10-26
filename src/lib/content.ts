/** The one way pages read content. */
import { getCollection, getEntry, type CollectionEntry } from "astro:content";
import type { Resume } from "./schema.ts";

export async function getResume(): Promise<Resume> {
  const entry = await getEntry("resume", "resume");
  if (entry === undefined) {
    throw new Error("src/data/resume.yaml must have a top-level `resume:` key");
  }
  return entry.data;
}

export async function getProjects(): Promise<CollectionEntry<"projects">[]> {
  const projects = await getCollection("projects");
  return projects.sort((a, b) => a.data.order - b.data.order);
}
