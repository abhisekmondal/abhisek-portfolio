const assert = require("node:assert/strict");
const test = require("node:test");
const {
  validateAuthPayload,
  validatePasswordResetPayload,
  validatePasswordResetRequest,
  validateResumePayload,
  validateUuid,
} = require("./validation");

const validResume = {
  profile: {
    name: "Alex Morgan",
    title: "Senior Product Manager",
    email: "alex@example.com",
    phone: "+1 555 0100",
    location: "Austin, TX",
    website: "alex.example.com",
    linkedin: "linkedin.com/in/alex",
    github: "",
  },
  sections: {
    summary: true,
    skills: true,
    experience: true,
    projects: true,
    education: true,
    certifications: true,
  },
  summary: "Product leader with measurable SaaS delivery experience.",
  skills: [{ label: "Strategy", items: ["Discovery", "Roadmaps", "Analytics"] }],
  experience: [
    {
      role: "Senior Product Manager",
      company: "Northstar Labs",
      location: "Austin, TX",
      start: "2021",
      end: "Present",
      bullets: ["Improved activation by 22% through onboarding experiments."],
    },
  ],
  education: [{ degree: "BBA", institute: "State University", location: "Austin, TX", year: "2016" }],
  certifications: [{ name: "Product Management", issuer: "Product School", year: "2021", url: "" }],
  projects: [{ name: "Reporting Launch", role: "Product Lead", url: "", bullets: ["Launched reporting workflow."] }],
};

test("validateAuthPayload normalizes valid auth input", () => {
  const result = validateAuthPayload({
    email: "  ALEX@Example.COM ",
    password: "password123",
    name: "  Alex Morgan  ",
  });

  assert.deepEqual(result, {
    email: "alex@example.com",
    password: "password123",
    name: "Alex Morgan",
  });
});

test("validateAuthPayload rejects invalid email and weak password", () => {
  assertBadRequest(() => validateAuthPayload({ email: "bad", password: "password123" }), "A valid email is required.");
  assertBadRequest(
    () => validateAuthPayload({ email: "alex@example.com", password: "short" }),
    "Password must be 8 to 120 characters.",
  );
});

test("password reset validators normalize email and require valid token and password", () => {
  assert.deepEqual(validatePasswordResetRequest({ email: "  ALEX@Example.COM " }), { email: "alex@example.com" });
  assert.deepEqual(validatePasswordResetPayload({ token: "a".repeat(64), password: "newpassword123" }), {
    token: "a".repeat(64),
    password: "newpassword123",
  });

  assertBadRequest(() => validatePasswordResetRequest({ email: "bad" }), "A valid email is required.");
  assertBadRequest(
    () => validatePasswordResetPayload({ token: "bad", password: "newpassword123" }),
    "A valid reset token is required.",
  );
  assertBadRequest(
    () => validatePasswordResetPayload({ token: "a".repeat(64), password: "short" }),
    "Password must be 8 to 120 characters.",
  );
});

test("validateUuid accepts valid UUIDs and rejects malformed IDs", () => {
  const id = "7d4a4b6e-4d16-4f4d-9d2a-2be94d8f3ad1";

  assert.equal(validateUuid(id, "resume id"), id);
  assertBadRequest(() => validateUuid("not-a-uuid", "resume id"), "Invalid resume id.");
});

test("validateResumePayload accepts direct and wrapped resume data", () => {
  assert.equal(validateResumePayload(validResume).profile.email, "alex@example.com");
  assert.equal(validateResumePayload({ data: validResume }).experience[0].role, "Senior Product Manager");
});

test("validateResumePayload trims strings and caps oversized arrays", () => {
  const result = validateResumePayload({
    data: {
      ...validResume,
      profile: { ...validResume.profile, name: "  Alex Morgan  " },
      experience: Array.from({ length: 25 }, (_, index) => ({
        ...validResume.experience[0],
        role: `Role ${index}`,
      })),
    },
  });

  assert.equal(result.profile.name, "Alex Morgan");
  assert.deepEqual(result.experience, []);
});

test("validateResumePayload rejects non-object payloads and missing required shape", () => {
  assertBadRequest(() => validateResumePayload(null), "Resume payload must be an object.");
  assertBadRequest(() => validateResumePayload([]), "Resume payload must be an object.");
  assertBadRequest(() => validateResumePayload({ profile: null }), "Resume payload is invalid.");
});

function assertBadRequest(fn, message) {
  assert.throws(fn, (error) => {
    assert.equal(error.statusCode, 400);
    assert.equal(error.message, message);
    return true;
  });
}
