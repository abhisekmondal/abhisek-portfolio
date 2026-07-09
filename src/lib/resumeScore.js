const actionVerbs = /\b(achieved|automated|built|created|delivered|designed|developed|drove|implemented|improved|increased|launched|led|managed|migrated|optimized|reduced|shipped|streamlined)\b/i;
const measurableImpact = /\d|%|\$|kpi|revenue|cost|latency|performance|conversion|retention|uptime|efficiency|productivity/i;

export function getResumeScore(resume) {
  const checks = [
    scoreProfile(resume),
    scoreSummary(resume),
    scoreExperience(resume),
    scoreBullets(resume),
    scoreSkills(resume),
    scoreEducation(resume),
    scoreProof(resume),
    scoreAts(resume),
  ];

  const score = Math.min(100, Math.max(0, Math.round(checks.reduce((total, check) => total + check.points, 0))));
  const suggestions = checks
    .flatMap((check) => check.suggestions)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);

  return {
    score,
    label: getScoreLabel(score),
    summary: getScoreSummary(score, suggestions.length),
    suggestions,
    checks,
  };
}

export function getResumeLength(resume) {
  const words = estimateResumeWords(resume);
  const min = 250;
  const max = 750;
  const detailLimit = 800;

  if (words < min) {
    return {
      words,
      min,
      max,
      target: `${min}-${max} words`,
      label: "Too short",
      status: "short",
      percent: Math.min(100, Math.round((words / min) * 45)),
      message: "Add role-specific bullets, skills, projects, or education details so recruiters see enough substance.",
    };
  }

  if (words <= 650) {
    return {
      words,
      min,
      max,
      target: `${min}-${max} words`,
      label: "Focused",
      status: "ideal",
      percent: Math.min(100, Math.round((words / max) * 100)),
      message: "Good length for a focused one-page resume. Keep the strongest, most relevant details visible.",
    };
  }

  if (words <= detailLimit) {
    return {
      words,
      min,
      max,
      target: `${min}-${max} words`,
      label: "Detailed",
      status: "detailed",
      percent: Math.min(100, Math.round((words / detailLimit) * 100)),
      message: "Still usable, but check whether older or weaker details can be tightened before export.",
    };
  }

  return {
    words,
    min,
    max,
    target: `${min}-${max} words`,
    label: "Too long",
    status: "long",
    percent: 100,
    message: "Trim repeated, older, or less relevant detail to keep the resume fast to scan.",
  };
}

function scoreProfile(resume) {
  const profile = resume.profile || {};
  const fields = [profile.name, profile.title, profile.email, profile.phone, profile.location].filter(hasText).length;
  const links = [profile.linkedin, profile.website, profile.github].filter(hasText).length;
  const points = Math.min(16, fields * 2.6 + Math.min(3, links * 1.5));
  const suggestions = [];

  if (!hasText(profile.name)) suggestions.push(suggestion("Add your full name.", 5, "profile"));
  if (!hasText(profile.title)) suggestions.push(suggestion("Add a target role or professional headline.", 5, "profile"));
  if (!hasText(profile.email)) suggestions.push(suggestion("Add a professional email address.", 5, "profile"));
  if (!hasText(profile.phone)) suggestions.push(suggestion("Add a phone number for recruiter contact.", 3, "profile"));
  if (!hasText(profile.location)) suggestions.push(suggestion("Add your location or remote preference.", 2, "profile"));
  if (!links) suggestions.push(suggestion("Add LinkedIn, portfolio, or GitHub if relevant.", 2, "profile"));

  return { id: "profile", label: "Profile", points, suggestions };
}

function scoreSummary(resume) {
  const words = wordCount(resume.summary);
  let points = 0;
  if (words >= 25) points += 5;
  if (words >= 40 && words <= 95) points += 5;
  if (actionVerbs.test(resume.summary || "") || measurableImpact.test(resume.summary || "")) points += 2;

  const suggestions = [];
  if (words < 25) suggestions.push(suggestion("Write a 3-5 line summary with your role, strengths, and impact.", 5, "summary"));
  if (words > 110) suggestions.push(suggestion("Shorten the summary so recruiters can scan it quickly.", 3, "summary"));

  return { id: "summary", label: "Summary", points: Math.min(12, points), suggestions };
}

function scoreExperience(resume) {
  const entries = resume.experience.filter(hasExperienceContent);
  const completeEntries = entries.filter((item) => hasText(item.role) && hasText(item.company) && hasText(item.start));
  let points = 0;
  if (entries.length >= 1) points += 7;
  if (entries.length >= 2) points += 4;
  if (completeEntries.length >= Math.min(entries.length, 2)) points += 4;

  const suggestions = [];
  if (!entries.length) suggestions.push(suggestion("Add at least one work experience entry.", 8, "experience"));
  if (entries.length && completeEntries.length < entries.length) {
    suggestions.push(suggestion("Complete role, company, and date fields for experience entries.", 4, "experience"));
  }

  return { id: "experience", label: "Experience", points: Math.min(15, points), suggestions };
}

