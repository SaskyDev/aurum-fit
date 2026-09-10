import assert from "node:assert/strict";
import fs from "node:fs";
import { createEmptyState, STORE_KEY, PUBLIC_CLEANUP_VERSION } from "../core.js";
const runtime = process.env.PLAYWRIGHT_MODULE ?? "/Users/alex/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const { chromium } = await import(runtime);
const browser = await chromium.launch({ headless: true });
const output = process.env.QA_OUTPUT ?? "/tmp/aurum-guided-qa";
fs.mkdirSync(output, { recursive: true });
try {
  for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce", serviceWorkers: "block" });
    if (process.env.QA_MUTATE === "creation") {
      await context.route("**/app.js*", async route => {
        const response = await route.fetch();
        const source = (await response.text()).replace('mode: selectedType === "cardio" ? "log" : document.querySelector(\'input[name="routineMode"]:checked\')?.value ?? "log",', 'mode: "log",');
        await route.fulfill({ response, body: source });
      });
    }
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://localhost:8000");
    const initial = createEmptyState();
    initial.owner.preferences.appearanceMode = theme;
    initial.meta.publicCleanupVersion = PUBLIC_CLEANUP_VERSION;
    await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: STORE_KEY, state: initial });
    await page.goto("http://localhost:8000/#entreno");
    await page.reload();
    await page.locator('[data-routine-planner-view="library"]').click();
    await page.locator("#createRoutineCard summary").click();
    await page.locator("#routineName").fill("QA Guiada");
    await page.locator('label').filter({ has: page.locator('input[name="routineMode"][value="guided"]') }).click();
    await page.locator('#newRoutineWeekdays label').first().click();
    await page.locator('#createRoutineForm button[type="submit"]').click();
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).training.routines[0].mode, STORE_KEY), "guided");
    await page.locator('.routine-overview-card').filter({ hasText: "QA Guiada" }).click();
    const form = page.locator('.routine-exercise-form').first();
    await form.locator('input[list="routineExerciseOptions"]').fill("Press QA");
    await form.locator('[name="plannedSets"]').fill("3");
    await form.locator('[name="repMin"]').fill("8");
    await form.locator('[name="repMax"]').fill("12");
    await form.locator('[name="targetLoadKg"]').fill("50");
    await form.locator('button[type="submit"]').click();
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORE_KEY);
    let saved = await read();
    assert.equal(saved.training.routines[0].mode, "guided");
    assert.equal(saved.training.routines[0].days[0].exercises[0].targetLoadKg, 50);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator("#trainingNotice").waitFor({ state: "hidden" });
    await page.screenshot({ path: `${output}/creation-${theme}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`Creación guiada: ${theme}, 390px, táctil, movimiento reducido OK`);
    await context.close();
  }
} finally { await browser.close(); }
