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

async function bootstrap() {
  const headers = { "content-type": "application/json" };
  if (adminApiKey) headers.authorization = `Bearer ${adminApiKey}`;
  const { response, body } = await jsonFetch(`${apiBase}/api/demo/bootstrap`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      displayName: "Prototype UI Smoke",
      goals: ["Build muscle"],
      goalDetails: "Prototype UI smoke with knee guardrail and no leg press.",
      injuries: ["Knee"],
      scheduleDays: ["Mon", "Wed", "Fri"],
      scheduleTime: "18:15",
      sessionDurationMinutes: 40,
      trainingLevel: "beginner",
      equipmentNoGos: ["leg press"],
      motivationStyle: "direct but supportive",
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      timezone: "Europe/Berlin",
    }),
  });
  assert(response.ok && body?.workoutUrl && body?.workoutSessionId, "demo bootstrap failed", body);
  return body;
}

async function clickIfVisible(page, namePattern) {
  const button = page.getByRole("button", { name: namePattern }).first();
  if (await button.isVisible({ timeout: 650 }).catch(() => false)) {
    await button.click();
    return true;
  }
  return false;
}

async function completeWorkoutFromUi(page) {
  for (let i = 0; i < 90; i += 1) {
    if (await page.getByText(/Result object ready/i).isVisible({ timeout: 350 }).catch(() => false)) return;
    if (await clickIfVisible(page, /LOG SET/i)) {
      await page.waitForTimeout(300);
      continue;
    }
    if (await clickIfVisible(page, /SKIP REST|NEXT SET|NEXT EXERCISE/i)) {
      await page.waitForTimeout(150);
      continue;
    }
    if (await clickIfVisible(page, /START WORKOUT/i)) {
      await page.waitForTimeout(150);
      continue;
    }
    await page.waitForTimeout(200);
  }
  throw new Error("workout did not reach completion through UI");
}

async function waitForBackendSession(context, sessionId, predicate, label) {
  let latest;
  for (let i = 0; i < 20; i += 1) {
    latest = await (await context.request.get(`${webBase}/api/workout-sessions/${sessionId}`)).json();
    if (predicate(latest)) return latest;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw Object.assign(new Error(`${label} did not reach backend`), { details: latest });
}

async function main() {
  const health = await fetch(`${apiBase}/health`);
  assert(health.status === 200, "backend health failed", { status: health.status });

  const user = await bootstrap();
  const workoutUrl = user.workoutUrl.replace("https://workout-trainer-prototype.vercel.app", webBase);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const apiHits = [];
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/")) apiHits.push({ path: new URL(url).pathname, status: response.status() });
  });

  await page.goto(workoutUrl, { waitUntil: "networkidle", timeout: 60000 });
  assert(!page.url().includes("token="), "magic token remained in browser URL", { url: page.url() });
  await page.getByRole("button", { name: /START WORKOUT/i }).waitFor({ timeout: 15000 });
  const bodyText = await page.locator("body").innerText();
  assert(bodyText.includes("Prototype UI Smoke") === false, "internal bootstrap label leaked to UI");
  assert(/AI generated plan/i.test(bodyText), "prototype did not render backend workout source", { bodyText });
  assert(apiHits.some((hit) => hit.path === "/api/auth/link/exchange" && hit.status === 200), "link exchange was not called successfully", apiHits);
  assert(apiHits.some((hit) => hit.path.includes("/api/workout-sessions/") && hit.status === 200), "session fetch was not called successfully", apiHits);

  await page.getByRole("button", { name: /START WORKOUT/i }).click();
  await page.getByRole("button", { name: /REPORT PAIN/i }).click();
  await waitForBackendSession(
    context,
    user.workoutSessionId,
    (session) => session.safety_state === "human_escalation",
    "pain report",
  );

  await completeWorkoutFromUi(page);
  await waitForBackendSession(
    context,
    user.workoutSessionId,
    (session) => session.status === "completed",
    "UI completion",
  );

  const unauth = await fetch(`${webBase}/api/workout-sessions/${user.workoutSessionId}`);
  assert(unauth.status === 401, "unauthenticated session fetch was not blocked", { status: unauth.status, body: await unauth.text() });

  await browser.close();
  console.log(JSON.stringify({
    ok: true,
    apiBase,
    webBase,
    checked: [
      "health",
      "prototype_magic_link_exchange",
      "prototype_backend_session_render",
      "prototype_token_stripping",
      "prototype_session_opened_event",
      "prototype_session_started_event",
      "prototype_pain_report_event",
      "prototype_set_completion_flow",
      "prototype_session_completed_event",
      "unauthenticated_block",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
});
