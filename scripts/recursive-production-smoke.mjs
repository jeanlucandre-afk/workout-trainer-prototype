import { spawn } from "node:child_process";

const apiBase = process.env.SMOKE_API_BASE ?? "https://ai-personal-trainer-whatsapp-mvp.vercel.app";
const webBase = process.env.SMOKE_WEB_BASE ?? "https://workout-trainer-prototype.vercel.app";
const adminApiKey = process.env.SMOKE_ADMIN_API_KEY;
const repeatCount = Number.parseInt(process.env.SMOKE_REPEAT_COUNT ?? "3", 10);
const requireSentReady = process.env.REQUIRE_SENT_READY === "true";

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

async function verifyReadiness() {
  assert(adminApiKey, "SMOKE_ADMIN_API_KEY is required");
  const health = await fetch(`${apiBase}/health`);
  assert(health.status === 200, "backend health failed", { status: health.status });

  const { response, body } = await jsonFetch(`${apiBase}/api/admin/readiness`, {
    headers: { authorization: `Bearer ${adminApiKey}` },
  });
  assert(response.ok && body?.ok, "admin readiness failed", body);
  assert(body.environment?.publicAppUrl === webBase, "backend PUBLIC_APP_URL does not match smoke web app", {
    expected: webBase,
    actual: body.environment?.publicAppUrl,
  });
  assert(body.environment?.usesMemoryStore === false, "backend is using memory store in production", body.environment);
  assert(body.database?.supabaseConfigured === true, "Supabase is not configured", body.database);
  assert(body.ai?.openaiConfigured === true, "OpenAI is not configured", body.ai);
  assert(body.messaging?.kapso?.apiKeyConfigured === true, "Kapso API key is not configured", body.messaging?.kapso);
  assert(body.messaging?.kapso?.phoneNumberIdConfigured === true, "Kapso phone number ID is not configured", body.messaging?.kapso);
  assert(body.messaging?.kapso?.webhookSecretConfigured === true, "Kapso webhook secret is not configured", body.messaging?.kapso);
  if (requireSentReady) {
    assert(!body.missing?.includes("sent_api_key"), "Sent API key is missing", body.missing);
    assert(!body.missing?.includes("sent_webhook_secret"), "Sent webhook secret is missing", body.missing);
  }
  return body;
}

function runNodeScript(scriptPath, iteration) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const durationSeconds = Number(((Date.now() - startedAt) / 1000).toFixed(1));
      if (code === 0) {
        resolve({ scriptPath, iteration, durationSeconds });
        return;
      }
      const error = new Error(`${scriptPath} failed on iteration ${iteration} with exit code ${code}`);
      error.details = { stdout, stderr };
      reject(error);
    });
  });
}

async function main() {
  assert(Number.isInteger(repeatCount) && repeatCount > 0, "SMOKE_REPEAT_COUNT must be a positive integer", { repeatCount });
  const results = [];
  for (let iteration = 1; iteration <= repeatCount; iteration += 1) {
    console.log(`\n=== Production smoke iteration ${iteration}/${repeatCount} ===`);
    const readiness = await verifyReadiness();
    results.push({
      iteration,
      readinessMissing: readiness.missing ?? [],
      checks: ["backend_health", "admin_readiness", "supabase", "openai", "kapso"],
    });
    await runNodeScript("scripts/onboarding-production-smoke.mjs", iteration);
    await runNodeScript("scripts/production-smoke.mjs", iteration);
  }

  const latestMissing = results.at(-1)?.readinessMissing ?? [];
  console.log(JSON.stringify({
    ok: true,
    apiBase,
    webBase,
    repeatCount,
    requireSentReady,
    latestMissing,
    checked: [
      "backend_health",
      "admin_readiness",
      "supabase_persistent_store",
      "openai_configured",
      "kapso_configured",
      "onboarding_magic_link_exchange",
      "onboarding_profile_to_workout_mapping",
      "workout_magic_link_exchange",
      "workout_event_logging",
      "pain_report_safety_state",
      "session_completion",
      "unauthenticated_block",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
});
