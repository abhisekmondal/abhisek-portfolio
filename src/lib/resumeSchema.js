import { z } from "zod";
import { builderSettings, emptyResume } from "@/data/builderDefaults";

export const resumeProfileSchema = z.object({
  name: z.string().trim().max(120).catch(""),
  title: z.string().trim().max(160).catch(""),
  email: z.string().trim().max(160).catch(""),
  phone: z.string().trim().max(80).catch(""),
  location: z.string().trim().max(160).catch(""),
  website: z.string().trim().max(220).catch(""),
  linkedin: z.string().trim().max(220).catch(""),
  github: z.string().trim().max(220).catch(""),
});

const bulletListSchema = z.array(z.string().trim().max(700).catch("")).max(12).catch([""]);

const skillGroupSchema = z.object({
  label: z.string().trim().max(80).catch(""),
  items: z.array(z.string().trim().max(80).catch("")).max(40).catch([""]),
});

const experienceSchema = z.object({
  role: z.string().trim().max(140).catch(""),
  company: z.string().trim().max(140).catch(""),
  location: z.string().trim().max(140).catch(""),
  start: z.string().trim().max(60).catch(""),
  end: z.string().trim().max(60).catch(""),
  bullets: bulletListSchema,
});

const educationSchema = z.object({
  degree: z.string().trim().max(160).catch(""),
  institute: z.string().trim().max(180).catch(""),
  location: z.string().trim().max(140).catch(""),
  year: z.string().trim().max(60).catch(""),
});

const certificationSchema = z.object({
  name: z.string().trim().max(180).catch(""),
  issuer: z.string().trim().max(120).catch(""),
  year: z.string().trim().max(60).catch(""),
  url: z.string().trim().max(260).catch(""),
});

const projectSchema = z.object({
  name: z.string().trim().max(160).catch(""),
  role: z.string().trim().max(140).catch(""),
  url: z.string().trim().max(260).catch(""),
  bullets: bulletListSchema,
});

const sectionVisibilitySchema = z.object({
  summary: z.boolean().catch(true),
  skills: z.boolean().catch(true),
  experience: z.boolean().catch(true),
  projects: z.boolean().catch(true),
  education: z.boolean().catch(true),
  certifications: z.boolean().catch(true),
});

export const resumeSchema = z.object({
  profile: resumeProfileSchema.catch(emptyResume.profile),
  sections: sectionVisibilitySchema.catch(emptyResume.sections),
  summary: z.string().trim().max(1500).catch(""),
  skills: z.array(skillGroupSchema).max(20).catch(emptyResume.skills),
  experience: z.array(experienceSchema).max(20).catch(emptyResume.experience),
  education: z.array(educationSchema).max(12).catch(emptyResume.education),
  certifications: z.array(certificationSchema).max(20).catch(emptyResume.certifications),
  projects: z.array(projectSchema).max(20).catch(emptyResume.projects),
});

export const settingsSchema = z.object({
  template: z
    .enum(["modern", "classic", "compact", "ats", "tech", "executive", "graduate", "creative"])
    .catch(builderSettings.template),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).catch(builderSettings.accent),
  density: z.enum(["comfortable", "compact"]).catch(builderSettings.density),
});

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeResume(value) {
  const input = value && typeof value === "object" ? value : {};
  const parsed = resumeSchema.parse({
    ...clone(emptyResume),
    ...input,
    profile: { ...emptyResume.profile, ...(input.profile || {}) },
    sections: { ...emptyResume.sections, ...(input.sections || {}) },
    skills: Array.isArray(input.skills) && input.skills.length ? input.skills : emptyResume.skills,
    experience: Array.isArray(input.experience) && input.experience.length ? input.experience : emptyResume.experience,
    education: Array.isArray(input.education) && input.education.length ? input.education : emptyResume.education,
    certifications:
      Array.isArray(input.certifications) && input.certifications.length
        ? input.certifications
        : emptyResume.certifications,
    projects: Array.isArray(input.projects) && input.projects.length ? input.projects : emptyResume.projects,
  });

  return ensureEditableRows(parsed);
}

export function normalizeSettings(value) {
  return settingsSchema.parse({ ...builderSettings, ...(value || {}) });
}

export function readStoredJson(key, fallback, normalizer) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? normalizer(JSON.parse(stored)) : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

export function parseResumeJson(text) {
  try {
    return { ok: true, resume: normalizeResume(JSON.parse(text)) };
  } catch {
    return {
      ok: false,
      error: "That file is not valid resume-builder JSON. Export from this app or fix the JSON structure and try again.",
    };
  }
}

export function getCompletion(resume) {
  const checks = [
    resume.profile.name,
    resume.profile.title,
    resume.profile.email,
    resume.profile.phone,
    resume.summary,
    resume.skills.some((group) => group.items.some(Boolean)),
    resume.experience.some(hasRoleContent),
    resume.education.some(hasEducationContent),
    resume.certifications.some(hasCertificationContent),
    resume.projects.some(hasProjectContent),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function getResumeIssues(resume) {
  const issues = [];

  if (!resume.profile.name) issues.push("Add your full name.");
  if (!resume.profile.title) issues.push("Add a target role or headline.");
  if (!resume.profile.email && !resume.profile.phone) issues.push("Add at least one contact method.");
  if (!resume.summary || resume.summary.length < 120) issues.push("Write a stronger 3-5 line professional summary.");
  if (!resume.experience.some(hasRoleContent)) issues.push("Add at least one work experience entry.");
  if (!resume.skills.some((group) => group.items.filter(Boolean).length >= 3)) {
    issues.push("Add focused skill groups with at least three skills.");
  }

  const weakBullets = resume.experience
    .flatMap((item) => item.bullets)
    .filter(Boolean)
    .filter((bullet) => !/\d|%|reduced|improved|increased|decreased|automated|built|designed/i.test(bullet));

  if (weakBullets.length) {
    issues.push("Add measurable outcomes to more experience bullets.");
  }

  return issues.slice(0, 6);
}

export const hasRoleContent = (item) => Boolean(item.role || item.company || item.bullets?.some(Boolean));
export const hasProjectContent = (item) => Boolean(item.name || item.role || item.bullets?.some(Boolean));
export const hasEducationContent = (item) => Boolean(item.degree || item.institute || item.year);
export const hasCertificationContent = (item) => Boolean(item.name || item.issuer || item.year);
export const hasSkillGroupContent = (group) => Boolean(group.label || group.items?.some(Boolean));

function ensureEditableRows(resume) {
  return {
    ...resume,
    skills: resume.skills.length ? resume.skills : clone(emptyResume.skills),
    experience: resume.experience.length ? resume.experience : clone(emptyResume.experience),
    education: resume.education.length ? resume.education : clone(emptyResume.education),
    certifications: resume.certifications.length ? resume.certifications : clone(emptyResume.certifications),
    projects: resume.projects.length ? resume.projects : clone(emptyResume.projects),
  };
}
