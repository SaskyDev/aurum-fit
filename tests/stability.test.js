import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const shellVersion = fs
  .readFileSync(new URL("../service-worker.js", import.meta.url), "utf8")
  .match(/const SHELL_VERSION = "(\d+)";/)[1];

function loadServiceWorker({ oldCaches = [], failingAssets = [] } = {}) {
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
    const url = String(request.url ?? "");
    if (failingAssets.some((asset) => url.includes(asset))) {
      return { ok: false, status: 404, clone() { return this; } };
    }
    const intercepted = legacyWorker.intercept(request);
    if (intercepted) return intercepted;
    const currentShell = request.mode === "navigate"
      || request.destination === "document"
      || url === "./"
      || url.includes(`?v=${shellVersion}`);
    return {
      ok: true,
      version: currentShell ? `v${shellVersion}` : "v9",
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

test("actualiza desde una caché antigua y precarga un shell coherente", async () => {
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
  assert.ok(worker.fetched.every((request) => request.url.includes(`?v=${shellVersion}`)));
  assert.deepEqual(worker.legacyCacheHits, []);
  assert.ok(worker.puts.every(({ response }) => response.version === `v${shellVersion}`));
});

test("la navegación antigua converge a la versión actual tras reclamar el cliente", async () => {
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
  assert.equal(response.version, `v${shellVersion}`);
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

test("la instalación offline exige el shell pero tolera un catálogo caído", async () => {
  const conCatalogoCaido = loadServiceWorker({ failingAssets: ["exercises.es.json"] });
  let instalacion;
  conCatalogoCaido.listeners.install({ waitUntil: (promise) => { instalacion = promise; } });
  await instalacion;

  const cacheado = conCatalogoCaido.puts.map(({ request }) => String(request));
  assert.equal(cacheado.length, 7);
  assert.ok(cacheado.every((url) => url.includes(`?v=${shellVersion}`)));
  assert.ok(!cacheado.some((url) => url.includes("exercises.es.json")));
  assert.ok(cacheado.some((url) => url.includes("index.html")));

  const conShellCaido = loadServiceWorker({ failingAssets: ["app.js"] });
  let instalacionFallida;
  conShellCaido.listeners.install({ waitUntil: (promise) => { instalacionFallida = promise; } });
  await assert.rejects(instalacionFallida, /No se pudo precargar/);
});

test("la versión de caché está sincronizada en todo el shell", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const htmlVersions = [...html.matchAll(/\?v=(\d+)/g)].map((match) => match[1]);
  const appVersions = [...app.matchAll(/\?v=(\d+)/g)].map((match) => match[1]);

  // Se comprueba que todas coincidan, no cuántas hay: añadir un recurso
  // versionado es normal, servir dos versiones a la vez no.
  assert.ok(htmlVersions.length >= 4, "index.html perdió referencias versionadas");
  assert.ok(appVersions.length >= 2, "app.js perdió referencias versionadas");
  assert.ok([...htmlVersions, ...appVersions].every((version) => version === shellVersion));
});

test("las confirmaciones usan un diálogo accesible propio y no window.confirm", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const styles = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.doesNotMatch(app, /window\.confirm\(/);
  assert.match(app, /function confirmDialog\(message, \{/);
  assert.match(app, /box\.setAttribute\("role", "alertdialog"\)/);
  assert.match(app, /box\.setAttribute\("aria-modal", "true"\)/);
  assert.match(app, /box\.setAttribute\("aria-labelledby", titleId\)/);
  assert.match(app, /if \(event\.key === "Escape"\)/);
  assert.match(app, /const focusable = \[cancelBtn, confirmBtn\]/);
  assert.match(app, /previouslyFocused instanceof HTMLElement\) previouslyFocused\.focus\(\)/);
  assert.match(styles, /\.dialog-overlay \{/);
  assert.match(styles, /\.overlay-open \{ overflow: hidden; \}/);

  const confirmaciones = app.match(/await confirmDialog\(/g) ?? [];
  assert.equal(confirmaciones.length, 9);
});

test("el catálogo avisa de los ejercicios sin revisión profesional", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const styles = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(app, /entry\.reviewStatus === "pending_professional_review"/);
  assert.match(app, /"catalog-review-pending", "Sin revisión profesional todavía"/);
  assert.match(styles, /\.catalog-card \.catalog-review-pending \{/);
});

test("el mapa muscular vive en el Diario con periodo propio y alternativa en texto", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

  const diario = html.slice(html.indexOf('id="diario"'), html.indexOf('id="comida"'));
  assert.ok(diario.includes('id="muscleMapCard"'), "el mapa debe estar dentro del Diario");
  assert.match(html, /data-muscle-period="session"[\s\S]*data-muscle-period="week"[\s\S]*data-muscle-period="month"/);
  assert.match(html, /<button class="period-tab active" type="button" data-muscle-period="week"/);

  // El Diario y el mapa comparten la clase .period-tab: si el selector vuelve a
  // ser global, pulsar un periodo del mapa rompe el del Diario y al revés.
  assert.doesNotMatch(app, /querySelectorAll\("\.period-tab"\)/);
  assert.match(app, /querySelectorAll\("\[data-period\]"\)/);
  assert.match(app, /querySelectorAll\("\[data-muscle-period\]"\)/);

  // La escala de color deja dos tramos por debajo de 3:1 contra la superficie:
  // la tabla y la leyenda son el desahogo obligatorio, no un adorno.
  assert.ok(diario.includes('id="muscleMapRows"'), "falta la tabla por zona");
  assert.ok(diario.includes('id="muscleMapLegend"'), "falta la leyenda");
  assert.match(app, /svg\.setAttribute\(\s*"aria-label"/);
  assert.match(app, /No mide activación muscular ni sustituye una valoración profesional/);
});

test("la geometría del mapa la genera el script y cubre las dos vistas", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const generador = fs.readFileSync(new URL("../scripts/generate-muscle-map.mjs", import.meta.url), "utf8");

  // La figura son más de setenta polígonos y la mitad es el espejo de la otra.
  // Si alguien los edita a mano en app.js, los dos lados dejan de coincidir.
  assert.match(generador, /const mirror = \(points\)/);
  assert.match(generador, /const pair = \(points\)/);
  assert.match(app, /const BODY_SILHOUETTE = \[/);
  assert.match(app, /const MUSCLE_SHAPES = \{/);

  const bloque = app.slice(app.indexOf("const MUSCLE_SHAPES"), app.indexOf("const SVG_NS"));
  const regiones = [...bloque.matchAll(/^    ([a-z_]+): \[/gm)].map((match) => match[1]);
  const corte = regiones.indexOf("neck", 1);
  const front = regiones.slice(0, corte);
  const back = regiones.slice(corte);

  ["chest", "quads", "abs", "biceps", "obliques", "serratus"].forEach((region) => {
    assert.ok(front.includes(region), `falta ${region} en la vista frontal`);
  });
  ["traps", "lats", "glutes", "hamstrings", "triceps", "lower_back"].forEach((region) => {
    assert.ok(back.includes(region), `falta ${region} en la vista posterior`);
  });

  // Polígonos, no cápsulas: el estilo facetado se declara como diagrama y no
  // finge ser una lámina anatómica.
  const poligonos = [...bloque.matchAll(/"M[\d.]+ [\d.]+(?:L[\d.]+ [\d.]+)+Z"/g)];
  assert.ok(poligonos.length >= 60, `se esperaban más polígonos, hay ${poligonos.length}`);
});

test("los músculos se guardan en el ejercicio y no se recalculan al pintar", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  // El historial tiene que leerse sin conexión y sin catálogo: si el mapa
  // cruzase contra el catálogo al renderizar, offline se quedaría en blanco.
  assert.match(app, /exercise\.muscles = muscles/);
  assert.match(app, /function backfillExerciseMuscles\(\)/);
  assert.match(app, /backfillExerciseMuscles\(\);/);
  assert.doesNotMatch(app, /computeMuscleVolume\(state, \{[^}]*catalog/);
});

test("el submit de serie conserva el bloqueo aunque renderice otro formulario", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /const pendingSetSubmissions = new Set\(\)/);
  assert.match(app, /pendingSetSubmissions\.has\(key\)/);
  assert.match(app, /const submissionKey = `\$\{session\.id\}:\$\{sessionExercise\.id\}`/);
  assert.match(app, /\}, successMessage\), submissionKey\)/);
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
  assert.match(app, /\["effective", "Efectiva", "Efectiva"\]/);
  assert.match(app, /\["approach", "Aprox\.", "Aproximación"\]/);
  assert.match(app, /\["warmup", "Calent\.", "Calentamiento"\]/);
  assert.match(app, /set-type-options/);
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
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /id="weeklyRingValue"/);
  assert.match(html, /id="dashboardWorkoutExercises"/);
  assert.match(html, /id="labelPhoto"[^>]*capture="environment"/);
  assert.match(html, /id="ajustes" class="panel settings-panel"/);
  assert.match(html, /id="loadDemoDataBtn"/);
  assert.match(html, /id="removeDemoDataBtn"/);
  assert.match(html, /id="settingsPageTitle"/);
  assert.match(html, /data-open-settings="profile"/);
  assert.match(html, /data-open-settings="data"/);
  assert.match(html, /class="tab-liquid-indicator"[^>]*aria-hidden="true"/);
  assert.match(html, /data-tab="diario" aria-current="page"/);
  assert.match(html, /name="appearanceMode" value="system"/);
  assert.match(html, /name="appearanceMode" value="dark"/);
  assert.match(html, /name="appearanceMode" value="light"/);
  assert.doesNotMatch(html, /class="settings-back-row"/);
  assert.match(app, /seedDemoData\(next/);
  assert.match(app, /removeDemoData\(next\)/);
  assert.match(app, /settingsView === "menu"[\s\S]*showTab\("diario"\)/);
  assert.match(app, /cleanupPublishedData\(cleaned\)/);
  assert.match(app, /matchMedia\("\(prefers-color-scheme: dark\)"\)/);
  assert.match(app, /root\.dataset\.theme = resolvedTheme/);
  assert.match(app, /setAttribute\("aria-current", "page"\)/);
  assert.match(css, /\.tab-liquid-indicator/);
  assert.match(css, /data-theme="light"/);
  assert.match(css, /width: min\(430px, calc\(100% - 32px\)\)/);
  assert.match(css, /:root\[data-theme="light"\] \.surface\.color-panel/);
  assert.match(css, /:root\[data-theme="light"\] \.tab\.active[\s\S]*color: var\(--on-accent\)/);
  assert.match(css, /@keyframes nav-liquid-travel/);
  assert.match(css, /@keyframes nav-icon-pop/);
  assert.match(app, /--previous-tab-index/);
  assert.match(app, /--nav-direction/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*\.tab-liquid-indicator/);
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
  assert.match(html, /Crear entrenamiento diferente/);
  assert.doesNotMatch(html, /Añadir día de entrenamiento/);
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
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(app, /setRoutineDayWeekdays\(next, routine\.id, routineDay\.id, updated\)/);
  assert.match(app, /duplicateSet\(next, session\.id, sessionExercise\.id, workoutSet\.id/);
  assert.match(app, /\["history", "Historial"\]/);
  assert.match(app, /\["current", "Actual"\]/);
  assert.match(app, /\["progress", "Progreso"\]/);
  assert.match(app, /createLastReferenceCard/);
  assert.match(app, /reference-list/);
  assert.match(app, /attachSetSwipe/);
  assert.match(app, /set-swipe-duplicate/);
  assert.match(app, /set-swipe-delete/);
  assert.match(app, /RIR máximo permitido: 5/);
  assert.match(app, /set-type-options/);
  assert.match(app, /setInputHints/);
  assert.match(app, /load-stepper/);
  assert.match(app, /stepLoadValue/);
  assert.match(app, /set-field-label/);
  assert.match(app, /dataset\.fullLabel = fullLabel/);
  assert.match(app, /dataset\.label = "Peso"/);
  assert.match(app, /Registra la primera en el formulario inferior/);
  assert.match(app, /Última referencia usada como guía visual/);
  assert.match(app, /chart-legend exercise-chart-legend/);
  assert.match(app, /Todas tus sesiones anteriores, sin modificar el histórico/);
  assert.match(app, /Mejor serie efectiva de cada entrenamiento/);
  assert.doesNotMatch(app, /placeholder: "RIR|placeholder: "Reps|placeholder: "10"|placeholder: "2"/);
  assert.match(css, /\.reference-card/);
  assert.match(css, /\.set-row-content/);
  assert.match(css, /\.load-stepper/);
  assert.match(css, /\.set-form input::placeholder/);
  assert.match(css, /\.set-type-option:has\(input:checked\)/);
  assert.match(css, /\.set-form \{[\s\S]*grid-template-columns: 36px minmax\(70px, 1\.05fr\)/);
  assert.match(css, /\.set-form input,[\s\S]*min-width: 0/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.set-form-headings \{[\s\S]*display: none/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.set-type-field \{[\s\S]*grid-column: 1 \/ -1/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.set-cell::before/);
  assert.match(app, /button\.dataset\.action === "continue"/);
  assert.match(app, /Ver entrenamiento completado/);
});

test("Rutinas adopta tarjetas tipo workout moderno con grupos musculares y menús compactos", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /id="routineSpotlight"/);
  assert.match(app, /function routineTheme/);
  assert.match(app, /createMuscleIcon/);
  assert.match(app, /group: "lower"/);
  assert.match(app, /group: "push"/);
  assert.match(app, /group: "pull"/);
  assert.match(app, /routineSpotlight/);
  assert.match(css, /\.routine-spotlight/);
  assert.match(css, /\.routine-theme-lower/);
  assert.match(css, /\.muscle-icon/);
  assert.match(css, /\.exercise-exception-menu[\s\S]*max-width: min\(230px, 100%\)/);
  assert.match(css, /\.set-form-number[\s\S]*width: clamp/);
});

test("Rutinas separa calendario y biblioteca con próximos entrenos coloreados", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /data-routine-planner-view="calendar"/);
  assert.match(html, /data-routine-planner-view="library"/);
  assert.match(html, /id="routineCalendarView"/);
  assert.match(html, /id="routineLibraryView"/);
  assert.match(html, /id="routineCalendarGrid"/);
  assert.match(html, /id="upcomingWorkoutList"/);
  assert.match(html, /id="plannedWorkoutPanel"/);
  assert.match(app, /let routinePlannerView = "calendar"/);
  assert.match(app, /function renderRoutineCalendar/);
  assert.match(app, /function upcomingScheduledWorkouts/);
  assert.match(app, /function openPlannedWorkout/);
  assert.match(app, /routinePlannerView = button\.dataset\.routinePlannerView/);
  assert.match(css, /\.routine-planner-tabs/);
  assert.match(css, /\.routine-calendar-grid/);
  assert.match(css, /\.upcoming-workout-card/);
  assert.match(css, /\.planned-workout-panel/);
  assert.match(css, /\.status-dot-completed/);
});

test("Calendario y sesión activa tienen estados visuales temporales y duración total", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /id="activeSessionElapsed"/);
  assert.match(html, /planned-open-button/);
  assert.match(html, /assets\/icons\.svg#calendar/);
  assert.match(app, /const noticeTimers = new Map\(\)/);
  assert.match(app, /window\.setTimeout\(\(\) => \{/);
  assert.match(app, /function formatWorkoutDuration/);
  assert.match(app, /function sessionElapsedSeconds/);
  assert.match(app, /session\.durationSeconds/);
  assert.match(app, /routine-theme-\$\{theme\.group\}/);
  assert.match(css, /\.routine-calendar[\s\S]*border-color: var\(--canvas\)/);
  assert.match(css, /\.status-dot-planned[\s\S]*var\(--routine-accent, var\(--accent\)\)/);
  assert.match(css, /\.planned-open-button[\s\S]*width: min\(100%, 360px\)/);
  assert.match(css, /\.session-elapsed/);
  assert.match(css, /@keyframes toast-in/);
});

test("rutinas, calendario y paneles usan color contextual sin sombras decorativas", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /name="routineAccentColor"/);
  assert.match(html, /id="selectedRoutineColorEditor"/);
  assert.match(html, /planned-extra-button/);
  assert.match(app, /function routineAccentName/);
  assert.match(app, /setRoutineAccentColor/);
  assert.match(app, /sessionsInDiaryPeriod/);
  assert.match(css, /\.status-dot \{[\s\S]*box-shadow: none/);
  assert.match(css, /\.routine-accent-red/);
  assert.match(css, /\.routine-accent-blue/);
  assert.match(css, /\.color-panel-orange/);
  assert.match(css, /\.color-panel-violet/);
  assert.match(css, /\.planned-extra-button/);
});

test("la navegación y los colores se mantienen minimalistas y coherentes entre pantallas", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /minimal-icon-button bare-arrow-button/);
  assert.match(html, /planned-move-button[\s\S]*<rect[\s\S]*<path/);
  assert.match(html, /<details id="selectedRoutineColorEditor"/);
  assert.doesNotMatch(html, /<fieldset id="selectedRoutineColorPicker"/);
  assert.match(app, /function routineForSession/);
  assert.match(app, /applyRoutineVisualClasses\(\$\("activeSessionPanel"\), activeRoutine\)/);
  assert.match(app, /createElement\("strong", "", routine\.name\)/);
  assert.doesNotMatch(app, /createElement\("strong", "", routineDay\.name \|\| routine\.name\)/);
  assert.match(app, /createDayDetailSection\("Nutrición registrada", "nutrition"\)/);
  assert.match(app, /createDayDetailSection\("Entrenamiento", "training"\)/);
  assert.match(css, /\.bare-arrow-button/);
  assert.match(css, /\.planned-skip-button[\s\S]*border-radius: 999px/);
  assert.match(css, /\.day-detail-section-nutrition/);
  assert.match(css, /\.day-detail-section-training/);
});

test("cardio se integra en rutinas, sesión activa y diario sin usar series", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /name="routineDayType" value="strength"/);
  assert.match(html, /name="routineDayType" value="cardio"/);
  assert.match(html, /id="cardioSessionForm"/);
  assert.match(html, /id="cardioDistanceKm"/);
  assert.match(html, /id="cardioDuration"/);
  assert.match(html, /id="cardioPacePreview"/);
  assert.match(html, /id="cardioActivityPicker"/);
  assert.match(html, /id="cardioMetricFields"/);
  assert.match(html, /id="cardioElevationGainM"/);
  assert.match(html, /id="cardioInclinePercent"/);
  assert.match(html, /id="cardioPoolLengthM"/);
  assert.match(html, /id="cardioResistanceLevel"/);
  assert.match(html, /id="cardioAverageHeartRateBpm"/);
  assert.match(app, /addCardioToSession/);
  assert.match(app, /archiveRoutine/);
  assert.match(app, /function parseDurationInput/);
  assert.match(app, /function formatPace/);
  assert.match(app, /const cardioActivityCatalog/);
  assert.match(app, /function renderCardioActivityPicker/);
  assert.match(app, /function syncCardioMetricFields/);
  assert.match(app, /paceSecondsPer100m/);
  assert.match(app, /averageSpeedKmh/);
  assert.match(app, /routineDayType\(suggested\.routineDay\) === "cardio"/);
  assert.match(app, /document\.querySelector\("\.exercise-picker"\)\.hidden = isCardioSession/);
  assert.match(app, /Las métricas derivadas se calcularon automáticamente/);
  assert.match(app, /function renderCardioHistory/);
  assert.match(css, /\.cardio-session-card/);
  assert.match(css, /\.cardio-activity-picker/);
  assert.match(css, /\.cardio-derived-grid/);
  assert.match(app, /icon: "cardio-run"/);
  assert.match(html, /assets\/icons\.svg/);
  assert.match(css, /\.routine-theme-cardio/);
});

