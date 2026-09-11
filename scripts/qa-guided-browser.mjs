import assert from "node:assert/strict";
import fs from "node:fs";
import { createEmptyState, STORE_KEY, PUBLIC_CLEANUP_VERSION } from "../core.js";

const runtime = process.env.PLAYWRIGHT_MODULE
  ?? "/Users/alex/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const { chromium } = await import(runtime);
const browser = await chromium.launch({ headless: true });
const output = process.env.QA_OUTPUT ?? "/tmp/aurum-guided-qa";
fs.mkdirSync(output, { recursive: true });

async function swipe(page, locator, direction) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert.ok(box, "la fila debe ser visible para poder deslizarla");
  await locator.evaluate((element, swipeDirection) => {
    const rect = element.getBoundingClientRect();
    const startX = swipeDirection === "left" ? rect.right - 12 : rect.left + 12;
    const y = rect.top + rect.height / 2;
    element.setPointerCapture = () => {};
    element.releasePointerCapture = () => {};
    const fire = (type, x) => element.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: 7, clientX: x, clientY: y, pointerType: "touch",
    }));
    fire("pointerdown", startX);
    [28, 62, 102].forEach((distance) => fire("pointermove", startX + (swipeDirection === "left" ? -distance : distance)));
    fire("pointerup", startX + (swipeDirection === "left" ? -102 : 102));
  }, direction);
}

async function chooseWheelValue(page, button, value) {
  await button.tap();
  const sheet = page.locator(".numeric-wheel-sheet");
  await sheet.waitFor();
  await sheet.locator('[aria-selected="true"]').tap();
  const input = sheet.locator(".numeric-wheel-direct-input");
  await input.fill(String(value));
  await input.press("Enter");
  await sheet.getByRole("button", { name: "Listo", exact: true }).tap();
}

const profiles = [
  { name: "dark", theme: "dark", reducedMotion: "no-preference" },
  { name: "light", theme: "light", reducedMotion: "no-preference" },
  { name: "reduced", theme: "dark", reducedMotion: "reduce" },
];

