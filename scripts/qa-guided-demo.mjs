import assert from "node:assert/strict";
import fs from "node:fs";
import { createEmptyState, STORE_KEY, PUBLIC_CLEANUP_VERSION } from "../core.js";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "/Users/alex/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs");
const browser = await chromium.launch({ headless: true });
try {
  for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    if (process.env.QA_MUTATE === 'flat') {
      await context.route('**/core.js*', async route => {
        const response = await route.fetch();
        const body = (await response.text()).replace('planned.targetLoadKg + Math.floor((60 - offset) / 7) * 2.5;', 'planned.targetLoadKg;');
        await route.fulfill({ response, body });
      });
    }
    const page = await context.newPage();
    await page.goto('http://localhost:8000');
    const initial = createEmptyState();
    initial.owner.preferences.appearanceMode = theme;
    initial.meta.publicCleanupVersion = PUBLIC_CLEANUP_VERSION;
    await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: STORE_KEY, state: initial });
    await page.reload();
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORE_KEY);
    const before = await read();
    await page.goto('http://localhost:8000/#ajustes');
    await page.locator('[data-open-settings="data"]').click();
    await page.locator('#loadDemoDataBtn').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cargar demo', exact: true }).click();
    await page.locator('#progressExerciseSelect').selectOption('dataset-0025');
    assert.equal((await read()).meta.demoSeedVersion, 2);
    const chart = page.locator('#exerciseProgressChart');
    await chart.scrollIntoViewIfNeeded();
    assert.ok(await chart.locator('svg').count());
    const points = (await chart.locator('.chart-load-line').getAttribute('points')).split(' ');
    assert.ok(new Set(points.map(point => point.split(',')[1])).size > 3, 'El gráfico de cargas no debe ser plano');
    fs.mkdirSync('/tmp/aurum-guided-qa', { recursive: true });
    await chart.screenshot({ path: `/tmp/aurum-guided-qa/demo-progress-${theme}.png` });
    await page.goto('http://localhost:8000/#ajustes');
    await page.locator('[data-open-settings="data"]').click();
    await page.locator('#removeDemoDataBtn').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Quitar demo', exact: true }).click();
    assert.deepEqual(await read(), before);
    console.log(`Demo, gráfica y restauración en navegador: ${theme} OK`);
    await context.close();
  }
} finally { await browser.close(); }
