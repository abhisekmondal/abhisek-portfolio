require("dotenv").config();

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const mammoth = require("mammoth");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { PDFParse } = require("pdf-parse");
const { initDatabase, pool } = require("./db");
const {
  validateAuthPayload,
  validatePasswordResetPayload,
  validatePasswordResetRequest,
  validateResumePayload,
  validateUuid,
} = require("./validation");

const app = express();
const port = Number(process.env.API_PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "dev-only-change-me";
const resetTokenTtlMinutes = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES || 30);
const verificationTokenTtlMinutes = Number(process.env.EMAIL_VERIFICATION_TOKEN_MINUTES || 60 * 24);
const appUrl = String(process.env.APP_URL || process.env.CORS_ORIGIN?.split(",")[0] || "http://localhost:3000").trim();
const mailFrom = process.env.MAIL_FROM || "Resume Builder <no-reply@example.com>";
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
    const existing = await pool.query("SELECT id, email, password_hash, name, email_verified_at FROM users WHERE LOWER(email) = LOWER($1)", [email]);

    if (existing.rowCount) {
      const existingUser = existing.rows[0];
      if (!existingUser.email_verified_at && (await bcrypt.compare(password, existingUser.password_hash))) {
        const verificationToken = await createEmailVerificationToken(existingUser.id);
        await sendAccountVerificationEmail({
          to: existingUser.email,
          name: existingUser.name,
          verifyUrl: buildEmailVerificationUrl(verificationToken),
          expiresInMinutes: verificationTokenTtlMinutes,
        });

        res.json({
          ok: true,
          message: "Account already exists but is not verified. Check your email for a new verification link.",
          emailSent: true,
        });
        return;
      }

      res.status(409).json({ error: "An account already exists for this email. Sign in or reset your password." });
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

    const user = result.rows[0];
    const verificationToken = await createEmailVerificationToken(user.id);
    await sendAccountVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl: buildEmailVerificationUrl(verificationToken),
      expiresInMinutes: verificationTokenTtlMinutes,
    });

    res.status(201).json({
      ok: true,
      message: "Account created. Check your email to verify your account.",
      emailSent: true,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = validateAuthPayload(req.body);
    const clientId = getClientId(req, false);
    const result = await pool.query(
      `SELECT users.id,
              users.email,
              users.password_hash,
              users.name,
              users.email_verified_at,
              users.created_at,
              EXISTS (
                SELECT 1
                FROM email_verification_tokens evt
                WHERE evt.user_id = users.id
                  AND evt.used_at IS NULL
                  AND evt.expires_at > NOW()
              ) AS has_pending_verification
       FROM users
       WHERE LOWER(users.email) = LOWER($1)`,
      [email],
    );

    if (!result.rowCount || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const { password_hash, has_pending_verification, ...user } = result.rows[0];
    if (!user.email_verified_at || has_pending_verification) {
      res.status(403).json({ error: "Verify your email before signing in.", code: "EMAIL_NOT_VERIFIED", email: user.email });
      return;
    }

    const claimed = await claimAnonymousResumes(user.id, clientId);
    res.json({ user, token: signToken(user), claimed });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/resend-verification", async (req, res, next) => {
  try {
    const { email, password } = validateAuthPayload(req.body);
    const result = await pool.query(
      `SELECT users.id,
              users.email,
              users.password_hash,
              users.name,
              users.email_verified_at,
              EXISTS (
                SELECT 1
                FROM email_verification_tokens evt
                WHERE evt.user_id = users.id
                  AND evt.used_at IS NULL
                  AND evt.expires_at > NOW()
              ) AS has_pending_verification
       FROM users
       WHERE LOWER(users.email) = LOWER($1)`,
      [email],
    );

    if (!result.rowCount || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const user = result.rows[0];
    if (user.email_verified_at && !user.has_pending_verification) {
      res.json({ ok: true, message: "Your account is already verified. Sign in to continue.", alreadyVerified: true });
      return;
    }

    const verificationToken = await createEmailVerificationToken(user.id);
    await sendAccountVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl: buildEmailVerificationUrl(verificationToken),
      expiresInMinutes: verificationTokenTtlMinutes,
    });

    res.json({
      ok: true,
      message: "Verification email sent. Check your inbox to activate your account.",
      emailSent: true,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/verify-email", async (req, res, next) => {
  try {
    const token = readHexToken(req.body?.token, "verification token");
    const tokenHash = hashToken(token);
    const tokenResult = await pool.query(
      `SELECT evt.id, evt.user_id, users.email, users.name, users.email_verified_at
       FROM email_verification_tokens evt
       JOIN users ON users.id = evt.user_id
       WHERE evt.token_hash = $1
         AND evt.used_at IS NULL
         AND evt.expires_at > NOW()`,
      [tokenHash],
    );

    if (!tokenResult.rowCount) {
      res.status(400).json({ error: "Verification link is invalid or expired." });
      return;
    }

    const record = tokenResult.rows[0];
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE users
         SET email_verified_at = COALESCE(email_verified_at, NOW()),
             updated_at = NOW()
         WHERE id = $1`,
        [record.user_id],
      );
      await client.query("UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1", [record.id]);
      await client.query(
        "UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
        [record.user_id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const onboardingEmailSent = await sendOnboardingEmail({ to: record.email, name: record.name }).catch((error) => {
      console.warn(`[${req.requestId}] Failed to send onboarding email to ${record.email}: ${error.message}`);
      return false;
    });

    res.json({
      ok: true,
      message: "Your email is verified. Sign in to open your workspace.",
      email: record.email,
      onboardingEmailSent,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/forgot-password", async (req, res, next) => {
  try {
    const { email } = validatePasswordResetRequest(req.body);
    const genericMessage = "If an account exists for that email, a password reset link has been prepared.";
    const userResult = await pool.query("SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)", [email]);

    if (!userResult.rowCount) {
      res.json({ ok: true, message: genericMessage });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + resetTokenTtlMinutes * 60 * 1000);

    await pool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [crypto.randomUUID(), userResult.rows[0].id, tokenHash, expiresAt],
    );

    const resetUrl = buildPasswordResetUrl(resetToken);
    const emailSent = await sendPasswordResetEmail({
      to: userResult.rows[0].email,
      resetUrl,
      expiresInMinutes: resetTokenTtlMinutes,
    });

    const response = {
      ok: true,
      message: genericMessage,
      emailSent,
      expiresInMinutes: resetTokenTtlMinutes,
    };

    if (shouldExposeResetToken()) {
      response.resetToken = resetToken;
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/reset-password", async (req, res, next) => {
  try {
    const { token, password } = validatePasswordResetPayload(req.body);
    const tokenHash = hashToken(token);
    const tokenResult = await pool.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash],
    );

    if (!tokenResult.rowCount) {
      res.status(400).json({ error: "Reset token is invalid or expired." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [
        passwordHash,
        tokenResult.rows[0].user_id,
      ]);
      await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [tokenResult.rows[0].id]);
      await client.query(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
        [tokenResult.rows[0].user_id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json({ ok: true, message: "Password has been reset. Sign in with your new password." });
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

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createEmailVerificationToken(userId) {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + verificationTokenTtlMinutes * 60 * 1000);

  await pool.query(
    `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [crypto.randomUUID(), userId, hashToken(verificationToken), expiresAt],
  );

  return verificationToken;
}

function readHexToken(value, label) {
  const token = String(value || "").trim();
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    const error = new Error(`A valid ${label} is required.`);
    error.statusCode = 400;
    throw error;
  }
  return token;
}

function shouldExposeResetToken() {
  return process.env.NODE_ENV !== "production" || process.env.PASSWORD_RESET_EXPOSE_TOKEN === "true";
}

function buildPasswordResetUrl(token) {
  const url = new URL(appUrl || "http://localhost:3000");
  url.searchParams.set("auth", "reset");
  url.searchParams.set("resetToken", token);
  return url.toString();
}

function buildEmailVerificationUrl(token) {
  const url = new URL(appUrl || "http://localhost:3000");
  url.searchParams.set("auth", "verify");
  url.searchParams.set("verifyToken", token);
  return url.toString();
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

async function sendPasswordResetEmail({ to, resetUrl, expiresInMinutes }) {
  if (!hasSmtpConfig()) {
    if (process.env.NODE_ENV === "production" && !shouldExposeResetToken()) {
      throw Object.assign(new Error("Password reset email is not configured."), { statusCode: 503 });
    }
    console.info(`Password reset link for ${to}: ${resetUrl}`);
    return false;
  }

  const subject = "Reset your Resume Builder password";
  await sendMailOrThrow({
    from: mailFrom,
    to,
    subject,
    text: [
      "Resume Builder",
      "",
      "Use the link below to reset your Resume Builder password.",
      "",
      resetUrl,
      "",
      `This link expires in ${expiresInMinutes} minutes.`,
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: buildEmailHtml({
      eyebrow: "Password reset",
      title: subject,
      intro: "Use the secure link below to set a new password for your Resume Builder account.",
      ctaLabel: "Reset password",
      ctaUrl: resetUrl,
      details: [
        `This link expires in ${expiresInMinutes} minutes.`,
        "If you did not request this, you can ignore this email.",
      ],
    }),
  });

  return true;
}

async function sendAccountVerificationEmail({ to, name, verifyUrl, expiresInMinutes }) {
  if (!hasSmtpConfig()) {
    const error = new Error("Account verification email is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const displayName = name || "there";
  const hours = Math.max(1, Math.round(expiresInMinutes / 60));
  const subject = "Verify your Resume Builder account";
  await sendMailOrThrow({
    from: mailFrom,
    to,
    subject,
    text: [
      "Resume Builder",
      "",
      `Hi ${displayName},`,
      "",
      "Your Resume Builder account has been created.",
      "Use the link below to verify your email and activate your workspace.",
      "",
      verifyUrl,
      "",
      `This verification link expires in about ${hours} hour${hours === 1 ? "" : "s"}.`,
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: buildEmailHtml({
      eyebrow: "Account verification",
      title: "Verify your email to activate your workspace",
      greeting: `Hi ${displayName},`,
      intro: "Your account has been created. Verify your email to activate your private workspace and start building resumes.",
      ctaLabel: "Verify email",
      ctaUrl: verifyUrl,
      details: [
        `This verification link expires in about ${hours} hour${hours === 1 ? "" : "s"}.`,
        "If you did not create this account, you can ignore this email.",
      ],
    }),
  });

  return true;
}

async function sendOnboardingEmail({ to, name }) {
  if (!hasSmtpConfig()) {
    console.info(`Onboarding email skipped for ${to}: SMTP is not configured.`);
    return false;
  }

  const displayName = name || "there";
  const url = appUrl || "http://localhost:3000";
  const subject = "Welcome to Resume Builder";

  await sendMailOrThrow({
    from: mailFrom,
    to,
    subject,
    text: [
      "Resume Builder",
      "",
      `Hi ${displayName},`,
      "",
      "Welcome to Resume Builder. Your workspace is ready.",
      "",
      "You can now import an existing resume, edit sections with live preview, save drafts to cloud storage, and export a clean PDF.",
      "",
      `Open your workspace: ${url}`,
      "",
      "Thanks,",
      "Resume Builder",
    ].join("\n"),
    html: buildEmailHtml({
      eyebrow: "Workspace ready",
      title: subject,
      greeting: `Hi ${displayName},`,
      intro: "Your workspace is ready. You can import an existing resume, edit it with live preview, save drafts to cloud storage, and export a clean PDF.",
      ctaLabel: "Open Resume Builder",
      ctaUrl: url,
      details: [
        "A sample resume is available before sign-in, and your private tools are available inside your workspace.",
        "If you did not create this account, you can ignore this email.",
      ],
    }),
  });

  return true;
}

function createMailTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || "",
        }
      : undefined,
  });
}

async function sendMailOrThrow(message) {
  try {
    const transporter = createMailTransporter();
    await transporter.sendMail(message);
  } catch (error) {
    const mailError = new Error("Email service is unavailable. Please try again later.");
    mailError.statusCode = 503;
    mailError.cause = error;
    throw mailError;
  }
}

function buildEmailHtml({ eyebrow, title, greeting, intro, ctaLabel, ctaUrl, details = [] }) {
  const safeUrl = escapeHtml(ctaUrl);
  const detailItems = details
    .filter(Boolean)
    .map((detail) => `<p style="margin: 0 0 10px; color: #64748b; font-size: 13px; line-height: 1.55;">${escapeHtml(detail)}</p>`)
    .join("");
  const greetingBlock = greeting
    ? `<p style="margin: 0 0 10px; color: #334155; font-size: 15px; line-height: 1.6;">${escapeHtml(greeting)}</p>`
    : "";

  return `
    <!doctype html>
    <html>
      <body style="margin: 0; padding: 0; background: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%; background: #f1f5f9; margin: 0; padding: 28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 18px 22px; background: #0f172a; border-radius: 14px 14px 0 0;">
                    <div style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 0;">Resume Builder</div>
                    <div style="margin-top: 4px; color: #67e8f9; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">${escapeHtml(eyebrow)}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 28px 24px 22px; background: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                    <h1 style="margin: 0 0 14px; color: #0f172a; font-size: 24px; line-height: 1.2; font-weight: 800;">${escapeHtml(title)}</h1>
                    ${greetingBlock}
                    <p style="margin: 0 0 22px; color: #334155; font-size: 15px; line-height: 1.6;">${escapeHtml(intro)}</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 20px;">
                      <tr>
                        <td style="border-radius: 8px; background: #0891b2;">
                          <a href="${safeUrl}" style="display: inline-block; padding: 12px 18px; color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 8px;">
                            ${escapeHtml(ctaLabel)}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 14px; color: #64748b; font-size: 13px; line-height: 1.55;">
                      If the button does not work, copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0; word-break: break-all;">
                      <a href="${safeUrl}" style="color: #0891b2; font-size: 13px; line-height: 1.55;">${safeUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 24px 8px; background: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                    ${detailItems}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 14px 14px;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                      Resume Builder sends account and workspace emails for your security. Please do not reply to this automated message.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