function scoreBullets(resume) {
  const bullets = resume.experience.flatMap((item) => item.bullets || []).filter(hasText);
  const strongBullets = bullets.filter((bullet) => actionVerbs.test(bullet) && measurableImpact.test(bullet));
  let points = 0;
  if (bullets.length >= 3) points += 5;
  if (bullets.length >= 6) points += 4;
  if (strongBullets.length >= 2) points += 6;
  if (strongBullets.length >= 4) points += 3;

  const suggestions = [];
  if (bullets.length < 3) suggestions.push(suggestion("Add 3-6 bullets that describe ownership, scope, and outcomes.", 6, "experience"));
  if (strongBullets.length < 2 && bullets.length) {
    suggestions.push(suggestion("Add measurable impact to at least two experience bullets.", 7, "experience"));
  }

  return { id: "impact", label: "Impact bullets", points: Math.min(18, points), suggestions };
}

function scoreSkills(resume) {
  const skills = resume.skills.flatMap((group) => group.items || []).filter(hasText);
  const groups = resume.skills.filter((group) => hasText(group.label) && (group.items || []).filter(hasText).length >= 2);
  let points = 0;
  if (skills.length >= 6) points += 5;
  if (skills.length >= 10) points += 4;
  if (groups.length >= 2) points += 3;

  const suggestions = [];
  if (skills.length < 6) suggestions.push(suggestion("Add 6-12 relevant skills matched to your target role.", 5, "skills"));
  if (groups.length < 2) suggestions.push(suggestion("Group skills into focused categories for faster scanning.", 3, "skills"));

  return { id: "skills", label: "Skills", points: Math.min(12, points), suggestions };
}

function scoreEducation(resume) {
  const entries = resume.education.filter((item) => hasText(item.degree) || hasText(item.institute));
  const complete = entries.some((item) => hasText(item.degree) && hasText(item.institute));
  const points = complete ? 8 : entries.length ? 4 : 0;
  const suggestions = complete ? [] : [suggestion("Add education with degree and institution.", 3, "education")];
  return { id: "education", label: "Education", points, suggestions };
}

function scoreProof(resume) {
  const projects = resume.projects.filter((item) => hasText(item.name) || (item.bullets || []).some(hasText)).length;
  const certs = resume.certifications.filter((item) => hasText(item.name) || hasText(item.issuer)).length;
  const points = Math.min(9, projects * 3 + certs * 2);
  const suggestions = points ? [] : [suggestion("Add a relevant project or certification to strengthen proof of skill.", 2, "projects")];
  return { id: "proof", label: "Proof points", points, suggestions };
}

function scoreAts(resume) {
  const visibleSections = Object.values(resume.sections || {}).filter(Boolean).length;
  const hasContact = hasText(resume.profile?.email) || hasText(resume.profile?.phone);
  const totalBullets = resume.experience.flatMap((item) => item.bullets || []).filter(hasText).length;
  const totalWords = estimateResumeWords(resume);
  let points = 0;
  if (hasContact) points += 3;
  if (visibleSections >= 4) points += 3;
  if (totalBullets <= 18) points += 2;
  if (totalWords >= 250 && totalWords <= 750) points += 5;

  const suggestions = [];
  if (!hasContact) suggestions.push(suggestion("Include email or phone so ATS and recruiters can contact you.", 5, "profile"));
  if (totalWords < 250) suggestions.push(suggestion("Add more role-specific detail so the resume has enough substance.", 3, "experience"));
  if (totalWords > 800) suggestions.push(suggestion("Trim older or less relevant detail to keep the resume focused.", 3, "summary"));

  return { id: "ats", label: "ATS basics", points: Math.min(13, points), suggestions };
}

function getScoreLabel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Strong";
  if (score >= 55) return "Good start";
  return "Needs work";
}

function getScoreSummary(score, count) {
  if (score >= 90) return "Ready for final proofreading.";
  if (score >= 75) return `${count || "A few"} high-impact fix${count === 1 ? "" : "es"} left.`;
  if (score >= 55) return "Solid base, but impact and completeness can improve.";
  return "Focus on core sections before exporting.";
}

function suggestion(text, impact, target) {
  return { text, impact, target };
}

function hasText(value) {
  return Boolean(String(value || "").trim());
}

function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function hasExperienceContent(item) {
  return hasText(item.role) || hasText(item.company) || (item.bullets || []).some(hasText);
}

function estimateResumeWords(resume) {
  const fields = [
    resume.summary,
    ...Object.values(resume.profile || {}),
    ...resume.experience.flatMap((item) => [item.role, item.company, item.location, ...(item.bullets || [])]),
    ...resume.skills.flatMap((group) => [group.label, ...(group.items || [])]),
    ...resume.projects.flatMap((item) => [item.name, item.role, ...(item.bullets || [])]),
    ...resume.education.flatMap((item) => [item.degree, item.institute]),
    ...resume.certifications.flatMap((item) => [item.name, item.issuer]),
  ];
  return fields.reduce((total, field) => total + wordCount(field), 0);
}
