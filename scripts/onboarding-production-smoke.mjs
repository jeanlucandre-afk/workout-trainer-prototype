import { chromium } from "playwright";

const apiBase = process.env.SMOKE_API_BASE ?? "https://ai-personal-trainer-whatsapp-mvp.vercel.app";
const webBase = process.env.SMOKE_WEB_BASE ?? "https://workout-trainer-prototype.vercel.app";
const adminApiKey = process.env.SMOKE_ADMIN_API_KEY;

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function jsonFetch(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

async function createOnboardingLink() {
  const headers = { "content-type": "application/json" };
  if (adminApiKey) headers.authorization = `Bearer ${adminApiKey}`;
  const { response, body } = await jsonFetch(`${apiBase}/api/demo/onboarding-link`, {
    method: "POST",
    headers,
    body: JSON.stringify({ displayName: "Prototype Onboarding Smoke" }),
  });
  assert(response.ok && body?.onboardingUrl && body?.memberId, "onboarding link bootstrap failed", body);
  return body;
}

async function clickNext(page, label = /Next/i) {
  await page.getByRole("button", { name: label }).last().click();
}

async function choose(page, label) {
  await page.getByRole("button", { name: label }).first().click();
}

async function completeOnboarding(page) {
  await page.getByText(/Start with the basics/i).waitFor({ timeout: 15000 });
  await clickNext(page);
  await choose(page, /Build muscle/i);
  await clickNext(page);
  await choose(page, /Feel confident in the gym/i);
  await clickNext(page);
  await clickNext(page);
  await choose(page, /Beginner/i);
  await clickNext(page);
  await choose(page, /Machines/i);
  await clickNext(page);
  await choose(page, /Knee pain/i);
  await clickNext(page);
  await choose(page, /No major past injury/i);
  await clickNext(page);
  await choose(page, /Leg press/i);
  await clickNext(page);
  await choose(page, /Machines/i);
  await clickNext(page);
  await choose(page, /Moderate stress/i);
  await clickNext(page);
  await clickNext(page);
  await choose(page, /Staying consistent/i);
  await clickNext(page);
  await clickNext(page, /Build plan/i);
}

async function main() {
  const health = await fetch(`${apiBase}/health`);
  assert(health.status === 200, "backend health failed", { status: health.status });

  const onboarding = await createOnboardingLink();
  const onboardingUrl = onboarding.onboardingUrl.replace("https://workout-trainer-prototype.vercel.app", webBase);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const apiHits = [];
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/")) apiHits.push({ path: new URL(url).pathname, status: response.status() });
  });

  await page.goto(onboardingUrl, { waitUntil: "networkidle", timeout: 60000 });
  assert(!page.url().includes("token="), "onboarding magic token remained in browser URL", { url: page.url() });
  await completeOnboarding(page);

  await page.waitForURL(/\/workout\/[^?]+$/, { timeout: 90000 });
  await page.getByRole("button", { name: /START WORKOUT/i }).waitFor({ timeout: 30000 });
  const sessionId = page.url().match(/\/workout\/([^/?#]+)/)?.[1];
  assert(sessionId, "redirected workout session ID was missing", { url: page.url() });

  const sessionResponse = await context.request.get(`${webBase}/api/workout-sessions/${sessionId}`);
  assert(sessionResponse.status() === 200, "redirected workout session could not be fetched", {
    status: sessionResponse.status(),
    body: await sessionResponse.text(),
  });
  const session = await sessionResponse.json();
  const serialized = JSON.stringify(session).toLowerCase();
  const serializedExercises = JSON.stringify(session.exercises || []).toLowerCase();
  assert(session.member_id === onboarding.memberId, "workout session member did not match onboarding member", session);
  assert(session.duration_minutes === 60, "onboarding session duration was not persisted into workout", session);
  assert(session.metrics?.target_days_per_week === 3, "onboarding training days were not persisted into workout", session);
  assert(serialized.includes("knee"), "onboarding injury/guardrail was not reflected in workout session", session);
  assert(!serializedExercises.includes("leg press"), "blocked movement/equipment appeared in generated workout exercises", session);
  assert(apiHits.some((hit) => hit.path === "/api/auth/link/exchange" && hit.status === 200), "onboarding token exchange was not called successfully", apiHits);
  assert(apiHits.some((hit) => hit.path.includes(`/api/onboarding/${onboarding.memberId}/submit`) && hit.status === 200), "onboarding submit was not called successfully", apiHits);
  assert(apiHits.some((hit) => hit.path.includes(`/api/workout-sessions/${sessionId}`) && hit.status === 200), "workout session fetch was not called successfully", apiHits);

  await browser.close();
  console.log(JSON.stringify({
    ok: true,
    apiBase,
    webBase,
    checked: [
      "health",
      "onboarding_magic_link_exchange",
      "onboarding_token_stripping",
      "onboarding_profile_submit",
      "onboarding_redirect_to_workout",
      "onboarding_profile_to_workout_mapping",
      "workout_session_fetch_after_onboarding",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
});
