import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadServiceWorker({ oldCaches = [] } = {}) {
  const source = fs.readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
  const listeners = {};
  const opened = [];
  const deleted = [];
  const puts = [];
  const fetched = [];
  const legacyCacheHits = [];
  const navigations = [];
  const cache = {
    addAll: async (assets) => { opened.push({ name: "assets", assets }); },
    put: async (request, response) => { puts.push({ request, response }); },
  };
  const caches = {
    open: async (name) => {
      opened.push({ name });
      return cache;
    },
    keys: async () => oldCaches,
    delete: async (name) => { deleted.push(name); return true; },
    match: async () => undefined,
  };
  class FakeRequest {
    constructor(request, options = {}) {
      if (typeof request === "string") this.url = request;
      else Object.assign(this, request);
      Object.assign(this, options);
    }
  }
  const legacyWorker = {
    active: true,
    cache: new Map([
      ["./", "v9"],
      ["./index.html", "v9"],
      ["./styles.css?v=10", "v9"],
      ["./app.js?v=10", "v9"],
      ["./core.js?v=10", "v9"],
      ["./data/exercises.es.json", "v9"],
    ]),
    intercept(request) {
      if (!this.active) return null;
      const responseVersion = this.cache.get(request.url);
      if (!responseVersion) return null;
      legacyCacheHits.push(request.url);
      return {
        ok: true,
        version: responseVersion,
        clone() { return this; },
      };
    },
  };
  const fetch = async (request) => {
    fetched.push(request);
    const intercepted = legacyWorker.intercept(request);
    if (intercepted) return intercepted;
    const url = String(request.url ?? "");
    return {
      ok: true,
      version: request.mode === "navigate" || request.destination === "document" || url === "./" || url.includes("?v=32")
        ? "v32"
        : "v9",
      clone() { return this; },
    };
  };
  const context = {
    caches,
    fetch,
    Request: FakeRequest,
    self: {
      addEventListener: (name, handler) => { listeners[name] = handler; },
      clients: {
        claim: async () => { legacyWorker.active = false; },
        matchAll: async () => [{
          url: "http://localhost:8000/",
          navigate: async (url) => { navigations.push(url); },
        }],
      },
      skipWaiting: async () => {},
    },
  };
  vm.runInNewContext(source, context);
  return { listeners, opened, deleted, puts, fetched, legacyCacheHits, legacyWorker, navigations };
}

test("actualiza desde una caché v9 y precarga un shell coherente v32", async () => {
  const worker = loadServiceWorker({ oldCaches: ["aurum-fit-shell-v1", "aurum-fit-shell-v9"] });
  let activation;
  worker.listeners.activate({ waitUntil: (promise) => { activation = promise; } });
  await activation;
  assert.deepEqual(worker.deleted, ["aurum-fit-shell-v1", "aurum-fit-shell-v9"]);
  assert.deepEqual(worker.navigations, ["http://localhost:8000/"]);

  let installation;
  worker.listeners.install({ waitUntil: (promise) => { installation = promise; } });
  await installation;
  assert.equal(worker.fetched.length, 8);
  assert.ok(worker.fetched.every((request) => request.url.includes("?v=32")));
  assert.deepEqual(worker.legacyCacheHits, []);
  assert.ok(worker.puts.every(({ response }) => response.version === "v32"));
});

test("la navegación antigua v9 converge a v32 tras reclamar el cliente", async () => {
  const worker = loadServiceWorker({ oldCaches: ["aurum-fit-shell-v9"] });
  const oldResponse = worker.legacyWorker.intercept({ url: "./" });
  assert.equal(oldResponse.version, "v9");

  let activation;
  worker.listeners.activate({ waitUntil: (promise) => { activation = promise; } });
  await activation;

  let responsePromise;
  worker.listeners.fetch({
    request: { method: "GET", mode: "navigate", destination: "document", url: "./" },
    respondWith: (promise) => { responsePromise = promise; },
  });
  const response = await responsePromise;
  assert.equal(response.version, "v32");
  assert.deepEqual(worker.navigations, ["http://localhost:8000/"]);
});
test("prioriza la red para documentos y actualiza la caché activa", async () => {
  const worker = loadServiceWorker();
  let responsePromise;
  worker.listeners.fetch({
    request: { method: "GET", mode: "navigate", destination: "document" },
    respondWith: (promise) => { responsePromise = promise; },
  });
  const response = await responsePromise;
  assert.equal(response.ok, true);
  assert.equal(worker.puts.length, 1);
});

