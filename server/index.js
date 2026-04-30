require("dotenv").config();

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const mammoth = require("mammoth");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const { initDatabase, pool } = require("./db");
const { validateAuthPayload, validateResumePayload, validateUuid } = require("./validation");

const app = express();
const port = Number(process.env.API_PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "dev-only-change-me";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.IMPORT_FILE_LIMIT_BYTES || 6 * 1024 * 1024) },
});
const allowedOrigins = String(process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === "production" && jwtSecret === "dev-only-change-me") {
  throw new Error("JWT_SECRET must be set to a strong value in production.");
}

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true");
app.use(assignRequestId);
app.use(securityHeaders);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS."));
    },
  }),
);
app.use(express.json({ limit: process.env.JSON_LIMIT || "512kb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.RATE_LIMIT_MAX || 300) }));
app.use(optionalAuth);

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    res.status(503).json({ ok: false, database: "unavailable", error: error.message });
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { email, password, name } = validateAuthPayload(req.body);
    const clientId = getClientId(req, false);
    const existing = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email]);

    if (existing.rowCount) {
      res.status(409).json({ error: "An account already exists for this email." });
      return;
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, name)
       VALUES ($1, LOWER($2), $3, $4)
       RETURNING id, email, name, created_at`,
      [id, email, passwordHash, name || null],
    );

    const claimed = await claimAnonymousResumes(id, clientId);
    res.status(201).json({ user: result.rows[0], token: signToken(result.rows[0]), claimed });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = validateAuthPayload(req.body);
    const clientId = getClientId(req, false);
    const result = await pool.query("SELECT id, email, password_hash, name, created_at FROM users WHERE LOWER(email) = LOWER($1)", [
      email,
    ]);

    if (!result.rowCount || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const { password_hash, ...user } = result.rows[0];
    const claimed = await claimAnonymousResumes(user.id, clientId);
    res.json({ user, token: signToken(user), claimed });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/import-resume", requireAuth, upload.single("resume"), async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Upload a resume file.");
      error.statusCode = 400;
      throw error;
    }

    const text = await extractResumeText(req.file);
    const resume = buildResumeFromText(text);
    res.json({ resume, extractedCharacters: text.length });
  } catch (error) {
    next(error);
  }
});

app.get("/api/resumes", async (req, res, next) => {
  try {
    const scope = getResumeScope(req);
    const result = await pool.query(
      `SELECT id, title, owner_email, created_at, updated_at
       FROM resumes
       WHERE ${scope.where}
       ORDER BY updated_at DESC
       LIMIT 100`,
      scope.params,
    );
    res.json({ resumes: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/resumes", async (req, res, next) => {
  try {
    const scope = getResumeScope(req);
    const data = validateResumePayload(req.body);
    const id = crypto.randomUUID();
    const title = getResumeTitle(data);
    const ownerEmail = data.profile?.email || null;

    const result = await pool.query(
      `INSERT INTO resumes (id, client_id, user_id, title, owner_email, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, owner_email, data, created_at, updated_at`,
      [id, scope.clientId, scope.userId, title, ownerEmail, data],
    );

    res.status(201).json({ resume: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/resumes/:id", async (req, res, next) => {
  try {
    const resumeId = validateUuid(req.params.id, "resume id");
    const scope = getResumeScope(req, 2);
    const result = await pool.query(
      `SELECT id, title, owner_email, data, created_at, updated_at
       FROM resumes
       WHERE id = $1 AND ${scope.where}`,
      [resumeId, ...scope.params],
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    res.json({ resume: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.put("/api/resumes/:id", async (req, res, next) => {
  try {
    const resumeId = validateUuid(req.params.id, "resume id");
    const scope = getResumeScope(req, 5);
    const data = validateResumePayload(req.body);
    const title = getResumeTitle(data);
    const ownerEmail = data.profile?.email || null;

    const result = await pool.query(
      `UPDATE resumes
       SET title = $2,
           owner_email = $3,
           data = $4,
           updated_at = NOW()
       WHERE id = $1 AND ${scope.where}
       RETURNING id, title, owner_email, data, created_at, updated_at`,
      [resumeId, title, ownerEmail, data, ...scope.params],
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    res.json({ resume: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/resumes/:id", async (req, res, next) => {
  try {
    const resumeId = validateUuid(req.params.id, "resume id");
    const scope = getResumeScope(req, 2);
    const result = await pool.query(`DELETE FROM resumes WHERE id = $1 AND ${scope.where}`, [
      resumeId,
      ...scope.params,
    ]);
    res.status(result.rowCount ? 204 : 404).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (error.message === "Origin is not allowed by CORS.") {
    error.statusCode = 403;
  }
  const status = error.statusCode || 500;
  if (status === 500) {
    console.error(`[${req.requestId}]`, error);
  }
  res.status(status).json({
    error: status === 500 ? "Unexpected server error" : error.message,
    requestId: req.requestId,
  });
});

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Resume Builder API listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });

function getResumeScope(req, parameterStart = 1) {
  if (req.user) {
    return {
      where: `user_id = $${parameterStart}`,
      params: [req.user.id],
      userId: req.user.id,
      clientId: getClientId(req, false) || `user:${req.user.id}`,
    };
  }

  const clientId = getClientId(req, true);
  return {
    where: `client_id = $${parameterStart} AND user_id IS NULL`,
    params: [clientId],
    userId: null,
    clientId,
  };
}

function getClientId(req, required = true) {
  const clientId = String(req.get("x-client-id") || "").trim();
  if (!clientId && !required) return "";
  if (!clientId || clientId.length > 120 || !/^[a-zA-Z0-9:._-]+$/.test(clientId)) {
    const error = new Error("Missing or invalid workspace id.");
    error.statusCode = 400;
    throw error;
  }
  return clientId;
}

function optionalAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    next();
    return;
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name || "" }, jwtSecret, { expiresIn: "7d" });
}

function getResumeTitle(data) {
  const name = data.profile?.name?.trim();
  const title = data.profile?.title?.trim();
  return [name, title].filter(Boolean).join(" - ") || "Untitled Resume";
}

async function claimAnonymousResumes(userId, clientId) {
  if (!clientId) return 0;

  const result = await pool.query(
    `UPDATE resumes
     SET user_id = $1,
         updated_at = NOW()
     WHERE client_id = $2
       AND user_id IS NULL`,
    [userId, clientId],
  );

  return result.rowCount;
}

async function extractResumeText(file) {
  const name = file.originalname.toLowerCase();
  const mime = file.mimetype;

  if (name.endsWith(".docx") || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return normalizeExtractedText(result.value);
  }

  if (name.endsWith(".pdf") || mime === "application/pdf") {
    return extractPdfText(file.buffer);
  }

  if (name.endsWith(".txt") || mime.startsWith("text/")) {
    return normalizeExtractedText(file.buffer.toString("utf8"));
  }

  if (name.endsWith(".json") || mime === "application/json") {
    const parsed = JSON.parse(file.buffer.toString("utf8"));
    return validateResumePayload(parsed);
  }

  const error = new Error("Import supports PDF, DOCX, TXT, and resume-builder JSON files.");
  error.statusCode = 400;
  throw error;
}

async function extractPdfText(buffer) {
  let parser;

  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return normalizeExtractedText(result.text);
  } catch (error) {
    const importError = new Error(
      error.name === "PasswordException"
        ? "That PDF is password protected. Remove the password or import a DOCX/TXT version."
        : "Could not read that PDF. Try a text-based PDF, DOCX, TXT, or resume-builder JSON file.",
    );
    importError.statusCode = 400;
    throw importError;
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
}

function normalizeExtractedText(value) {
  const text = String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length < 40) {
    const error = new Error("Could not extract enough text from that resume. Try a text-based PDF, DOCX, or JSON export.");
    error.statusCode = 400;
    throw error;
  }

  return text.slice(0, 30000);
}

function buildResumeFromText(text) {
  if (typeof text === "object") return text;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || "";
  const links = lines.filter((line) => /linkedin|github|https?:\/\//i.test(line));
  const name = findName(lines, email, phone);
  const title = findTitle(lines, name, email, phone);
  const sections = splitSections(lines);
  const skills = parseSkills(sections.skills);
  const experience = parseExperience(sections.experience);
  const education = parseEducation(sections.education);
  const certifications = parseCertifications(sections.certifications);
  const projects = parseProjects(sections.projects);

  return validateResumePayload({
    profile: {
      name,
      title,
      email,
      phone,
      location: "",
      website: links.find((link) => !/linkedin|github/i.test(link)) || "",
      linkedin: links.find((link) => /linkedin/i.test(link)) || "",
      github: links.find((link) => /github/i.test(link)) || "",
    },
    sections: {
      summary: true,
      skills: true,
      experience: true,
      projects: true,
      education: true,
      certifications: true,
    },
    summary: sections.summary.slice(0, 5).join(" "),
    skills,
    experience,
    education,
    certifications,
    projects,
  });
}

function findName(lines, email, phone) {
  return (
    lines.find(
      (line) =>
        line.length <= 80 &&
        !line.includes("@") &&
        line !== phone &&
        !/resume|curriculum|profile|summary|experience|education|skills/i.test(line),
    ) || ""
  );
}

function findTitle(lines, name, email, phone) {
  return (
    lines.find(
      (line) =>
        line &&
        line !== name &&
        line !== email &&
        line !== phone &&
        line.length <= 120 &&
        !/linkedin|github|https?:\/\//i.test(line),
    ) || ""
  );
}

function splitSections(lines) {
  const buckets = {
    summary: [],
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
  };
  let current = "summary";

  for (const line of lines) {
    const key = sectionKey(line);
    if (key) {
      current = key;
      continue;
    }
    buckets[current].push(line.replace(/^[•*-]\s*/, ""));
  }

  return buckets;
}

function sectionKey(line) {
  const normalized = line.toLowerCase().replace(/[^a-z ]/g, "").trim();
  if (/^(summary|profile|professional summary|objective)$/.test(normalized)) return "summary";
  if (/^(skills|technical skills|core skills|competencies)$/.test(normalized)) return "skills";
  if (/^(experience|work experience|professional experience|employment)$/.test(normalized)) return "experience";
  if (/^(education|academic background)$/.test(normalized)) return "education";
  if (/^(certifications|certificates|licenses)$/.test(normalized)) return "certifications";
  if (/^(projects|portfolio|selected projects)$/.test(normalized)) return "projects";
  return "";
}

function parseSkills(lines) {
  const items = lines
    .join(",")
    .split(/[,|•]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 18);
  return [{ label: "Imported Skills", items: items.length ? items : [""] }];
}

function parseExperience(lines) {
  const chunks = chunkLines(lines);
  return chunks.slice(0, 6).map((chunk) => ({
    role: chunk[0] || "",
    company: chunk[1] || "",
    location: "",
    start: "",
    end: "",
    bullets: chunk.slice(2, 7).length ? chunk.slice(2, 7) : [chunk[1] || ""],
  }));
}

function parseEducation(lines) {
  return chunkLines(lines).slice(0, 6).map((chunk) => ({
    degree: chunk[0] || "",
    institute: chunk[1] || "",
    location: "",
    year: findYear(chunk.join(" ")),
  }));
}

function parseCertifications(lines) {
  return lines.slice(0, 10).map((line) => ({
    name: line,
    issuer: "",
    year: findYear(line),
    url: "",
  }));
}

function parseProjects(lines) {
  return chunkLines(lines).slice(0, 6).map((chunk) => ({
    name: chunk[0] || "",
    role: "",
    url: chunk.find((line) => /https?:\/\//i.test(line)) || "",
    bullets: chunk.slice(1, 6).length ? chunk.slice(1, 6) : [""],
  }));
}

function chunkLines(lines) {
  const chunks = [];
  let current = [];

  for (const line of lines) {
    if (current.length >= 5 || (/^[A-Z][A-Za-z\s/&.-]{2,80}$/.test(line) && current.length >= 2)) {
      chunks.push(current);
      current = [];
    }
    current.push(line);
  }

  if (current.length) chunks.push(current);
  return chunks.filter((chunk) => chunk.some(Boolean));
}

function findYear(value) {
  return String(value || "").match(/\b(19|20)\d{2}\b/)?.[0] || "";
}

function assignRequestId(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

function rateLimit({ windowMs, max }) {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;
    if (current.count > max) {
      res.status(429).json({ error: "Too many requests. Try again shortly.", requestId: req.requestId });
      return;
    }

    next();
  };
}
