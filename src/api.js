const productionOrigin = typeof window !== "undefined" ? window.location.origin : "";
const explicitApiBase = import.meta.env.VITE_API_BASE_URL;
const API_BASE = explicitApiBase || (import.meta.env.PROD ? productionOrigin : "http://localhost:8787");

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(body?.error || `Request failed with ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export function exchangeMagicToken(token, sessionId) {
  return apiRequest("/api/auth/link/exchange", {
    method: "POST",
    body: JSON.stringify({ token, sessionId }),
  });
}

export function loadWorkoutSession(sessionId) {
  return apiRequest(`/api/workout-sessions/${encodeURIComponent(sessionId)}`);
}

export function submitOnboarding(memberId, payload) {
  return apiRequest(`/api/onboarding/${encodeURIComponent(memberId)}/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postWorkoutEvent(sessionId, eventType, payload = {}) {
  return apiRequest(`/api/workout-sessions/${encodeURIComponent(sessionId)}/events`, {
    method: "POST",
    body: JSON.stringify({
      eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      eventType,
      payload,
    }),
  });
}