test("el submit de serie conserva el bloqueo aunque renderice otro formulario", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /const pendingSetSubmissions = new Set\(\)/);
  assert.match(app, /pendingSetSubmissions\.has\(key\)/);
  assert.match(app, /const submissionKey = `\$\{session\.id\}:\$\{sessionExercise\.id\}`/);
  assert.match(app, /Serie guardada automáticamente\."\), submissionKey\)/);
});

test("Importar deja el input fuera del foco y la actualización offline no silencia fallos online", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="importFile"[\s\S]*tabindex="-1"[\s\S]*aria-hidden="true"[\s\S]*hidden/);
  assert.match(app, /navigator\.serviceWorker\.controller && networkFailure/);
  assert.match(app, /fetch\("service-worker\.js", \{ cache: "no-store" \}\)/);
  assert.match(app, /console\.error\("No se pudo actualizar el service worker\./);
  assert.doesNotMatch(app, /swReloadKey/);
});

test("la navegación principal tiene tres destinos y Diario es el inicio", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const tabs = [...html.matchAll(/data-tab="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(tabs, ["entreno", "diario", "comida"]);
  assert.match(html, /<section id="diario" class="panel active">/);
  assert.match(app, /window\.location\.hash\.slice\(1\) \|\| "diario"/);
});

test("el catálogo espera una búsqueda y la sesión distingue los tres tipos de serie", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /No mostramos todo el catálogo de golpe/);
  assert.match(app, /new Option\("Efectiva", "effective"\)/);
  assert.match(app, /new Option\("Aproximación", "approach"\)/);
  assert.match(app, /new Option\("Calentamiento", "warmup"\)/);
  assert.doesNotMatch(app, /placeholder: "(?:10|60|2)"/);
});

test("el catálogo reconoce variantes unilaterales en español", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const catalog = JSON.parse(fs.readFileSync(new URL("../data/exercises.es.json", import.meta.url), "utf8"));
  assert.match(app, /catalogDerivedAliases/);
  assert.match(app, /aliases\.push\("unilateral", "una mano", "un brazo"\)/);
  assert.match(app, /function translatedCatalogName/);
  assert.match(app, /entry\.nameOriginal/);
  assert.ok(catalog.exercises.some((exercise) => exercise.nameEs === "Remo unilateral con mancuerna"));
  assert.ok(catalog.exercises.some((exercise) => exercise.nameEs === "Jalón unilateral en polea"));
});

test("la interfaz limita el catálogo y coloca un temporizador dentro del ejercicio abierto", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(app, /let catalogResultLimit = 4/);
  assert.match(app, /Ver todos \(\$\{matches\.length\.toLocaleString/);
  assert.match(app, /createExerciseRestTimer\(sessionExercise\.id\)/);
  assert.match(app, /document\.querySelectorAll\("\.session-exercise\[open\]"\)/);
  assert.match(app, /button-quiet timer-reset-button/);
  assert.match(css, /\.timer-reset-button/);
  assert.doesNotMatch(html, /id="restTimerDisplay"/);
  assert.match(app, /¿No puedes realizar este ejercicio hoy\?/);
  assert.match(app, /Elegir una alternativa para hoy/);
  assert.match(app, /Marcar como no realizado/);
  assert.match(app, /Volver a incluir hoy/);
  assert.doesNotMatch(app, /"Sustituir solo hoy"|"Omitir hoy"/);
});

test("Diario, limpieza de demostración, etiquetas y ajustes tienen una base visible y separada", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(html, /id="weeklyRingValue"/);
  assert.match(html, /id="dashboardWorkoutExercises"/);
  assert.match(html, /id="labelPhoto"[^>]*capture="environment"/);
  assert.match(html, /id="ajustes" class="panel settings-panel"/);
  assert.match(app, /cleanupPublishedData\(cleaned\)/);
  assert.doesNotMatch(html, /id="loadDemoBtn"|id="removeDemoBtn"|id="demoBadge"/);
});

