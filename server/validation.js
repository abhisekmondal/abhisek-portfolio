const { z } = require("zod");

const text = (max) => z.string().trim().max(max).catch("");
const bulletListSchema = z.array(text(700)).max(12).catch([""]);

const resumeSchema = z.object({
  profile: z.object({
    name: text(120),
    title: text(160),
    email: text(160),
    phone: text(80),
    location: text(160),
    website: text(220),
    linkedin: text(220),
    github: text(220),
  }),
  sections: z.object({
    summary: z.boolean().catch(true),
    skills: z.boolean().catch(true),
    experience: z.boolean().catch(true),
    projects: z.boolean().catch(true),
    education: z.boolean().catch(true),
    certifications: z.boolean().catch(true),
  }),
  summary: text(1500),
  skills: z.array(z.object({ label: text(80), items: z.array(text(80)).max(40).catch([""]) })).max(20).catch([]),
  experience: z.array(z.object({
    role: text(140),
    company: text(140),
    location: text(140),
    start: text(60),
    end: text(60),
    bullets: bulletListSchema,
  })).max(20).catch([]),
  education: z.array(z.object({
    degree: text(160),
    institute: text(180),
    location: text(140),
    year: text(60),
  })).max(12).catch([]),
  certifications: z.array(z.object({
    name: text(180),
    issuer: text(120),
    year: text(60),
    url: text(260),
  })).max(20).catch([]),
  projects: z.array(z.object({
    name: text(160),
    role: text(140),
    url: text(260),
    bullets: bulletListSchema,
  })).max(20).catch([]),
});

function validateResumePayload(body) {
  const data = body?.data || body;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throwBadRequest("Resume payload must be an object.");
  }

  const parsed = resumeSchema.safeParse(data);
  if (!parsed.success) {
    throwBadRequest("Resume payload is invalid.");
  }

  return parsed.data;
}

function validateAuthPayload(body) {
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const name = String(body?.name || "").trim().slice(0, 120);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throwBadRequest("A valid email is required.");
  }

  if (password.length < 8 || password.length > 120) {
    throwBadRequest("Password must be 8 to 120 characters.");
  }

  return { email, password, name };
}

function validateUuid(value, label = "id") {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throwBadRequest(`Invalid ${label}.`);
  }
  return id;
}

function throwBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

module.exports = {
  validateAuthPayload,
  validateResumePayload,
  validateUuid,
};
