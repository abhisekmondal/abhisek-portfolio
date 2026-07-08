const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
const CLIENT_ID_KEY = "resume-builder-client-id-v1";
const AUTH_TOKEN_KEY = "resume-builder-auth-token-v1";
const AUTH_USER_KEY = "resume-builder-auth-user-v1";

export async function saveResumeToApi(resumeId, resume) {
  const response = await fetch(`${API_BASE}/api/resumes${resumeId ? `/${resumeId}` : ""}`, {
    method: resumeId ? "PUT" : "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ data: resume }),
  });

  return readApiResponse(response);
}

export async function listResumesFromApi() {
  const response = await fetch(`${API_BASE}/api/resumes`, {
    headers: apiHeaders(),
  });
  return readApiResponse(response);
}

export async function getResumeFromApi(resumeId) {
  const response = await fetch(`${API_BASE}/api/resumes/${resumeId}`, {
    headers: apiHeaders(),
  });
  return readApiResponse(response);
}

export async function deleteResumeFromApi(resumeId) {
  const response = await fetch(`${API_BASE}/api/resumes/${resumeId}`, {
    method: "DELETE",
    headers: apiHeaders(),
  });

  if (response.status === 204) {
    return { ok: true };
  }

  return readApiResponse(response);
}

export async function loadLatestResumeFromApi() {
  const list = await listResumesFromApi();
  const latest = list.resumes?.[0];

  if (!latest) {
    return null;
  }

  return getResumeFromApi(latest.id);
}

export async function importResumeFile(file) {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await fetch(`${API_BASE}/api/import-resume`, {
    method: "POST",
    headers: apiHeaders(),
    body: formData,
  });

  return readApiResponse(response);
}

export async function checkApiHealth() {
  const response = await fetch(`${API_BASE}/api/health`);
  return readApiResponse(response);
}

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const result = await readApiResponse(response);
  return result;
}

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const result = await readApiResponse(response);
  storeSession(result);
  return result;
}

export async function resendVerificationEmail(payload) {
  const response = await fetch(`${API_BASE}/api/auth/resend-verification`, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readApiResponse(response);
}

export async function requestPasswordReset(payload) {
  const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readApiResponse(response);
}

export async function resetPassword(payload) {
  const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readApiResponse(response);
}

export async function verifyEmail(payload) {
  const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readApiResponse(response);
}

export function logoutUser() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getStoredUser() {
  try {
    const user = localStorage.getItem(AUTH_USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function getClientId() {
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;

  const generated =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(CLIENT_ID_KEY, generated);
  return generated;
}

function apiHeaders(headers = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return {
    ...headers,
    "x-client-id": getClientId(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function storeSession(result) {
  if (!result.token || !result.user) return;
  localStorage.setItem(AUTH_TOKEN_KEY, result.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
}

async function readApiResponse(response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(body.error || `API request failed with ${response.status}`);
    error.status = response.status;
    error.code = body.code || "";
    error.details = body;
    throw error;
  }

  return body;
}