test("Biblioteca permite archivar una rutina con gesto hacia la izquierda", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(app, /function attachRoutineSwipe/);
  assert.match(app, /archiveRoutine\(next, routine\.id\)/);
  assert.match(app, /La rutina dejará de aparecer en el plan/);
  assert.match(css, /\.routine-swipe-row/);
  assert.match(css, /\.routine-swipe-delete/);
  assert.match(css, /touch-action: pan-y/);
});

test("guardar una serie arranca el descanso, corregirla no", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /function startRestAfterSet\(exerciseId\)/);
  // Solo en series nuevas: corregir un número no es acabar de entrenar.
  assert.match(app, /if \(!editingSetId && autoRestTimerEnabled\(\)\) startRestAfterSet\(sessionExercise\.id\);/);
  // Y después de guardar, no antes: si fallara la validación no debe arrancar.
  const submit = app.slice(app.indexOf("const saved = runOnce(submit"), app.indexOf("form.startEditing"));
  assert.ok(
    submit.indexOf("const saved") < submit.indexOf("startRestAfterSet"),
    "el descanso no puede arrancar antes de saber si la serie se guardó",
  );
  assert.match(app, /Descanso de \$\{formatTimer\(restSeconds\)\} en marcha/);

  // El descanso por defecto de Ajustes existía pero el temporizador lo ignoraba.
  assert.match(app, /state\.owner\.preferences\?\.defaultRestSeconds/);
  assert.doesNotMatch(app, /duration: 60, remaining: 60/);

  // Es un ajuste, no una imposición: Brenzo lo ofrece como interruptor y aquí
  // también, encendido por defecto.
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="autoRestTimer" type="checkbox" role="switch"/);
  assert.match(app, /autoRestTimer: true,/);
  assert.match(app, /autoRestTimer: \$\("autoRestTimer"\)\.checked/);
});