test("Entrenamiento prioriza rutinas y deja sesión libre e historial fuera del flujo principal", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const routinePosition = html.indexOf('id="routineManager"');
  const freePosition = html.indexOf('id="startFreeSessionBtn"');
  assert.ok(routinePosition >= 0 && freePosition > routinePosition);
  assert.match(html, /id="activeSessionResume"/);
  assert.match(html, /id="continueSessionBtn"/);
  assert.match(html, /id="discardSessionFromRoutinesBtn"/);
  assert.match(html, /id="discardSessionBtn"/);
  assert.match(html, /id="backToRoutinesBtn"/);
  assert.doesNotMatch(html, /id="completedSessionList"/);
  assert.doesNotMatch(html, /id="exerciseHistory"/);
  assert.match(app, /let trainingView = "routines"/);
  assert.doesNotMatch(app, /setAttribute\("aria-label", "Series previstas"\)/);
  assert.match(app, /discardSession\(next, active\.id\)/);
  assert.match(app, /\$\("routineManager"\)\.hidden = trainingView !== "routines"/);
});

test("el anillo calcula cumplimiento diario y calorías no reutiliza el texto de proteína", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="dailyGoalCount">0 de 0 objetivos/);
  assert.match(html, /class="exercise-picker-summary"/);
  assert.ok(html.indexOf('id="sessionExerciseList"') < html.indexOf('class="exercise-picker surface"'));
  assert.match(app, /const dailyGoalRatios = \[/);
  assert.match(app, /function sessionMatchesScheduledDay/);
  assert.match(app, /suggested \? \(completedScheduledSession \? 1 : 0\) : null/);
  assert.match(app, /\$\("weeklyRingValue"\)\.textContent = `\$\{dailyProgress\}%`/);
  assert.match(app, /Quedan \$\{remainingCalories\.toLocaleString/);
  assert.doesNotMatch(app, /dashboardNutritionDetail"\)\.textContent = `\$\{selectedTotals\.protein/);
});

test("la nueva estructura separa Rutinas, Entrenamiento y el detalle completo del Diario", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.doesNotMatch(html, /class="topbar"/);
  assert.match(html, /data-tab="entreno"[\s\S]*Rutinas/);
  assert.match(html, /id="routineDetailBackBtn"[\s\S]*aria-label="Volver a rutinas"/);
  assert.match(html, /id="dailyDetailPanel"[\s\S]*Resumen completo/);
  assert.match(app, /openDailyDetail\(date\)/);
  assert.match(app, /startSessionFromRoutineDay\(next, selected\.routineId, selected\.routineDayId/);
});

test("los días son reversibles y cada ejercicio ofrece duplicado, historial, actual y progreso", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /setRoutineDayWeekdays\(next, routine\.id, routineDay\.id, updated\)/);
  assert.match(app, /duplicateSet\(next, session\.id, sessionExercise\.id, workoutSet\.id/);
  assert.match(app, /\["history", "Historial"\]/);
  assert.match(app, /\["current", "Actual"\]/);
  assert.match(app, /\["progress", "Progreso"\]/);
  assert.match(app, /Todas tus sesiones anteriores, sin modificar el histórico/);
  assert.match(app, /Mejor serie efectiva de cada entrenamiento/);
  assert.match(app, /button\.dataset\.action === "continue"/);
  assert.match(app, /Ver entrenamiento completado/);
});
