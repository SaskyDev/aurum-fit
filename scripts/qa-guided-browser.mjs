import assert from "node:assert/strict";
import fs from "node:fs";
import { createEmptyState, STORE_KEY, PUBLIC_CLEANUP_VERSION } from "../core.js";
const runtime = process.env.PLAYWRIGHT_MODULE ?? "/Users/alex/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const { chromium } = await import(runtime);
const browser = await chromium.launch({ headless: true });
const output = process.env.QA_OUTPUT ?? "/tmp/aurum-guided-qa";
const calibration = process.env.QA_CALIBRATION === "1";
fs.mkdirSync(output, { recursive: true });
try {
  for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce", serviceWorkers: "block" });
    if (["creation", "check", "annul", "deviation"].includes(process.env.QA_MUTATE)) {
      await context.route("**/app.js*", async route => {
        const response = await route.fetch();
        const mutations = {
          creation: ['mode: selectedType === "cardio" ? "log" : document.querySelector(\'input[name="routineMode"]:checked\')?.value ?? "log",', 'mode: "log",'],
          check: ['const workoutSet = addSetToExercise(next, session.id, sessionExercise.id, input);', 'return;'],
          annul: ['next => skipPlannedSet(next, session.id, sessionExercise.id, planOrder)', 'next => undefined'],
          deviation: ['if (!changes) return;', 'return;'],
        };
        const source = (await response.text()).replace(...mutations[process.env.QA_MUTATE]);
        await route.fulfill({ response, body: source });
      });
    }
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://localhost:8000");
    const initial = createEmptyState();
    initial.owner.preferences.appearanceMode = theme;
    initial.owner.preferences.autoRestTimer = theme === "dark";
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
    if (!calibration) await form.locator('[name="targetLoadKg"]').fill("50");
    await form.locator('button[type="submit"]').click();
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORE_KEY);
    let saved = await read();
    assert.equal(saved.training.routines[0].mode, "guided");
    assert.equal(saved.training.routines[0].days[0].exercises[0].targetLoadKg, calibration ? null : 50);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator("#trainingNotice").waitFor({ state: "hidden" });
    await page.screenshot({ path: `${output}/creation-${theme}.png`, fullPage: true });
    await page.locator('.routine-day').first().getByRole('button', { name: 'Empezar', exact: true }).click();
    assert.equal(await page.locator('.planned-set-form').count(), 3);
    saved = await read();
    assert.equal(saved.training.sessions[0].exercises[0].sets.length, 0);
    const planned = page.locator('.planned-set-form').first();
    if (calibration) {
      assert.equal(await page.getByText('Primera vez: vamos a tomar tu referencia.', { exact: true }).count(), 1);
      assert.equal(await planned.locator('[name="loadKg"]').inputValue(), '');
      assert.equal(await planned.locator('[name="loadKg"]').getAttribute('placeholder'), '');
      await planned.locator('[name="loadKg"]').fill('22.5');
      await planned.getByRole('button', { name: 'Completar serie 1', exact: true }).tap();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Actualizar plan', exact: true }).click();
      saved = await read();
      assert.equal(saved.training.routines[0].days[0].exercises[0].targetLoadKg, 22.5);
      assert.equal(saved.training.sessions[0].exercises[0].targetLoadKg, null);
      assert.deepEqual(errors, []);
      console.log(`Calibración sin peso inventado: ${theme} OK`);
      await context.close();
      continue;
    }
    assert.equal(await planned.locator('[name="loadKg"]').inputValue(), "50");
    await planned.getByRole('button', { name: 'Completar serie 1', exact: true }).tap();
    saved = await read();
    assert.equal(saved.training.sessions[0].exercises[0].sets.length, 1);
    assert.equal(saved.training.sessions[0].exercises[0].sets[0].planOrder, 1);
    assert.equal(await page.locator('.planned-set-form').count(), 2);
    assert.equal(await page.locator('[data-rest-toggle]').textContent(), theme === "dark" ? "Pausar" : "Iniciar");
    await page.getByRole('button', { name: '+30 s', exact: true }).tap();
    const time = await page.locator('[data-rest-display]').textContent();
    assert.ok(time.startsWith("01:"), time);
    // CDP envía contactos táctiles reales al motor, no eventos de ratón.
    const cdp = await context.newCDPSession(page);
    const foreground = page.locator('.swipe-set-row .set-row-content').first();
    await foreground.scrollIntoViewIfNeeded();
    const box = await foreground.boundingBox();
    const x = box.x + 110, y = box.y + 24;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (const delta of [25, 55, 95]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + delta, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).training.sessions[0].exercises[0].sets.length === 2, STORE_KEY);
    assert.equal(await page.locator('.planned-set-form').count(), 2);
    // El sentido contrario pide confirmación y borra solo esa serie.
    const duplicate = page.locator('.swipe-set-row .set-row-content').last();
    await duplicate.scrollIntoViewIfNeeded();
    const duplicateBox = await duplicate.boundingBox();
    const dx = duplicateBox.x + 180, dy = duplicateBox.y + 24;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: dx, y: dy }] });
    for (const delta of [25, 55, 95]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: dx - delta, y: dy }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.getByRole('alertdialog').getByRole('button', { name: 'Borrar', exact: true }).tap();
    saved = await read();
    assert.equal(saved.training.sessions[0].exercises[0].sets.length, 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#trainingNotice').waitFor({ state: 'hidden' });
    await page.screenshot({ path: `${output}/training-${theme}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Anular serie 2', exact: true }).tap();
    saved = await read();
    assert.equal(saved.training.sessions[0].exercises[0].sets.find(item => item.planOrder === 2).status, "skipped");
    assert.equal(await page.locator('.set-skipped').count(), 1);
    const lastPlan = page.locator('.planned-set-form').first();
    await lastPlan.locator('[name="loadKg"]').fill(theme === 'dark' ? '40' : '60');
    await lastPlan.locator('[name="reps"]').fill(theme === 'dark' ? '6' : '15');
    await lastPlan.getByRole('button', { name: 'Completar serie 3', exact: true }).tap();
    await page.getByRole('alertdialog').waitFor();
    saved = await read();
    assert.equal(saved.training.routines[0].days[0].exercises[0].targetLoadKg, 50);
    await page.getByRole('alertdialog').getByRole('button', { name: theme === 'dark' ? 'Solo hoy' : 'Actualizar plan', exact: true }).click();
    saved = await read();
    assert.equal(saved.training.routines[0].days[0].exercises[0].targetLoadKg, theme === 'dark' ? 50 : 60);
    assert.equal(saved.training.sessions[0].exercises[0].targetLoadKg, 50);
    await page.locator('#finishSessionBtn').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Finalizar', exact: true }).click();
    await page.goto('http://localhost:8000/#diario');
    // El resumen completo de un día mantiene la anulación sin inventar trabajo.
    await page.locator('.timeline-open').first().click();
    assert.ok(await page.locator('.day-detail-overlay .set-skipped').count() > 0);
    assert.equal(await page.locator('.day-detail-overlay .set-skipped > span').first().evaluate(el => getComputedStyle(el).textDecorationLine), 'line-through');
    await page.screenshot({ path: `${output}/diary-${theme}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`Creación guiada: ${theme}, 390px, táctil, movimiento reducido OK`);
    await context.close();
  }
} finally { await browser.close(); }
