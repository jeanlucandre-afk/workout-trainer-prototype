import { chromium } from "playwright";

const webBase = process.env.SMOKE_WEB_BASE ?? "https://workout-trainer-prototype.vercel.app";

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function assertPageMessage(page, pattern, label) {
  await page.getByText(pattern).waitFor({ timeout: 15000 });
  const text = await page.locator("body").innerText();
  assert(pattern.test(text), `${label} message was not visible`, { text });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  const invalidWorkoutPage = await context.newPage();
  await invalidWorkoutPage.goto(`${webBase}/workout/sess_invalid_smoke?token=bad-token`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await assertPageMessage(invalidWorkoutPage, /invalid or no longer exists/i, "invalid workout link");
  assert(!invalidWorkoutPage.url().includes("token="), "invalid workout token remained in URL", {
    url: invalidWorkoutPage.url(),
  });

  const missingOnboardingPage = await context.newPage();
  await missingOnboardingPage.goto(`${webBase}/onboarding/mem_missing_token_smoke`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await assertPageMessage(missingOnboardingPage, /valid WhatsApp login/i, "missing onboarding token");

  await browser.close();
  console.log(JSON.stringify({
    ok: true,
    webBase,
    checked: [
      "invalid_workout_link_message",
      "invalid_workout_token_stripping",
      "missing_onboarding_token_message",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
});