try {
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: profile.reducedMotion,
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const initial = createEmptyState();
    initial.owner.preferences.appearanceMode = profile.theme;
    initial.owner.preferences.autoRestTimer = true;
    initial.owner.preferences.defaultRestSeconds = 60;
    initial.meta.publicCleanupVersion = PUBLIC_CLEANUP_VERSION;

    await page.goto("http://localhost:8000/#entreno");
    await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
      key: STORE_KEY,
      state: initial,
    });
    await page.reload();
    await page.locator('[data-routine-planner-view="library"]').tap();
    await page.locator("#createRoutineCard summary").tap();
    await page.locator("#routineName").fill("QA Guiada");
    await page.locator('label').filter({ has: page.locator('input[name="routineMode"][value="guided"]') }).tap();
    await page.locator("#newRoutineWeekdays label").first().tap();
    await page.locator('#createRoutineForm button[type="submit"]').tap();

    const routineCard = page.locator(".routine-overview-card").filter({ hasText: "QA Guiada" });
    assert.equal(await routineCard.locator(".routine-mode-guided").textContent(), "Guiada");
    await routineCard.tap();
    const planForm = page.locator(".routine-exercise-form").first();
    await planForm.locator('input[list="routineExerciseOptions"]').fill("Press de banca con barra");
    await planForm.locator('[name="plannedSets"]').fill("3");
    await planForm.locator('[name="repMin"]').fill("8");
    await planForm.locator('[name="repMax"]').fill("12");
    await planForm.locator('[name="targetLoadKg"]').fill("50");
    await planForm.locator('button[type="submit"]').tap();
    await page.locator(".routine-day").first().getByRole("button", { name: "Empezar", exact: true }).tap();

    assert.equal(await page.locator(".planned-set-form").count(), 3);
    assert.equal(await page.locator(".exercise-quick-actions").count(), 1);
    assert.equal(await page.locator(".exercise-reference-pair").count(), 1);
    assert.equal(await page.locator(".exercise-rest-timer").count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const actionLayout = await page.locator(".exercise-quick-action").evaluateAll((buttons) => buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        width: rect.width,
        hasIcon: Boolean(button.querySelector("svg")),
      };
    }));
    assert.equal(actionLayout.length, 5);
    assert.ok(actionLayout.every((item) => item.hasIcon && item.width >= 90 && item.right <= 390), JSON.stringify(actionLayout));
    assert.equal(actionLayout[0].top, actionLayout[1].top);
    assert.equal(actionLayout[1].top, actionLayout[2].top);
    assert.equal(actionLayout[3].top, actionLayout[4].top);
    assert.ok(actionLayout[3].top > actionLayout[0].top);
    assert.ok(actionLayout[3].left > actionLayout[0].left);
    assert.equal(await page.locator("#cancelReplacementBtn").isHidden(), true);
    await page.getByRole("button", { name: "Cambiar", exact: true }).tap();
    assert.equal(await page.locator(".catalog-status-row #cancelReplacementBtn").isVisible(), true);
    assert.match(await page.locator("#catalogStatus").textContent(), /Modo alternativa/);
    await page.getByRole("button", { name: "Cancelar cambio", exact: true }).tap();
    assert.equal(await page.locator("#cancelReplacementBtn").isHidden(), true);
    const guide = page.getByRole("button", { name: "Guía", exact: true });
    assert.equal(await guide.isEnabled(), true);
    await guide.tap();
    assert.ok((await page.locator(".exercise-guide-copy").textContent()).length > 40);
    await page.getByRole("button", { name: "Cerrar", exact: true }).tap();
    assert.equal(await guide.evaluate((button) => document.activeElement === button), true);

    const first = page.locator(".planned-set-form").first();
    await chooseWheelValue(page, first.locator(".compact-set-loadKg"), 50.25);
    await first.locator(".compact-set-loadKg").tap();
    const wheel = page.locator(".numeric-wheel-sheet");
    await wheel.locator('[aria-selected="true"]').focus();
    await wheel.locator('[aria-selected="true"]').press("ArrowDown");
    assert.equal((await wheel.locator('[aria-selected="true"]').textContent()).replace(",", "."), "50.5");
    await wheel.getByRole("button", { name: "Cancelar", exact: true }).tap();
    await chooseWheelValue(page, first.locator(".compact-set-reps"), 10);
    await chooseWheelValue(page, first.locator(".compact-set-rir"), 6);
    assert.equal(await first.locator(".compact-set-rir").textContent(), "5");
    await first.locator(".compact-set-rir").tap();
    await page.locator(".numeric-wheel-sheet").locator('[aria-selected="true"]').tap();
    const directRir = page.locator(".numeric-wheel-direct-input");
    await directRir.fill("2");
    await directRir.press("Escape");
    assert.equal(await page.locator(".numeric-wheel-sheet").isVisible(), true);
    assert.equal(await page.locator(".numeric-wheel-sheet").locator('[aria-selected="true"]').textContent(), "5");
    await page.locator(".numeric-wheel-sheet").getByRole("button", { name: "Cancelar", exact: true }).tap();
    await first.getByRole("button", { name: "Completar serie 1", exact: true }).tap();
    await page.getByRole("button", { name: "Efectiva", exact: true }).tap();
    await page.locator("#compactRestBar").waitFor();
    assert.equal(await page.locator(".completed-set-row").count(), 1);
    assert.equal(await page.locator(".planned-set-form").count(), 2);
    await page.getByRole("button", { name: "+30 s", exact: true }).tap();
    const restText = await page.locator(".compact-rest-time").textContent();
    const [restMinutes, restSeconds] = restText.split(":").map(Number);
    assert.ok(restMinutes * 60 + restSeconds >= 85, restText);

    const pending = page.locator(".planned-set-row .compact-set-row-content").first();
    await swipe(page, pending, "left");
    assert.equal(await page.locator(".set-skipped").count(), 1);
    let saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORE_KEY);
    assert.equal(saved.training.sessions[0].exercises[0].sets.find((set) => set.status === "skipped").planOrder, 2);

    await page.getByRole("button", { name: "Nota", exact: true }).tap();
    await page.locator(".exercise-note-sheet textarea").fill("Hombros estables; buena técnica.");
    await page.getByRole("button", { name: "Guardar nota", exact: true }).tap();
    saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORE_KEY);
    assert.equal(saved.training.sessions[0].exercises[0].sessionNote, "Hombros estables; buena técnica.");

    const completed = page.locator(".completed-set-row").first();
    await swipe(page, completed, "left");
    await page.getByRole("alertdialog").getByRole("button", { name: "Borrar", exact: true }).tap();
    assert.equal(await page.locator(".completed-set-row").count(), 0);
    await page.locator("#undoSetBtn").tap();
    assert.equal(await page.locator(".completed-set-row").count(), 1);

    await page.getByRole("button", { name: "Eliminar", exact: true }).tap();
    await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar de la rutina", exact: true }).tap();
    saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORE_KEY);
    assert.equal(saved.training.routines[0].days[0].exercises.length, 0);
    assert.equal(saved.training.sessions[0].exercises[0].sets.some((set) => set.status === "completed"), true);
    assert.equal(saved.training.sessions[0].exercises[0].pendingPlanRemoved, true);
    await page.locator("#undoSetBtn").tap();
    saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORE_KEY);
    assert.equal(saved.training.routines[0].days[0].exercises.length, 1);
    assert.equal(saved.training.sessions[0].exercises[0].pendingPlanRemoved, undefined);

    await page.locator(".compact-exercise-header").evaluate((header) => {
      window.scrollTo({ top: window.scrollY + header.getBoundingClientRect().top - 8, behavior: "instant" });
    });
    await page.waitForTimeout(80);
    const geometry = await page.evaluate(() => {
      const article = document.querySelector(".session-exercise[open]");
      const rest = document.querySelector("#compactRestBar");
      const header = document.querySelector(".compact-exercise-header");
      const rows = [...document.querySelectorAll(".compact-set-row-content")];
      return {
        articleWidth: article.getBoundingClientRect().width,
        viewportWidth: innerWidth,
        headerTop: header.getBoundingClientRect().top,
        lastRowBottom: rows.at(-1).getBoundingClientRect().bottom,
        restTop: rest.getBoundingClientRect().top,
        restBottom: rest.getBoundingClientRect().bottom,
        viewportHeight: innerHeight,
        rows: rows.map((row) => ({
          height: row.getBoundingClientRect().height,
          className: row.parentElement.className,
          padding: getComputedStyle(row).padding,
          minHeight: getComputedStyle(row).minHeight,
          childHeight: row.firstElementChild?.getBoundingClientRect().height,
        })),
      };
    });
    assert.ok(geometry.articleWidth <= geometry.viewportWidth);
    assert.ok(geometry.headerTop >= 0);
    assert.ok(geometry.lastRowBottom <= geometry.restTop, JSON.stringify(geometry));
    assert.ok(geometry.restBottom <= geometry.viewportHeight - 80);
    assert.ok(geometry.rows.every(({ height }) => height <= 58), JSON.stringify(geometry.rows));

    // La captura representa el estado estable, no el toast temporal del deshacer.
    await page.locator("#trainingNotice").evaluate((notice) => { notice.hidden = true; });
    await page.screenshot({ path: `${output}/compact-${profile.name}.png` });
    assert.deepEqual(errors, []);
    console.log(`Entrenamiento compacto: ${profile.name}, 390x844 OK`);
    await context.close();
  }
} finally {
  await browser.close();
}
